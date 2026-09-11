use axum::{
    body::Body,
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::Json,
    routing::{get, post},
    Router,
};
use futures_util::StreamExt;
use http_body_util::BodyStream;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::io::{AsyncSeekExt, AsyncWriteExt, BufWriter};
use tokio::sync::RwLock;

use crate::database::Database;
use crate::session::SessionManager;
use crate::storage;

/// Shared state for the upload engine.
#[derive(Clone)]
#[allow(dead_code)]
pub struct UploadState {
    pub db: Database,
    pub session_mgr: SessionManager,
    pub storage_dir: PathBuf,
    /// Configurable storage cap in bytes (default 4 GB).
    pub storage_cap: Arc<RwLock<u64>>,
    /// Gateway IP for CORS and redirect logic.
    pub gateway_ip: Arc<String>,
}

/// Response for upload status queries.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadStatusResponse {
    pub file_id: String,
    pub uploaded_bytes: u64,
    pub file_size: u64,
    pub status: String,
}

/// Response after initializing an upload.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadInitResponse {
    pub file_id: String,
    pub uploaded_bytes: u64,
    pub status: String,
}

/// Query params for upload status.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusQuery {
    pub file_id: String,
}

/// Error response body.
#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

fn error_json(status: StatusCode, msg: &str) -> (StatusCode, Json<ErrorResponse>) {
    (
        status,
        Json(ErrorResponse {
            error: msg.to_string(),
        }),
    )
}

/// Extract client IP from headers or connection info.
/// Falls back to "unknown" if not determinable.
fn extract_client_ip(headers: &HeaderMap) -> String {
    // Check X-Forwarded-For first (shouldn't exist in our setup, but defensive)
    if let Some(xff) = headers.get("x-forwarded-for") {
        if let Ok(ip) = xff.to_str() {
            return ip.split(',').next().unwrap_or("unknown").trim().to_string();
        }
    }
    // Check X-Real-IP
    if let Some(xri) = headers.get("x-real-ip") {
        if let Ok(ip) = xri.to_str() {
            return ip.trim().to_string();
        }
    }
    // Check X-Customer-Session (our custom header from the portal JS)
    if let Some(session) = headers.get("x-customer-session") {
        if let Ok(s) = session.to_str() {
            return s.trim().to_string();
        }
    }
    "unknown".to_string()
}

/// Build the upload API router.
pub fn upload_router() -> Router<UploadState> {
    Router::new()
        .route("/api/upload-status", get(handle_upload_status))
        .route("/api/upload-init", post(handle_upload_init))
        .route("/api/upload-chunk", post(handle_upload_chunk))
        .route("/api/upload-complete", post(handle_upload_complete))
        .route("/api/session-files", get(handle_session_files))
}

/// GET /api/upload-status?fileId=<id>
/// Returns the committed byte offset so the client can resume.
async fn handle_upload_status(
    State(state): State<UploadState>,
    Query(query): Query<StatusQuery>,
    _headers: HeaderMap,
) -> Result<Json<UploadStatusResponse>, (StatusCode, Json<ErrorResponse>)> {
    let file_id = &query.file_id;

    let upload = state
        .db
        .find_upload_by_file_id(file_id)
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    match upload {
        Some(u) => Ok(Json(UploadStatusResponse {
            file_id: u.file_id,
            uploaded_bytes: u.uploaded_bytes,
            file_size: u.file_size,
            status: u.status,
        })),
        None => {
            // File not found — tell client to start from zero
            Ok(Json(UploadStatusResponse {
                file_id: file_id.clone(),
                uploaded_bytes: 0,
                file_size: 0,
                status: "not_found".to_string(),
            }))
        }
    }
}

/// POST /api/upload-init
/// Initialize a new upload or resume an existing one.
/// Headers: X-File-Id, X-File-Name, X-Total-Size, X-File-Type, X-Fingerprint
async fn handle_upload_init(
    State(state): State<UploadState>,
    headers: HeaderMap,
) -> Result<Json<UploadInitResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Extract required headers
    let file_id = get_header(&headers, "x-file-id")?;
    let file_name = get_header(&headers, "x-file-name")?;
    let total_size: u64 = get_header(&headers, "x-total-size")?
        .parse()
        .map_err(|_| error_json(StatusCode::BAD_REQUEST, "Invalid X-Total-Size"))?;
    let fingerprint = get_header(&headers, "x-fingerprint")?;
    let client_ip = extract_client_ip(&headers);

    // Validate file extension
    let ext = storage::validate_extension(&file_name)
        .map_err(|e| error_json(StatusCode::BAD_REQUEST, &e.to_string()))?;

    // Sanitize filename
    let safe_name = storage::sanitize_filename(&file_name);

    // Check storage cap
    let current_usage = state
        .db
        .get_storage_usage()
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let cap = *state.storage_cap.read().await;
    if current_usage.total_used_bytes + total_size > cap {
        return Err(error_json(
            StatusCode::INSUFFICIENT_STORAGE,
            &format!(
                "Storage limit reached ({:.1} GB / {:.1} GB). Cannot accept new files.",
                current_usage.total_used_bytes as f64 / 1_073_741_824.0,
                cap as f64 / 1_073_741_824.0,
            ),
        ));
    }

    // Get or create session for this client
    let session_id = state
        .session_mgr
        .get_or_create_session(&client_ip)
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    // Check if this fingerprint already has an upload in this session
    let existing = state
        .db
        .find_upload_by_fingerprint(&session_id, &fingerprint)
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    if let Some(existing) = existing {
        if existing.status == "complete" {
            return Ok(Json(UploadInitResponse {
                file_id: existing.file_id,
                uploaded_bytes: existing.file_size,
                status: "complete".to_string(),
            }));
        }

        // Resume: check how much we have on disk
        let temp_path = storage::build_temp_path(&state.storage_dir, &existing.file_id);
        let on_disk = if temp_path.exists() {
            tokio::fs::metadata(&temp_path)
                .await
                .map(|m| m.len())
                .unwrap_or(0)
        } else {
            0
        };

        // Sync DB with actual disk state
        if on_disk != existing.uploaded_bytes {
            let _ = state
                .db
                .update_upload_progress(&existing.file_id, on_disk)
                .await;
        }

        return Ok(Json(UploadInitResponse {
            file_id: existing.file_id,
            uploaded_bytes: on_disk,
            status: "uploading".to_string(),
        }));
    }

    // Create new upload record
    state
        .db
        .create_upload(
            &session_id,
            &file_id,
            &file_name,
            &safe_name,
            &ext,
            total_size,
            &fingerprint,
        )
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    // Pre-allocate temp file with set_len for contiguous disk reservation
    let temp_path = storage::build_temp_path(&state.storage_dir, &file_id);
    if let Some(parent) = temp_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
    }

    let file = tokio::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .open(&temp_path)
        .await
        .map_err(|e| {
            error_json(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("Failed to create temp file: {}", e),
            )
        })?;

    // Pre-allocate disk space to avoid fragmentation
    file.set_len(total_size).await.map_err(|e| {
        error_json(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Failed to pre-allocate disk space: {}", e),
        )
    })?;

    log::info!(
        "Upload initialized: file_id={}, name={}, size={}, session={}",
        file_id,
        safe_name,
        total_size,
        session_id
    );

    Ok(Json(UploadInitResponse {
        file_id,
        uploaded_bytes: 0,
        status: "uploading".to_string(),
    }))
}

/// POST /api/upload-chunk
/// Streaming intake: reads body bytes directly to disk without full buffering.
/// Headers: X-File-Id, X-Start-Byte, X-Total-Size
async fn handle_upload_chunk(
    State(state): State<UploadState>,
    headers: HeaderMap,
    body: Body,
) -> Result<Json<UploadStatusResponse>, (StatusCode, Json<ErrorResponse>)> {
    let file_id = get_header(&headers, "x-file-id")?;
    let start_byte: u64 = get_header(&headers, "x-start-byte")?
        .parse()
        .map_err(|_| error_json(StatusCode::BAD_REQUEST, "Invalid X-Start-Byte"))?;
    let total_size: u64 = get_header(&headers, "x-total-size")?
        .parse()
        .map_err(|_| error_json(StatusCode::BAD_REQUEST, "Invalid X-Total-Size"))?;

    // Verify the upload exists
    let upload = state
        .db
        .find_upload_by_file_id(&file_id)
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| error_json(StatusCode::NOT_FOUND, "Upload not found. Call /api/upload-init first."))?;

    if upload.status == "complete" {
        return Ok(Json(UploadStatusResponse {
            file_id,
            uploaded_bytes: upload.file_size,
            file_size: upload.file_size,
            status: "complete".to_string(),
        }));
    }

    // Open temp file and seek to the start byte
    let temp_path = storage::build_temp_path(&state.storage_dir, &file_id);

    let file = tokio::fs::OpenOptions::new()
        .write(true)
        .open(&temp_path)
        .await
        .map_err(|e| {
            error_json(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("Failed to open temp file: {}", e),
            )
        })?;

    let mut file = file;
    file.seek(std::io::SeekFrom::Start(start_byte))
        .await
        .map_err(|e| {
            error_json(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("Failed to seek: {}", e),
            )
        })?;

    // Wrap in BufWriter with 64 KB buffer for efficient I/O
    let mut writer = BufWriter::with_capacity(65536, file);

    // Stream body directly to disk without buffering the whole chunk in memory
    let mut bytes_written: u64 = 0;
    let mut body_stream = BodyStream::new(body);

    while let Some(frame_result) = body_stream.next().await {
        let frame = frame_result.map_err(|e| {
            error_json(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("Body stream error: {}", e),
            )
        })?;

        if let Some(data) = frame.data_ref() {
            writer.write_all(data).await.map_err(|e| {
                error_json(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    &format!("Disk write error: {}", e),
                )
            })?;
            bytes_written += data.len() as u64;
        }
    }

    // Flush the buffered writer to ensure all data hits disk
    writer.flush().await.map_err(|e| {
        error_json(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Flush error: {}", e),
        )
    })?;

    let new_offset = start_byte + bytes_written;

    // Atomically commit the byte offset to SQLite
    state
        .db
        .update_upload_progress(&file_id, new_offset)
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    Ok(Json(UploadStatusResponse {
        file_id,
        uploaded_bytes: new_offset,
        file_size: total_size,
        status: if new_offset >= total_size {
            "ready_to_finalize".to_string()
        } else {
            "uploading".to_string()
        },
    }))
}

/// POST /api/upload-complete
/// Finalize an upload: verify size, validate magic bytes, move to final path.
/// Headers: X-File-Id
async fn handle_upload_complete(
    State(state): State<UploadState>,
    headers: HeaderMap,
) -> Result<Json<UploadStatusResponse>, (StatusCode, Json<ErrorResponse>)> {
    let file_id = get_header(&headers, "x-file-id")?;

    let upload = state
        .db
        .find_upload_by_file_id(&file_id)
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| error_json(StatusCode::NOT_FOUND, "Upload not found"))?;

    if upload.status == "complete" {
        return Ok(Json(UploadStatusResponse {
            file_id,
            uploaded_bytes: upload.file_size,
            file_size: upload.file_size,
            status: "complete".to_string(),
        }));
    }

    let temp_path = storage::build_temp_path(&state.storage_dir, &file_id);

    // Verify file size matches
    let _actual_size = tokio::fs::metadata(&temp_path)
        .await
        .map_err(|e| {
            error_json(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("Cannot stat temp file: {}", e),
            )
        })?
        .len();

    // The file was pre-allocated, so actual_size == file_size always.
    // Check that uploaded_bytes matches expected total.
    if upload.uploaded_bytes < upload.file_size {
        return Err(error_json(
            StatusCode::BAD_REQUEST,
            &format!(
                "Upload incomplete: {} / {} bytes received",
                upload.uploaded_bytes, upload.file_size
            ),
        ));
    }

    // Truncate to actual data size (remove pre-allocation padding if any)
    let file = tokio::fs::OpenOptions::new()
        .write(true)
        .open(&temp_path)
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
    file.set_len(upload.file_size).await.map_err(|e| {
        error_json(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Failed to truncate: {}", e),
        )
    })?;
    drop(file); // Close the handle before moving

    // Validate magic bytes
    let valid = storage::verify_magic_bytes(&temp_path, &upload.file_type)
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    if !valid {
        // Delete the suspicious file and mark as failed
        let _ = tokio::fs::remove_file(&temp_path).await;
        let _ = state.db.fail_upload(&file_id).await;
        return Err(error_json(
            StatusCode::BAD_REQUEST,
            "File content does not match declared type. Upload rejected.",
        ));
    }

    // Build final path and move file
    let session_id = state
        .db
        .get_session_id_for_upload(&file_id)
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?
        .ok_or_else(|| error_json(StatusCode::INTERNAL_SERVER_ERROR, "Session not found for upload"))?;

    let final_path = storage::build_final_path(&state.storage_dir, &session_id, &upload.file_type);

    // Ensure destination directory exists
    if let Some(parent) = final_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
    }

    // Move temp to final
    tokio::fs::rename(&temp_path, &final_path)
        .await
        .map_err(|e| {
            error_json(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("Failed to move file to final location: {}", e),
            )
        })?;

    // Update DB
    state
        .db
        .complete_upload(&file_id, &final_path.to_string_lossy())
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    log::info!(
        "Upload complete: file_id={}, path={}",
        file_id,
        final_path.display()
    );

    Ok(Json(UploadStatusResponse {
        file_id,
        uploaded_bytes: upload.file_size,
        file_size: upload.file_size,
        status: "complete".to_string(),
    }))
}

/// GET /api/session-files
/// Returns files for the calling client's session.
async fn handle_session_files(
    State(state): State<UploadState>,
    headers: HeaderMap,
) -> Result<Json<Vec<crate::database::UploadInfo>>, (StatusCode, Json<ErrorResponse>)> {
    let client_ip = extract_client_ip(&headers);
    let session_id = state
        .session_mgr
        .get_or_create_session(&client_ip)
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    let files = state
        .db
        .list_session_uploads(&session_id)
        .await
        .map_err(|e| error_json(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;

    Ok(Json(files))
}

/// Helper: extract a required header value.
fn get_header(headers: &HeaderMap, name: &str) -> Result<String, (StatusCode, Json<ErrorResponse>)> {
    headers
        .get(name)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| {
            error_json(
                StatusCode::BAD_REQUEST,
                &format!("Missing required header: {}", name),
            )
        })
}
