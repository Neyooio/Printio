use crate::database::{Database, SessionInfo, StorageStats, UploadInfo};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

/// Managed state available to all Tauri commands.
pub struct PrintioState {
    pub db: Database,
    pub storage_dir: PathBuf,
    pub storage_cap: Arc<RwLock<u64>>,
    pub gateway_ip: Arc<String>,
    pub shutdown_tx: tokio::sync::watch::Sender<bool>,
}

// ───────────────── Session Commands ─────────────────

#[tauri::command]
pub async fn get_sessions(state: State<'_, PrintioState>) -> Result<Vec<SessionInfo>, String> {
    state
        .db
        .list_sessions()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_session_files(
    state: State<'_, PrintioState>,
    session_id: String,
) -> Result<Vec<UploadInfo>, String> {
    state
        .db
        .list_session_uploads(&session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mark_job_complete(
    state: State<'_, PrintioState>,
    session_id: String,
) -> Result<(), String> {
    state
        .db
        .complete_session(&session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_session(
    state: State<'_, PrintioState>,
    session_id: String,
) -> Result<(), String> {
    // Get file paths before deleting records
    let paths = state
        .db
        .delete_session(&session_id)
        .await
        .map_err(|e| e.to_string())?;

    // Delete files from disk
    for path in paths {
        let _ = tokio::fs::remove_file(&path).await;
    }

    Ok(())
}

// ───────────────── Storage Commands ─────────────────

#[tauri::command]
pub async fn get_storage_stats(state: State<'_, PrintioState>) -> Result<StorageStats, String> {
    state
        .db
        .get_storage_usage()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_storage_cap(state: State<'_, PrintioState>) -> Result<u64, String> {
    Ok(*state.storage_cap.read().await)
}

#[tauri::command]
pub async fn set_storage_cap(
    state: State<'_, PrintioState>,
    cap_bytes: u64,
) -> Result<(), String> {
    *state.storage_cap.write().await = cap_bytes;
    Ok(())
}

// ───────────────── Native App Launch Commands ─────────────────

#[tauri::command]
pub async fn open_in_word(file_path: String) -> Result<(), String> {
    // Try common Word paths
    let word_paths = [
        r"C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE",
        r"C:\Program Files (x86)\Microsoft Office\root\Office16\WINWORD.EXE",
        r"C:\Program Files\Microsoft Office\root\Office15\WINWORD.EXE",
    ];

    for word_path in &word_paths {
        if std::path::Path::new(word_path).exists() {
            std::process::Command::new(word_path)
                .arg(&file_path)
                .spawn()
                .map_err(|e| format!("Failed to launch Word: {}", e))?;
            return Ok(());
        }
    }

    // Fallback: try just "winword" on PATH
    match std::process::Command::new("cmd")
        .args(["/c", "start", "winword", &file_path])
        .spawn()
    {
        Ok(_) => Ok(()),
        Err(_) => {
            // Final fallback: open with default handler
            open_in_default(file_path).await
        }
    }
}

#[tauri::command]
pub async fn open_in_default(file_path: String) -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/c", "start", "", &file_path])
        .spawn()
        .map_err(|e| format!("Failed to open file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn open_in_explorer(file_path: String) -> Result<(), String> {
    std::process::Command::new("explorer.exe")
        .args(["/select,", &file_path])
        .spawn()
        .map_err(|e| format!("Failed to open Explorer: {}", e))?;
    Ok(())
}

// ───────────────── Server Control Commands ─────────────────

#[tauri::command]
pub async fn get_server_status() -> Result<serde_json::Value, String> {
    // Check if ports are in use (basic check)
    let dns_bound = tokio::net::UdpSocket::bind("0.0.0.0:53").await.is_err();
    let http_bound = tokio::net::TcpListener::bind("0.0.0.0:80").await.is_err();

    Ok(serde_json::json!({
        "dns_running": dns_bound,
        "http_running": http_bound,
    }))
}

#[tauri::command]
pub async fn get_gateway_ip(state: State<'_, PrintioState>) -> Result<String, String> {
    Ok(state.gateway_ip.as_ref().clone())
}

#[tauri::command]
pub async fn set_gateway_ip(
    state: State<'_, PrintioState>,
    _ip: String,
) -> Result<(), String> {
    // Note: Changing gateway IP at runtime would require restarting servers.
    // For now, return an error indicating a restart is needed.
    Err("Changing gateway IP requires restarting Printio".to_string())
}

// ───────────────── Firewall Commands ─────────────────

#[tauri::command]
pub async fn configure_firewall() -> Result<String, String> {
    tokio::task::spawn_blocking(|| crate::firewall::configure_firewall_rules())
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_firewall() -> Result<bool, String> {
    tokio::task::spawn_blocking(|| crate::firewall::check_firewall_rules())
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_firewall() -> Result<String, String> {
    tokio::task::spawn_blocking(|| crate::firewall::remove_firewall_rules())
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}
