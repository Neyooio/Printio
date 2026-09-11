use std::path::{Path, PathBuf};
use anyhow::{Result, bail};

/// Allowed file extensions (lowercase).
const ALLOWED_EXTENSIONS: &[&str] = &[
    "pdf", "docx", "doc", "xlsx", "pptx", "jpg", "jpeg", "png",
];

/// Magic byte signatures for file type verification.
const MAGIC_SIGNATURES: &[(&str, &[u8])] = &[
    ("pdf",  b"%PDF"),
    ("png",  &[0x89, 0x50, 0x4E, 0x47]),
    ("jpg",  &[0xFF, 0xD8, 0xFF]),
    ("jpeg", &[0xFF, 0xD8, 0xFF]),
    // Office Open XML (docx, xlsx, pptx) all start with PK (ZIP)
    ("docx", &[0x50, 0x4B, 0x03, 0x04]),
    ("xlsx", &[0x50, 0x4B, 0x03, 0x04]),
    ("pptx", &[0x50, 0x4B, 0x03, 0x04]),
    // Legacy DOC (Compound File Binary Format)
    ("doc",  &[0xD0, 0xCF, 0x11, 0xE0]),
];

/// Default storage cap: 4 GB.
#[allow(dead_code)]
pub const DEFAULT_STORAGE_CAP_BYTES: u64 = 4 * 1024 * 1024 * 1024;

/// Validate that a filename has an allowed extension.
/// Returns the lowercase extension if valid.
pub fn validate_extension(filename: &str) -> Result<String> {
    let ext = Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    if ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        Ok(ext)
    } else {
        bail!(
            "File type '.{}' is not allowed. Permitted: {}",
            ext,
            ALLOWED_EXTENSIONS.join(", ")
        )
    }
}

/// Verify the file's magic bytes match the declared extension.
/// Call this after the file is fully assembled.
pub async fn verify_magic_bytes(file_path: &Path, declared_ext: &str) -> Result<bool> {
    let header = tokio::fs::read(file_path).await.map(|data| {
        data.into_iter().take(16).collect::<Vec<u8>>()
    });

    let header = match header {
        Ok(h) if h.len() >= 4 => h,
        _ => return Ok(false), // Can't read enough bytes
    };

    // Find expected signature for the declared extension
    for (ext, sig) in MAGIC_SIGNATURES {
        if *ext == declared_ext {
            if header.starts_with(sig) {
                return Ok(true);
            }
        }
    }

    // If we don't have a signature for this type, allow it (conservative)
    let has_signature = MAGIC_SIGNATURES.iter().any(|(ext, _)| *ext == declared_ext);
    if !has_signature {
        return Ok(true);
    }

    Ok(false)
}

/// Strip directory traversal components and extract a safe base filename.
/// Returns the sanitized filename.
pub fn sanitize_filename(raw: &str) -> String {
    // Take only the final path component
    let basename = raw
        .replace('\\', "/")
        .split('/')
        .last()
        .unwrap_or("unnamed")
        .to_string();

    // Remove any remaining dangerous characters
    let safe: String = basename
        .chars()
        .filter(|c| {
            c.is_alphanumeric()
                || *c == '.'
                || *c == '-'
                || *c == '_'
                || *c == ' '
        })
        .collect();

    // Prevent empty names or dot-only names
    let safe = safe.trim().trim_matches('.').to_string();
    if safe.is_empty() {
        "unnamed_file".to_string()
    } else {
        safe
    }
}

/// Build the final storage path for a completed file.
/// Structure: <base_dir>/sessions/<YYYY-MM-DD>/<session_id>/<uuid>.<ext>
pub fn build_final_path(
    base_dir: &Path,
    session_id: &str,
    ext: &str,
) -> PathBuf {
    let date_str = chrono::Local::now().format("%Y-%m-%d").to_string();
    let uuid = uuid::Uuid::new_v4().to_string();

    base_dir
        .join("sessions")
        .join(&date_str)
        .join(session_id)
        .join(format!("{}.{}", uuid, ext))
}

/// Build the temporary file path for an in-progress upload.
/// Structure: <base_dir>/temp/<file_id>.part
pub fn build_temp_path(base_dir: &Path, file_id: &str) -> PathBuf {
    base_dir.join("temp").join(format!("{}.part", file_id))
}

/// Calculate the total size of a directory recursively.
#[allow(dead_code)]
pub async fn calculate_dir_size(dir: &Path) -> Result<u64> {
    let mut total: u64 = 0;

    if !dir.exists() {
        return Ok(0);
    }

    let mut stack = vec![dir.to_path_buf()];

    while let Some(current) = stack.pop() {
        let mut entries = match tokio::fs::read_dir(&current).await {
            Ok(e) => e,
            Err(_) => continue,
        };

        while let Ok(Some(entry)) = entries.next_entry().await {
            let metadata = match entry.metadata().await {
                Ok(m) => m,
                Err(_) => continue,
            };

            if metadata.is_dir() {
                stack.push(entry.path());
            } else {
                total += metadata.len();
            }
        }
    }

    Ok(total)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_extension() {
        assert!(validate_extension("report.pdf").is_ok());
        assert!(validate_extension("photo.JPG").is_ok());
        assert!(validate_extension("doc.DOCX").is_ok());
        assert!(validate_extension("virus.exe").is_err());
        assert!(validate_extension("script.bat").is_err());
        assert!(validate_extension("noext").is_err());
    }

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("report.pdf"), "report.pdf");
        assert_eq!(sanitize_filename("C:\\Users\\evil\\..\\..\\system.pdf"), "system.pdf");
        assert_eq!(sanitize_filename("/etc/passwd"), "passwd");
        assert_eq!(sanitize_filename("../../../etc/shadow"), "shadow");
        assert_eq!(sanitize_filename(""), "unnamed_file");
        assert_eq!(sanitize_filename("..."), "unnamed_file");
        assert_eq!(sanitize_filename("my file (1).pdf"), "my file 1.pdf");
    }
}
