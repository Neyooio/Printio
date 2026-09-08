mod commands;
mod database;
mod dns;
mod firewall;
mod http_server;
mod session;
mod storage;
mod upload;

use commands::PrintioState;
use database::Database;
use dns::DnsInterceptor;
use session::SessionManager;
use std::net::Ipv4Addr;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::RwLock;

/// Default gateway IP (Windows Mobile Hotspot).
const DEFAULT_GATEWAY_IP: &str = "192.168.137.1";

/// Default storage cap: 4 GB.
const DEFAULT_STORAGE_CAP: u64 = 4 * 1024 * 1024 * 1024;

/// Session timeout: 30 minutes.
const SESSION_TIMEOUT_MINUTES: i64 = 30;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Resolve storage directory
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            let storage_dir = app_data_dir.join("printio_data");
            std::fs::create_dir_all(&storage_dir).expect("Failed to create storage directory");
            std::fs::create_dir_all(storage_dir.join("temp"))
                .expect("Failed to create temp directory");
            std::fs::create_dir_all(storage_dir.join("sessions"))
                .expect("Failed to create sessions directory");

            let db_path = app_data_dir.join("printio.db");

            // Resolve portal directory (bundled in app resources)
            let portal_dir = app_handle
                .path()
                .resource_dir()
                .map(|d| d.join("portal"))
                .unwrap_or_else(|_| {
                    // Fallback for dev mode: look in project root
                    PathBuf::from("portal")
                });

            // Read gateway IP from config or use default
            let gateway_ip = std::env::var("PRINTIO_GATEWAY_IP")
                .unwrap_or_else(|_| DEFAULT_GATEWAY_IP.to_string());

            let storage_cap = Arc::new(RwLock::new(
                std::env::var("PRINTIO_STORAGE_CAP")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(DEFAULT_STORAGE_CAP),
            ));

            let gateway_ip_arc = Arc::new(gateway_ip.clone());

            // Shutdown signal broadcast
            let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

            // Clone values for the async setup task
            let storage_dir_clone = storage_dir.clone();
            let storage_cap_clone = storage_cap.clone();
            let gateway_ip_clone = gateway_ip_arc.clone();
            let shutdown_rx_dns = shutdown_rx.clone();
            let shutdown_rx_http = shutdown_rx.clone();
            let shutdown_rx_session = shutdown_rx.clone();

            // Spawn the async initialization on the Tokio runtime
            tauri::async_runtime::spawn(async move {
                // Initialize database
                let db = match Database::open(&db_path).await {
                    Ok(db) => {
                        log::info!("Database initialized at {}", db_path.display());
                        db
                    }
                    Err(e) => {
                        log::error!("Failed to initialize database: {}", e);
                        return;
                    }
                };

                // Initialize session manager
                let session_mgr = SessionManager::new(db.clone(), SESSION_TIMEOUT_MINUTES);

                // Start session expiration background task
                let session_mgr_arc = Arc::new(session_mgr.clone());
                session_mgr_arc.spawn_expiration_task(shutdown_rx_session);

                // Build upload state
                let upload_state = upload::UploadState {
                    db: db.clone(),
                    session_mgr: session_mgr.clone(),
                    storage_dir: storage_dir_clone.clone(),
                    storage_cap: storage_cap_clone,
                    gateway_ip: gateway_ip_clone.clone(),
                };

                // Build HTTP server state
                let http_state = http_server::AppState {
                    upload_state,
                    portal_dir: portal_dir.clone(),
                    gateway_ip: gateway_ip_clone.as_ref().clone(),
                };

                // Start DNS interceptor
                let gateway_ipv4: Ipv4Addr = gateway_ip_clone
                    .parse()
                    .unwrap_or(Ipv4Addr::new(192, 168, 137, 1));

                let dns = DnsInterceptor::new(gateway_ipv4);
                tokio::spawn(async move {
                    if let Err(e) = dns.run(shutdown_rx_dns).await {
                        log::error!("DNS server error: {}", e);
                    }
                });

                // Start HTTP server
                tokio::spawn(async move {
                    if let Err(e) =
                        http_server::start_http_server(http_state, shutdown_rx_http).await
                    {
                        log::error!("HTTP server error: {}", e);
                    }
                });

                log::info!("Printio backend services started successfully");
                log::info!("  Gateway IP: {}", gateway_ip_clone);
                log::info!("  Portal dir: {}", portal_dir.display());
                log::info!("  Storage dir: {}", storage_dir_clone.display());
            });

            // Store managed state for Tauri commands
            // We need a separate DB instance for commands since the async one
            // is moved into the spawn block. Use a blocking init for the state.
            let db_path_cmd = app_data_dir.join("printio.db");
            let storage_dir_cmd = storage_dir.clone();

            tauri::async_runtime::spawn(async move {
                match Database::open(&db_path_cmd).await {
                    Ok(db) => {
                        let state = PrintioState {
                            db,
                            storage_dir: storage_dir_cmd,
                            storage_cap,
                            gateway_ip: gateway_ip_arc,
                            shutdown_tx,
                        };
                        app_handle.manage(state);
                        log::info!("Tauri managed state initialized");
                    }
                    Err(e) => {
                        log::error!("Failed to initialize command state DB: {}", e);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_sessions,
            commands::get_session_files,
            commands::mark_job_complete,
            commands::delete_session,
            commands::get_storage_stats,
            commands::get_storage_cap,
            commands::set_storage_cap,
            commands::open_in_word,
            commands::open_in_default,
            commands::open_in_explorer,
            commands::get_server_status,
            commands::get_gateway_ip,
            commands::set_gateway_ip,
            commands::configure_firewall,
            commands::check_firewall,
            commands::remove_firewall,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Printio");
}
