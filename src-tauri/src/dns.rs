use anyhow::Result;
use std::net::{Ipv4Addr, SocketAddr};
use tokio::net::UdpSocket;
use tokio::sync::watch;

/// Minimal DNS server that resolves ALL queries to the gateway IP.
/// Implements just enough of RFC 1035 to parse QNAME and reply with an A record.
pub struct DnsInterceptor {
    gateway_ip: Ipv4Addr,
    bind_addr: SocketAddr,
}

impl DnsInterceptor {
    pub fn new(gateway_ip: Ipv4Addr) -> Self {
        Self {
            gateway_ip,
            bind_addr: SocketAddr::from(([0, 0, 0, 0], 53)),
        }
    }

    /// Start the DNS interceptor. Runs until `shutdown` signal fires.
    pub async fn run(&self, mut shutdown: watch::Receiver<bool>) -> Result<()> {
        let socket = UdpSocket::bind(self.bind_addr).await.map_err(|e| {
            log::error!(
                "Failed to bind UDP :53 — run as admin or configure firewall. Error: {}",
                e
            );
            e
        })?;

        log::info!("DNS interceptor listening on {}", self.bind_addr);

        let mut buf = vec![0u8; 512]; // DNS packets are typically < 512 bytes

        loop {
            tokio::select! {
                result = socket.recv_from(&mut buf) => {
                    match result {
                        Ok((len, src)) => {
                            if len < 12 {
                                continue; // Too short to be a valid DNS packet
                            }

                            let query = &buf[..len];
                            match self.build_response(query) {
                                Some(response) => {
                                    if let Err(e) = socket.send_to(&response, src).await {
                                        log::warn!("Failed to send DNS response to {}: {}", src, e);
                                    }
                                }
                                None => {
                                    log::debug!("Malformed DNS query from {}", src);
                                }
                            }
                        }
                        Err(e) => {
                            log::warn!("DNS recv error: {}", e);
                        }
                    }
                }
                _ = shutdown.changed() => {
                    log::info!("DNS interceptor shutting down");
                    break;
                }
            }
        }

        Ok(())
    }

    /// Build a DNS response that answers with the gateway IP.
    /// Minimal RFC 1035 implementation:
    /// - Copy Transaction ID from query
    /// - Set QR=1 (response), OPCODE=0 (standard), AA=1 (authoritative), RD=1, RA=1
    /// - Copy the question section
    /// - Append a single A record answer pointing to gateway_ip
    fn build_response(&self, query: &[u8]) -> Option<Vec<u8>> {
        if query.len() < 12 {
            return None;
        }

        // Extract transaction ID (first 2 bytes)
        let tx_id = &query[0..2];

        // Parse question count
        let qdcount = u16::from_be_bytes([query[4], query[5]]);
        if qdcount == 0 {
            return None;
        }

        // Find the end of the question section
        // Question format: QNAME (variable) + QTYPE (2) + QCLASS (2)
        let mut pos = 12; // Start of question section
        let qname_start = pos;

        // Skip QNAME labels
        while pos < query.len() {
            let label_len = query[pos] as usize;
            if label_len == 0 {
                pos += 1; // Skip the null terminator
                break;
            }
            pos += 1 + label_len; // Skip length byte + label
        }

        if pos + 4 > query.len() {
            return None; // Not enough bytes for QTYPE + QCLASS
        }

        let question_end = pos + 4; // QTYPE (2) + QCLASS (2)

        // Log the queried domain for debugging
        if log::log_enabled!(log::Level::Debug) {
            let domain = self.parse_qname(query, qname_start);
            log::debug!("DNS query: {} → {}", domain, self.gateway_ip);
        }

        // Build response packet
        let mut resp = Vec::with_capacity(question_end + 16);

        // Header (12 bytes)
        resp.extend_from_slice(tx_id); // Transaction ID
        resp.extend_from_slice(&[
            0x81, 0x80, // Flags: QR=1, OPCODE=0, AA=1, TC=0, RD=1, RA=1, RCODE=0
            0x00, 0x01, // QDCOUNT = 1
            0x00, 0x01, // ANCOUNT = 1
            0x00, 0x00, // NSCOUNT = 0
            0x00, 0x00, // ARCOUNT = 0
        ]);

        // Question section (copy from query)
        resp.extend_from_slice(&query[12..question_end]);

        // Answer section — A record
        // Name: pointer to question QNAME (0xC00C = offset 12)
        resp.extend_from_slice(&[0xC0, 0x0C]);
        // TYPE: A (1)
        resp.extend_from_slice(&[0x00, 0x01]);
        // CLASS: IN (1)
        resp.extend_from_slice(&[0x00, 0x01]);
        // TTL: 60 seconds
        resp.extend_from_slice(&[0x00, 0x00, 0x00, 0x3C]);
        // RDLENGTH: 4 (IPv4)
        resp.extend_from_slice(&[0x00, 0x04]);
        // RDATA: Gateway IP
        resp.extend_from_slice(&self.gateway_ip.octets());

        Some(resp)
    }

    /// Parse a QNAME from wire format into a dotted string (for logging).
    fn parse_qname(&self, data: &[u8], start: usize) -> String {
        let mut labels = Vec::new();
        let mut pos = start;

        while pos < data.len() {
            let len = data[pos] as usize;
            if len == 0 {
                break;
            }
            pos += 1;
            if pos + len > data.len() {
                break;
            }
            if let Ok(label) = std::str::from_utf8(&data[pos..pos + len]) {
                labels.push(label.to_string());
            }
            pos += len;
        }

        labels.join(".")
    }
}
