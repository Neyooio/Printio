use anyhow::Result;
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use sqlx::Row;
use std::path::Path;
use std::str::FromStr;

/// Database handle wrapping an SQLite connection pool in WAL mode.
#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Get a reference to the underlying connection pool.
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Open (or create) the SQLite database at the given path.
    /// Enables WAL journal mode for concurrent read/write performance.
    pub async fn open(db_path: &Path) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
        let opts = SqliteConnectOptions::from_str(&db_url)?
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(8)
            .connect_with(opts)
            .await?;

        let db = Self { pool };
        db.run_migrations().await?;
        Ok(db)
    }

    /// Create all tables if they don't exist.
    async fn run_migrations(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sessions (
                id              TEXT PRIMARY KEY,
                ip_address      TEXT NOT NULL,
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                last_activity   TEXT NOT NULL DEFAULT (datetime('now')),
                status          TEXT NOT NULL DEFAULT 'active'
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_ip ON sessions(ip_address);
            CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS uploads (
                id              TEXT PRIMARY KEY,
                session_id      TEXT NOT NULL REFERENCES sessions(id),
                file_id         TEXT NOT NULL,
                original_name   TEXT NOT NULL,
                safe_name       TEXT NOT NULL,
                file_type       TEXT NOT NULL,
                file_size       INTEGER NOT NULL,
                uploaded_bytes  INTEGER NOT NULL DEFAULT 0,
                file_path       TEXT,
                fingerprint     TEXT NOT NULL,
                status          TEXT NOT NULL DEFAULT 'uploading',
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                completed_at    TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_uploads_session ON uploads(session_id);
            CREATE INDEX IF NOT EXISTS idx_uploads_file_id ON uploads(file_id);
            CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_uploads_fingerprint_session
                ON uploads(fingerprint, session_id);
            "#,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // ───────────────────── Session Queries ─────────────────────

    /// Find an active session for the given IP, or create one.
    pub async fn get_or_create_session(&self, ip: &str) -> Result<String> {
        // Try to find an existing active session for this IP
        let row = sqlx::query(
            "SELECT id FROM sessions WHERE ip_address = ? AND status = 'active' LIMIT 1",
        )
        .bind(ip)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let id: String = row.get("id");
            // Touch last_activity
            sqlx::query("UPDATE sessions SET last_activity = datetime('now') WHERE id = ?")
                .bind(&id)
                .execute(&self.pool)
                .await?;
            return Ok(id);
        }

        // Create new session
        let id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO sessions (id, ip_address, created_at, last_activity, status) VALUES (?, ?, datetime('now'), datetime('now'), 'active')",
        )
        .bind(&id)
        .bind(ip)
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    /// List all sessions with their file counts.
    pub async fn list_sessions(&self) -> Result<Vec<SessionInfo>> {
        let rows = sqlx::query(
            r#"
            SELECT s.id, s.ip_address, s.created_at, s.last_activity, s.status,
                   COUNT(u.id) as file_count,
                   COALESCE(SUM(CASE WHEN u.status = 'complete' THEN 1 ELSE 0 END), 0) as completed_count
            FROM sessions s
            LEFT JOIN uploads u ON u.session_id = s.id
            GROUP BY s.id
            ORDER BY s.last_activity DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let mut sessions = Vec::new();
        for row in rows {
            sessions.push(SessionInfo {
                id: row.get("id"),
                ip_address: row.get("ip_address"),
                created_at: row.get("created_at"),
                last_activity: row.get("last_activity"),
                status: row.get("status"),
                file_count: row.get::<i64, _>("file_count") as u32,
                completed_count: row.get::<i64, _>("completed_count") as u32,
            });
        }
        Ok(sessions)
    }

    /// Mark a session as completed.
    pub async fn complete_session(&self, session_id: &str) -> Result<()> {
        sqlx::query("UPDATE sessions SET status = 'completed' WHERE id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Expire sessions inactive for more than `timeout_minutes`.
    pub async fn expire_stale_sessions(&self, timeout_minutes: i64) -> Result<u64> {
        let result = sqlx::query(
            "UPDATE sessions SET status = 'expired' WHERE status = 'active' AND last_activity < datetime('now', ? || ' minutes')",
        )
        .bind(format!("-{}", timeout_minutes))
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected())
    }

    // ───────────────────── Upload Queries ─────────────────────

    /// Find an existing upload by fingerprint within a session, or return None.
    pub async fn find_upload_by_fingerprint(
        &self,
        session_id: &str,
        fingerprint: &str,
    ) -> Result<Option<UploadInfo>> {
        let row = sqlx::query(
            "SELECT id, file_id, original_name, safe_name, file_type, file_size, uploaded_bytes, file_path, fingerprint, status, created_at, completed_at FROM uploads WHERE session_id = ? AND fingerprint = ?",
        )
        .bind(session_id)
        .bind(fingerprint)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| UploadInfo {
            id: r.get("id"),
            file_id: r.get("file_id"),
            original_name: r.get("original_name"),
            safe_name: r.get("safe_name"),
            file_type: r.get("file_type"),
            file_size: r.get::<i64, _>("file_size") as u64,
            uploaded_bytes: r.get::<i64, _>("uploaded_bytes") as u64,
            file_path: r.get("file_path"),
            fingerprint: r.get("fingerprint"),
            status: r.get("status"),
            created_at: r.get("created_at"),
            completed_at: r.get("completed_at"),
        }))
    }

    /// Look up an upload by its file_id.
    pub async fn find_upload_by_file_id(&self, file_id: &str) -> Result<Option<UploadInfo>> {
        let row = sqlx::query(
            "SELECT id, file_id, original_name, safe_name, file_type, file_size, uploaded_bytes, file_path, fingerprint, status, created_at, completed_at FROM uploads WHERE file_id = ?",
        )
        .bind(file_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| UploadInfo {
            id: r.get("id"),
            file_id: r.get("file_id"),
            original_name: r.get("original_name"),
            safe_name: r.get("safe_name"),
            file_type: r.get("file_type"),
            file_size: r.get::<i64, _>("file_size") as u64,
            uploaded_bytes: r.get::<i64, _>("uploaded_bytes") as u64,
            file_path: r.get("file_path"),
            fingerprint: r.get("fingerprint"),
            status: r.get("status"),
            created_at: r.get("created_at"),
            completed_at: r.get("completed_at"),
        }))
    }

    /// Create a new upload record.
    pub async fn create_upload(
        &self,
        session_id: &str,
        file_id: &str,
        original_name: &str,
        safe_name: &str,
        file_type: &str,
        file_size: u64,
        fingerprint: &str,
    ) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO uploads (id, session_id, file_id, original_name, safe_name, file_type, file_size, fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(session_id)
        .bind(file_id)
        .bind(original_name)
        .bind(safe_name)
        .bind(file_type)
        .bind(file_size as i64)
        .bind(fingerprint)
        .execute(&self.pool)
        .await?;

        // Touch session
        sqlx::query("UPDATE sessions SET last_activity = datetime('now') WHERE id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await?;

        Ok(id)
    }

    /// Atomically update the uploaded byte count for a file.
    pub async fn update_upload_progress(&self, file_id: &str, uploaded_bytes: u64) -> Result<()> {
        sqlx::query("UPDATE uploads SET uploaded_bytes = ? WHERE file_id = ?")
            .bind(uploaded_bytes as i64)
            .bind(file_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Mark upload as complete and record the final file path.
    pub async fn complete_upload(&self, file_id: &str, final_path: &str) -> Result<()> {
        sqlx::query(
            "UPDATE uploads SET status = 'complete', file_path = ?, completed_at = datetime('now') WHERE file_id = ?",
        )
        .bind(final_path)
        .bind(file_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Mark an upload as failed.
    pub async fn fail_upload(&self, file_id: &str) -> Result<()> {
        sqlx::query("UPDATE uploads SET status = 'failed' WHERE file_id = ?")
            .bind(file_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Get the session_id for an upload by file_id.
    pub async fn get_session_id_for_upload(&self, file_id: &str) -> Result<Option<String>> {
        let row = sqlx::query("SELECT session_id FROM uploads WHERE file_id = ?")
            .bind(file_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(row.map(|r| r.get("session_id")))
    }

    /// List all uploads for a session.
    pub async fn list_session_uploads(&self, session_id: &str) -> Result<Vec<UploadInfo>> {
        let rows = sqlx::query(
            "SELECT id, file_id, original_name, safe_name, file_type, file_size, uploaded_bytes, file_path, fingerprint, status, created_at, completed_at FROM uploads WHERE session_id = ? ORDER BY created_at DESC",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| UploadInfo {
                id: r.get("id"),
                file_id: r.get("file_id"),
                original_name: r.get("original_name"),
                safe_name: r.get("safe_name"),
                file_type: r.get("file_type"),
                file_size: r.get::<i64, _>("file_size") as u64,
                uploaded_bytes: r.get::<i64, _>("uploaded_bytes") as u64,
                file_path: r.get("file_path"),
                fingerprint: r.get("fingerprint"),
                status: r.get("status"),
                created_at: r.get("created_at"),
                completed_at: r.get("completed_at"),
            })
            .collect())
    }

    /// Get total storage used by all completed files.
    pub async fn get_storage_usage(&self) -> Result<StorageStats> {
        let row = sqlx::query(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN status = 'complete' THEN file_size ELSE 0 END), 0) as total_used,
                COUNT(CASE WHEN status = 'complete' THEN 1 END) as file_count,
                (SELECT COUNT(*) FROM sessions WHERE status = 'active') as active_sessions
            FROM uploads
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(StorageStats {
            total_used_bytes: row.get::<i64, _>("total_used") as u64,
            file_count: row.get::<i64, _>("file_count") as u32,
            active_sessions: row.get::<i64, _>("active_sessions") as u32,
        })
    }

    /// Delete a session and all its upload records.
    pub async fn delete_session(&self, session_id: &str) -> Result<Vec<String>> {
        // Collect file paths to delete from disk
        let rows = sqlx::query(
            "SELECT file_path FROM uploads WHERE session_id = ? AND file_path IS NOT NULL",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await?;

        let paths: Vec<String> = rows.iter().filter_map(|r| r.get("file_path")).collect();

        sqlx::query("DELETE FROM uploads WHERE session_id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await?;

        sqlx::query("DELETE FROM sessions WHERE id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await?;

        Ok(paths)
    }
}

// ───────────────────── Data Transfer Objects ─────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SessionInfo {
    pub id: String,
    pub ip_address: String,
    pub created_at: String,
    pub last_activity: String,
    pub status: String,
    pub file_count: u32,
    pub completed_count: u32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UploadInfo {
    pub id: String,
    pub file_id: String,
    pub original_name: String,
    pub safe_name: String,
    pub file_type: String,
    pub file_size: u64,
    pub uploaded_bytes: u64,
    pub file_path: Option<String>,
    pub fingerprint: String,
    pub status: String,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StorageStats {
    pub total_used_bytes: u64,
    pub file_count: u32,
    pub active_sessions: u32,
}
