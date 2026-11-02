use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::io::SeekFrom;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_opener::OpenerExt;
use tokio::io::{AsyncSeekExt, AsyncWriteExt};
use tokio::sync::RwLock;

pub const DEFAULT_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 OtiumDownloader/1.2 (+https://github.com/XRTM8/Otium-Downloader)";

#[derive(Default)]
pub struct TaskManager {
    cancellations: RwLock<HashMap<String, Arc<AtomicBool>>>,
    speed_limit_bytes_per_sec: AtomicU64,
}

impl TaskManager {
    pub async fn get_or_create_token(&self, task_id: &str) -> Arc<AtomicBool> {
        let mut map = self.cancellations.write().await;
        if let Some(token) = map.get(task_id) {
            if token.load(Ordering::Relaxed) {
                let new_token = Arc::new(AtomicBool::new(false));
                map.insert(task_id.to_string(), new_token.clone());
                return new_token;
            }
            token.clone()
        } else {
            let token = Arc::new(AtomicBool::new(false));
            map.insert(task_id.to_string(), token.clone());
            token
        }
    }

    pub async fn cancel(&self, task_id: &str) {
        let map = self.cancellations.read().await;
        if let Some(token) = map.get(task_id) {
            token.store(true, Ordering::Relaxed);
        }
    }

    pub async fn remove(&self, task_id: &str) {
        let mut map = self.cancellations.write().await;
        map.remove(task_id);
    }

    pub fn set_speed_limit(&self, bytes: u64) {
        self.speed_limit_bytes_per_sec.store(bytes, Ordering::Relaxed);
    }

    pub fn get_speed_limit(&self) -> u64 {
        self.speed_limit_bytes_per_sec.load(Ordering::Relaxed)
    }
}

pub fn sanitize_filename(raw: &str) -> String {
    // 1. Strip directories, keeping only the final segment
    let clean_name = raw
        .replace('\\', "/")
        .split('/')
        .filter(|s| !s.is_empty() && *s != "." && *s != "..")
        .last()
        .unwrap_or("download")
        .to_string();

    // 2. Map illegal chars on Windows/Linux to '_'
    let mut sanitized: String = clean_name
        .chars()
        .map(|c| {
            if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '\0'..='\x1f') {
                '_'
            } else {
                c
            }
        })
        .collect();

    // 3. Trim whitespace, dots and underscores from edges
    let trimmed = sanitized.trim().trim_matches(|c| c == '.' || c == ' ');
    if trimmed.is_empty() {
        return "download".to_string();
    }
    sanitized = trimmed.to_string();

    // 4. Guard against Windows reserved names: CON, PRN, AUX, NUL, COM1-9, LPT1-9
    let stem = sanitized.split('.').next().unwrap_or("").to_ascii_uppercase();
    let is_reserved = matches!(
        stem.as_str(),
        "CON" | "PRN" | "AUX" | "NUL"
            | "COM1" | "COM2" | "COM3" | "COM4" | "COM5" | "COM6" | "COM7" | "COM8" | "COM9"
            | "LPT1" | "LPT2" | "LPT3" | "LPT4" | "LPT5" | "LPT6" | "LPT7" | "LPT8" | "LPT9"
    );

    if is_reserved {
        format!("_{}", sanitized)
    } else {
        sanitized
    }
}

fn percent_decode(input: &str) -> String {
    let mut bytes = Vec::new();
    let mut chars = input.bytes();
    while let Some(b) = chars.next() {
        if b == b'%' {
            let h1 = chars.next();
            let h2 = chars.next();
            if let (Some(c1), Some(c2)) = (h1, h2) {
                let hex_str = [c1, c2];
                if let Ok(val) = std::str::from_utf8(&hex_str) {
                    if let Ok(byte) = u8::from_str_radix(val, 16) {
                        bytes.push(byte);
                        continue;
                    }
                }
                bytes.push(b'%');
                bytes.push(c1);
                bytes.push(c2);
            } else {
                bytes.push(b'%');
                if let Some(c1) = h1 {
                    bytes.push(c1);
                }
            }
        } else {
            bytes.push(b);
        }
    }
    String::from_utf8_lossy(&bytes).to_string()
}

fn parse_content_disposition_filename(cd: &str) -> Option<String> {
    // 1. Try filename*=UTF-8''... (RFC 5987 / RFC 6266)
    if let Some(pos) = cd.to_ascii_lowercase().find("filename*=") {
        let after = &cd[pos + 10..];
        let raw_val = after.split(';').next().unwrap_or("").trim();
        let encoded_val = if let Some(stripped) = raw_val
            .strip_prefix("UTF-8''")
            .or_else(|| raw_val.strip_prefix("utf-8''"))
        {
            stripped
        } else {
            raw_val
        };
        let decoded = percent_decode(encoded_val);
        let s = decoded.trim_matches(|c| c == '"' || c == '\'');
        if !s.is_empty() {
            return Some(sanitize_filename(s));
        }
    }

    // 2. Fallback to standard filename="..."
    if let Some(pos) = cd.to_ascii_lowercase().find("filename=") {
        let after = &cd[pos + 9..];
        let raw_val = after.split(';').next().unwrap_or("").trim();
        let clean = raw_val.trim_matches(|c| c == '"' || c == '\'');
        if !clean.is_empty() {
            return Some(sanitize_filename(clean));
        }
    }

    None
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UrlProbeResult {
    pub content_length: Option<u64>,
    pub accept_ranges: bool,
    pub content_type: Option<String>,
    pub suggested_filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentProgressEvent {
    pub task_id: String,
    pub segment_index: u32,
    pub delta_bytes: u64,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub is_finished: bool,
}

#[tauri::command]
async fn probe_url(
    url: String,
    custom_headers: Option<HashMap<String, String>>,
) -> Result<UrlProbeResult, String> {
    let trimmed_url = url.trim();
    if !trimmed_url.starts_with("http://") && !trimmed_url.starts_with("https://") {
        return Err("Only HTTP and HTTPS URLs are allowed".to_string());
    }

    let client = reqwest::Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .redirect(reqwest::redirect::Policy::limited(15))
        .connect_timeout(std::time::Duration::from_secs(12))
        .tcp_keepalive(Some(std::time::Duration::from_secs(15)))
        .build()
        .map_err(|e| e.to_string())?;

    let mut head_req = client.head(trimmed_url);
    let mut get_req = client.get(trimmed_url).header(reqwest::header::RANGE, "bytes=0-0");

    if let Some(ref map) = custom_headers {
        for (k, v) in map {
            if let (Ok(hname), Ok(hval)) = (
                reqwest::header::HeaderName::from_bytes(k.as_bytes()),
                reqwest::header::HeaderValue::from_str(v),
            ) {
                head_req = head_req.header(hname.clone(), hval.clone());
                get_req = get_req.header(hname, hval);
            }
        }
    }

    let response = match head_req.send().await {
        Ok(res) if res.status().is_success() => res,
        _ => match get_req.send().await {
            Ok(res) if res.status().is_success() => res,
            _ => {
                let mut fallback_get = client.get(trimmed_url);
                if let Some(ref map) = custom_headers {
                    for (k, v) in map {
                        if let (Ok(hname), Ok(hval)) = (
                            reqwest::header::HeaderName::from_bytes(k.as_bytes()),
                            reqwest::header::HeaderValue::from_str(v),
                        ) {
                            fallback_get = fallback_get.header(hname, hval);
                        }
                    }
                }
                fallback_get.send().await.map_err(|e| e.to_string())?
            }
        },
    };

    let final_url = response.url().clone();
    let headers = response.headers();

    let accept_ranges = headers
        .get(reqwest::header::ACCEPT_RANGES)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.to_ascii_lowercase().contains("bytes"))
        .unwrap_or(false)
        || headers.contains_key(reqwest::header::CONTENT_RANGE);

    let content_length = if let Some(cr) = headers.get(reqwest::header::CONTENT_RANGE) {
        cr.to_str()
            .ok()
            .and_then(|s| s.split('/').last())
            .and_then(|s| s.parse::<u64>().ok())
    } else {
        response.content_length()
    };

    let content_type = headers
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    let mut suggested_filename = headers
        .get(reqwest::header::CONTENT_DISPOSITION)
        .and_then(|v| v.to_str().ok())
        .and_then(parse_content_disposition_filename);

    // Fallback: If no Content-Disposition header, inspect the final redirected URL path
    if suggested_filename.is_none() {
        let path = final_url.path();
        let last_seg = path.split('/').filter(|s| !s.is_empty()).last().unwrap_or("");
        if !last_seg.is_empty() && last_seg.contains('.') {
            let decoded = percent_decode(last_seg);
            suggested_filename = Some(sanitize_filename(&decoded));
        }
    }

    Ok(UrlProbeResult {
        content_length,
        accept_ranges,
        content_type,
        suggested_filename,
    })
}

#[tauri::command]
async fn set_global_speed_limit(
    state: tauri::State<'_, Arc<TaskManager>>,
    bytes_per_sec: u64,
) -> Result<(), String> {
    state.set_speed_limit(bytes_per_sec);
    Ok(())
}

pub fn get_resolved_download_dir(app: &AppHandle) -> std::path::PathBuf {
    #[cfg(target_os = "android")]
    {
        let candidates = [
            std::path::PathBuf::from("/storage/emulated/0/Download"),
            std::path::PathBuf::from("/sdcard/Download"),
            std::path::PathBuf::from("/storage/emulated/0/Android/data/com.otium.downloader/files/Download"),
        ];

        for dir in &candidates {
            if dir.exists() || std::fs::create_dir_all(dir).is_ok() {
                let test_probe = dir.join(".otium_write_probe");
                if std::fs::write(&test_probe, b"ok").is_ok() {
                    let _ = std::fs::remove_file(&test_probe);
                    return dir.clone();
                }
            }
        }

        if let Ok(dir) = app.path().app_local_data_dir() {
            let sub = dir.join("Download");
            let _ = std::fs::create_dir_all(&sub);
            return sub;
        }

        if let Ok(dir) = app.path().app_cache_dir() {
            let sub = dir.join("Download");
            let _ = std::fs::create_dir_all(&sub);
            return sub;
        }
    }

    if let Ok(p) = app.path().download_dir() {
        return p;
    }
    if let Ok(p) = app.path().document_dir() {
        return p;
    }
    if let Ok(p) = app.path().app_local_data_dir() {
        return p;
    }
    std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
}

pub fn resolve_destination_path(app: &AppHandle, dest: &str) -> std::path::PathBuf {
    let clean = dest.trim();
    if clean.is_empty() {
        let base = get_resolved_download_dir(app);
        return base.join("download.bin");
    }
    let p = Path::new(clean);
    if p.is_absolute() {
        p.to_path_buf()
    } else {
        let base = get_resolved_download_dir(app);
        base.join(clean)
    }
}

#[tauri::command]
async fn get_default_download_directory(app: AppHandle) -> Result<String, String> {
    let path = get_resolved_download_dir(&app);
    let _ = tokio::fs::create_dir_all(&path).await;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn prepare_download_file(
    app: AppHandle,
    destination_path: String,
    total_bytes: u64,
) -> Result<String, String> {
    let target = resolve_destination_path(&app, &destination_path);
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("Failed to create folder structure: {}", e))?;
        }
    }

    let mut std_opts = std::fs::OpenOptions::new();
    std_opts.create(true).write(true).truncate(false);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        std_opts.share_mode(1 | 2 | 4);
    }
    let std_file = std_opts
        .open(&target)
        .map_err(|e| format!("Failed to open or create file: {}", e))?;
    let file = tokio::fs::File::from_std(std_file);

    if total_bytes > 0 {
        let _ = file.set_len(total_bytes).await;
    }

    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
async fn cancel_task(
    state: tauri::State<'_, Arc<TaskManager>>,
    task_id: String,
) -> Result<(), String> {
    state.cancel(&task_id).await;
    Ok(())
}

#[tauri::command]
async fn cleanup_task(
    state: tauri::State<'_, Arc<TaskManager>>,
    task_id: String,
) -> Result<(), String> {
    state.remove(&task_id).await;
    Ok(())
}

#[tauri::command]
async fn download_segment(
    app: AppHandle,
    state: tauri::State<'_, Arc<TaskManager>>,
    task_id: String,
    url: String,
    destination_path: String,
    start_byte: u64,
    end_byte: u64,
    current_downloaded: u64,
    segment_index: u32,
    custom_headers: Option<HashMap<String, String>>,
) -> Result<(), String> {
    let token = state.get_or_create_token(&task_id).await;
    let target_path = resolve_destination_path(&app, &destination_path);

    if let Some(parent) = target_path.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }

    let is_open_stream = (start_byte == 0 && end_byte == 0) || end_byte <= start_byte;
    let total_segment_bytes = if is_open_stream {
        0
    } else {
        end_byte.saturating_sub(start_byte) + 1
    };

    let mut downloaded = current_downloaded;

    // If bounded and already completely downloaded
    if !is_open_stream && total_segment_bytes > 0 && downloaded >= total_segment_bytes {
        let _ = app.emit(
            "download-progress",
            SegmentProgressEvent {
                task_id,
                segment_index,
                delta_bytes: 0,
                downloaded_bytes: total_segment_bytes,
                total_bytes: total_segment_bytes,
                is_finished: true,
            },
        );
        return Ok(());
    }

    let trimmed_url = url.trim();
    if !trimmed_url.starts_with("http://") && !trimmed_url.starts_with("https://") {
        return Err("Only HTTP and HTTPS URLs are allowed".to_string());
    }

    let client = reqwest::Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .redirect(reqwest::redirect::Policy::limited(15))
        .connect_timeout(std::time::Duration::from_secs(15))
        .tcp_keepalive(Some(std::time::Duration::from_secs(15)))
        .build()
        .map_err(|e| e.to_string())?;

    let mut std_opts = std::fs::OpenOptions::new();
    std_opts.create(true).write(true).truncate(false);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        std_opts.share_mode(1 | 2 | 4);
    }
    let std_file = std_opts
        .open(&target_path)
        .map_err(|e| format!("Failed to open destination: {}", e))?;
    let mut file = tokio::fs::File::from_std(std_file);

    let mut retries = 0;
    const MAX_RETRIES: u32 = 5;
    let mut last_emit = std::time::Instant::now();
    let mut last_emitted_downloaded = downloaded;
    let mut known_total_bytes = total_segment_bytes;

    while is_open_stream || downloaded < total_segment_bytes {
        if token.load(Ordering::Relaxed) {
            let _ = file.flush().await;
            return Ok(());
        }

        let actual_start = start_byte + downloaded;
        let mut req = client.get(&url);

        if !is_open_stream {
            let range_header = format!("bytes={}-{}", actual_start, end_byte);
            req = req.header(reqwest::header::RANGE, range_header);
        } else if downloaded > 0 {
            let range_header = format!("bytes={}-", downloaded);
            req = req.header(reqwest::header::RANGE, range_header);
        }

        if let Some(ref map) = custom_headers {
            for (k, v) in map {
                if let (Ok(hname), Ok(hval)) = (
                    reqwest::header::HeaderName::from_bytes(k.as_bytes()),
                    reqwest::header::HeaderValue::from_str(v),
                ) {
                    req = req.header(hname, hval);
                }
            }
        }

        let res = req.send().await;

        let response = match res {
            Ok(resp) => resp,
            Err(e) => {
                retries += 1;
                if retries > MAX_RETRIES || token.load(Ordering::Relaxed) {
                    return Err(format!("Network connect failed after {} retries: {}", retries - 1, e));
                }
                let backoff_ms = 500 * (1u64 << retries.min(5));
                tokio::time::sleep(std::time::Duration::from_millis(backoff_ms)).await;
                continue;
            }
        };

        let status = response.status();
        if !status.is_success() {
            // If segment > 0 returns 416 (file smaller than chunk count), it's completed
            if status == reqwest::StatusCode::RANGE_NOT_SATISFIABLE && segment_index > 0 {
                return Ok(());
            }
            return Err(format!("Server returned HTTP {}", status));
        }

        // If server returns 200 OK (no range support or full file returned)
        let is_status_200 = status == reqwest::StatusCode::OK;
        if is_status_200 {
            if segment_index > 0 {
                // Segment 0 will download the full body, secondary segments simply exit cleanly
                return Ok(());
            }
            // Segment 0: seek to 0 and stream entire file
            let _ = file.seek(SeekFrom::Start(0)).await;
            downloaded = 0;
            if let Some(cl) = response.content_length() {
                known_total_bytes = cl;
            }
        } else {
            // Seek to resume offset
            if let Err(e) = file.seek(SeekFrom::Start(actual_start)).await {
                return Err(format!("Failed to seek offset: {}", e));
            }
            if known_total_bytes == 0 {
                if let Some(cl) = response.content_length() {
                    known_total_bytes = downloaded + cl;
                }
            }
        }

        let mut stream = response.bytes_stream();
        let mut stream_error = false;

        loop {
            if token.load(Ordering::Relaxed) {
                let _ = file.flush().await;
                return Ok(());
            }

            let next_step = tokio::time::timeout(std::time::Duration::from_secs(30), stream.next()).await;
            let chunk_result = match next_step {
                Ok(Some(item)) => item,
                Ok(None) => break, // Clean EOF
                Err(_) => {
                    log::warn!("Stream stalled on segment {} (no data for 30s)", segment_index);
                    stream_error = true;
                    break;
                }
            };

            match chunk_result {
                Ok(chunk) => {
                    let chunk_len = chunk.len() as u64;
                    let bytes_to_write = if !is_open_stream && !is_status_200 {
                        let remaining = total_segment_bytes.saturating_sub(downloaded);
                        if remaining == 0 {
                            break;
                        }
                        (chunk_len.min(remaining)) as usize
                    } else {
                        chunk_len as usize
                    };

                    if bytes_to_write > 0 {
                        if let Err(e) = file.write_all(&chunk[..bytes_to_write]).await {
                            return Err(format!("Disk write error: {}", e));
                        }
                        downloaded += bytes_to_write as u64;
                    }

                    // Speed limit pacing if configured
                    let limit = state.get_speed_limit();
                    if limit > 0 {
                        let delay_ms = ((bytes_to_write as u64) * 1000) / limit;
                        if delay_ms > 0 {
                            tokio::time::sleep(std::time::Duration::from_millis(delay_ms.min(300))).await;
                        }
                    }

                    // Throttle IPC events to at most once every 100ms
                    if last_emit.elapsed() >= std::time::Duration::from_millis(100) {
                        let delta = downloaded.saturating_sub(last_emitted_downloaded);
                        last_emitted_downloaded = downloaded;
                        last_emit = std::time::Instant::now();

                        let emit_total = if known_total_bytes > 0 {
                            known_total_bytes
                        } else if total_segment_bytes > 0 {
                            total_segment_bytes
                        } else {
                            downloaded
                        };

                        let _ = app.emit(
                            "download-progress",
                            SegmentProgressEvent {
                                task_id: task_id.clone(),
                                segment_index,
                                delta_bytes: delta,
                                downloaded_bytes: downloaded,
                                total_bytes: emit_total,
                                is_finished: false,
                            },
                        );
                    }

                    if !is_open_stream && !is_status_200 && downloaded >= total_segment_bytes {
                        break;
                    }
                }
                Err(e) => {
                    log::warn!("Stream interrupted on segment {}: {}", segment_index, e);
                    stream_error = true;
                    break;
                }
            }
        }

        let _ = file.flush().await;

        if stream_error {
            retries += 1;
            if retries > MAX_RETRIES || token.load(Ordering::Relaxed) {
                return Err(format!("Stream aborted on segment {} after {} retries", segment_index, retries));
            }
            let backoff_ms = 500 * (1u64 << retries.min(5));
            tokio::time::sleep(std::time::Duration::from_millis(backoff_ms)).await;
            continue;
        }

        break;
    }

    let final_delta = downloaded.saturating_sub(last_emitted_downloaded);
    let final_total = if known_total_bytes > 0 {
        known_total_bytes
    } else if total_segment_bytes > 0 {
        total_segment_bytes
    } else {
        downloaded
    };

    let _ = app.emit(
        "download-progress",
        SegmentProgressEvent {
            task_id,
            segment_index,
            delta_bytes: final_delta,
            downloaded_bytes: downloaded,
            total_bytes: final_total,
            is_finished: true,
        },
    );

    Ok(())
}

#[tauri::command]
async fn verify_file_sha256(app: AppHandle, file_path: String) -> Result<String, String> {
    let resolved = resolve_destination_path(&app, &file_path);
    if !resolved.exists() || !resolved.is_file() {
        return Err("Target file does not exist or is not a regular file".to_string());
    }

    let mut file = tokio::fs::File::open(&resolved)
        .await
        .map_err(|e| format!("Cannot open file for hashing: {}", e))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536];

    use tokio::io::AsyncReadExt;
    loop {
        let n = file
            .read(&mut buffer)
            .await
            .map_err(|e| format!("Read error: {}", e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

#[tauri::command]
async fn open_destination_folder(app: AppHandle, file_path: String) -> Result<(), String> {
    let target = resolve_destination_path(&app, &file_path);
    if !target.exists() {
        return Err("Destination path does not exist".to_string());
    }
    let target_str = target.to_string_lossy().to_string();
    app.opener()
        .reveal_item_in_dir(&target_str)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_file_item(app: AppHandle, file_path: String) -> Result<(), String> {
    let target = resolve_destination_path(&app, &file_path);
    if !target.exists() {
        return Err("File does not exist on disk".to_string());
    }
    let target_str = target.to_string_lossy().to_string();
    app.opener()
        .open_path(&target_str, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_file_item(app: AppHandle, file_path: String) -> Result<(), String> {
    let clean = file_path.trim();
    if clean.is_empty() {
        return Ok(());
    }
    let target_path = resolve_destination_path(&app, clean);
    if !target_path.exists() {
        return Ok(());
    }
    if !target_path.is_file() {
        return Err("Security violation: destination must be a file, not a directory".to_string());
    }

    let canonical_target = target_path.canonicalize().map_err(|e| e.to_string())?;

    // Block deletion of critical system root and directories
    let target_str = canonical_target.to_string_lossy().to_ascii_lowercase();
    let forbidden_prefixes = [
        "c:\\windows",
        "c:\\program files",
        "c:\\program files (x86)",
        "/etc",
        "/usr",
        "/bin",
        "/sbin",
        "/lib",
        "/system",
        "/library",
    ];
    for forbidden in forbidden_prefixes {
        if target_str.starts_with(forbidden) {
            return Err("Security violation: cannot delete system protected files".to_string());
        }
    }

    // Must be in download dir or user home directory
    let is_in_download = app.path().download_dir().ok()
        .and_then(|d| d.canonicalize().ok())
        .map(|d| canonical_target.starts_with(&d))
        .unwrap_or(false);

    let is_in_home = app.path().home_dir().ok()
        .and_then(|h| h.canonicalize().ok())
        .map(|h| canonical_target.starts_with(&h))
        .unwrap_or(false);

    if !is_in_download && !is_in_home {
        return Err("Security violation: target file is outside user allowed directories".to_string());
    }

    tokio::fs::remove_file(canonical_target)
        .await
        .map_err(|e| format!("Failed to delete file from disk: {}", e))?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserDownloadPayload {
    pub url: String,
    pub filename: Option<String>,
    pub headers: Option<HashMap<String, String>>,
}

#[cfg(desktop)]
fn start_browser_bridge(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let addr = "127.0.0.1:41523";
        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => {
                log::info!("Otium Browser Bridge listening on http://{}", addr);
                l
            }
            Err(e) => {
                log::warn!("Could not bind Browser Bridge port {}: {}", addr, e);
                return;
            }
        };

        loop {
            let (mut socket, _) = match listener.accept().await {
                Ok(conn) => conn,
                Err(_) => continue,
            };

            let app = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                use tokio::io::{AsyncReadExt, AsyncWriteExt};
                let mut buf = vec![0u8; 8192];
                let n = match socket.read(&mut buf).await {
                    Ok(n) if n > 0 => n,
                    _ => return,
                };

                let request = String::from_utf8_lossy(&buf[..n]);

                // Extract Origin and Client headers
                let origin_header = request
                    .lines()
                    .find(|line| line.to_ascii_lowercase().starts_with("origin:"))
                    .map(|line| line[7..].trim().to_string());

                let client_header = request
                    .lines()
                    .find(|line| line.to_ascii_lowercase().starts_with("x-otium-client:"))
                    .map(|line| line[16..].trim().to_string());

                // Reject all web origins (Anti-CSRF / Drive-by download prevention)
                if let Some(ref orig) = origin_header {
                    let lower = orig.to_ascii_lowercase();
                    if lower.starts_with("http://") || lower.starts_with("https://") {
                        let body = r#"{"error":"forbidden_origin","message":"Web origins are blocked from communicating with Otium loopback bridge"}"#;
                        let response = format!(
                            "HTTP/1.1 403 Forbidden\r\n\
                            Content-Type: application/json\r\n\
                            Content-Length: {}\r\n\r\n{}",
                            body.len(),
                            body
                        );
                        let _ = socket.write_all(response.as_bytes()).await;
                        return;
                    }
                }

                // Handle CORS preflight
                if request.starts_with("OPTIONS") {
                    let allowed_origin = match origin_header.as_deref() {
                        Some(orig) if orig.starts_with("chrome-extension://")
                            || orig.starts_with("moz-extension://")
                            || orig.starts_with("safari-web-extension://") => orig,
                        _ => {
                            let response = "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n";
                            let _ = socket.write_all(response.as_bytes()).await;
                            return;
                        }
                    };

                    let response = format!(
                        "HTTP/1.1 204 No Content\r\n\
                        Access-Control-Allow-Origin: {}\r\n\
                        Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n\
                        Access-Control-Allow-Headers: Content-Type, Authorization, X-Otium-Client\r\n\
                        Access-Control-Max-Age: 86400\r\n\
                        Content-Length: 0\r\n\r\n",
                        allowed_origin
                    );
                    let _ = socket.write_all(response.as_bytes()).await;
                    return;
                }

                // Echo origin if it is an extension, or omit if none
                let cors_origin_str = match origin_header.as_deref() {
                    Some(orig) if orig.starts_with("chrome-extension://")
                        || orig.starts_with("moz-extension://")
                        || orig.starts_with("safari-web-extension://") => {
                        format!("Access-Control-Allow-Origin: {}\r\n", orig)
                    }
                    _ => String::new(),
                };

                // Handle GET /ping or GET /status
                if request.starts_with("GET /ping") || request.starts_with("GET /status") {
                    let body = r#"{"status":"ok","app":"Otium Downloader","version":"1.3.1"}"#;
                    let response = format!(
                        "HTTP/1.1 200 OK\r\n\
                        {}Content-Type: application/json\r\n\
                        Content-Length: {}\r\n\r\n{}",
                        cors_origin_str,
                        body.len(),
                        body
                    );
                    let _ = socket.write_all(response.as_bytes()).await;
                    return;
                }

                // Handle POST /add
                if request.starts_with("POST /add") {
                    let is_extension_origin = origin_header.as_deref().map(|o| {
                        o.starts_with("chrome-extension://")
                            || o.starts_with("moz-extension://")
                            || o.starts_with("safari-web-extension://")
                    }).unwrap_or(false);

                    let is_extension_client = client_header.as_deref() == Some("browser-extension");

                    if !is_extension_origin && !is_extension_client {
                        let body = r#"{"error":"unauthorized_client","message":"Missing valid X-Otium-Client header or extension origin"}"#;
                        let response = format!(
                            "HTTP/1.1 401 Unauthorized\r\n\
                            {}Content-Type: application/json\r\n\
                            Content-Length: {}\r\n\r\n{}",
                            cors_origin_str,
                            body.len(),
                            body
                        );
                        let _ = socket.write_all(response.as_bytes()).await;
                        return;
                    }

                    if let Some(body_start) = request.find("\r\n\r\n") {
                        let json_part = &request[body_start + 4..];
                        if let Ok(mut payload) = serde_json::from_str::<BrowserDownloadPayload>(json_part.trim()) {
                            let url_trim = payload.url.trim();
                            // Validate protocol to prevent file:// or internal protocol abuse
                            if !url_trim.starts_with("http://")
                                && !url_trim.starts_with("https://")
                                && !url_trim.starts_with("magnet:?")
                            {
                                let body = r#"{"error":"invalid_protocol","message":"Only http, https, and magnet URIs are permitted"}"#;
                                let response = format!(
                                    "HTTP/1.1 400 Bad Request\r\n\
                                    {}Content-Type: application/json\r\n\
                                    Content-Length: {}\r\n\r\n{}",
                                    cors_origin_str,
                                    body.len(),
                                    body
                                );
                                let _ = socket.write_all(response.as_bytes()).await;
                                return;
                            }

                            if let Some(ref fname) = payload.filename {
                                payload.filename = Some(sanitize_filename(fname));
                            }

                            let _ = app.emit("browser-add-download", payload);
                            let body = r#"{"status":"accepted","message":"Download queued in Otium"}"#;
                            let response = format!(
                                "HTTP/1.1 200 OK\r\n\
                                {}Content-Type: application/json\r\n\
                                Content-Length: {}\r\n\r\n{}",
                                cors_origin_str,
                                body.len(),
                                body
                            );
                            let _ = socket.write_all(response.as_bytes()).await;
                            return;
                        }
                    }
                    let body = r#"{"error":"invalid_json"}"#;
                    let response = format!(
                        "HTTP/1.1 400 Bad Request\r\n\
                        {}Content-Type: application/json\r\n\
                        Content-Length: {}\r\n\r\n{}",
                        cors_origin_str,
                        body.len(),
                        body
                    );
                    let _ = socket.write_all(response.as_bytes()).await;
                    return;
                }

                // 404 for unknown endpoints
                let body = r#"{"error":"not_found"}"#;
                let response = format!(
                    "HTTP/1.1 404 Not Found\r\n\
                    {}Content-Type: application/json\r\n\
                    Content-Length: {}\r\n\r\n{}",
                    cors_origin_str,
                    body.len(),
                    body
                );
                let _ = socket.write_all(response.as_bytes()).await;
            });
        }
    });
}

#[derive(Clone, Serialize, Deserialize)]
pub struct RemoteServerInfo {
    pub local_ip: String,
    pub port: u16,
    pub pin: String,
    pub enabled: bool,
}

pub struct RemoteControlState {
    pub enabled: AtomicBool,
    pub pin: tokio::sync::RwLock<String>,
    pub port: u16,
    pub cached_snapshot: tokio::sync::RwLock<String>,
}

impl Default for RemoteControlState {
    fn default() -> Self {
        let seed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(123456);
        let pin = format!("{:06}", 100000 + (seed % 900000));

        Self {
            enabled: AtomicBool::new(true),
            pin: tokio::sync::RwLock::new(pin),
            port: 41524,
            cached_snapshot: tokio::sync::RwLock::new(
                r#"{"stats":{"activeCount":0,"currentTotalSpeed":0,"totalBytesDownloaded":0},"tasks":[]}"#.to_string()
            ),
        }
    }
}

pub fn get_local_lan_ip() -> String {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0");
    if let Ok(s) = socket {
        if s.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = s.local_addr() {
                let ip_str = addr.ip().to_string();
                if ip_str != "0.0.0.0" && ip_str != "127.0.0.1" {
                    return ip_str;
                }
            }
        }
    }
    "127.0.0.1".to_string()
}

#[cfg(desktop)]
fn start_remote_control_server(app_handle: AppHandle, remote_state: Arc<RemoteControlState>) {
    tauri::async_runtime::spawn(async move {
        let addr = format!("0.0.0.0:{}", remote_state.port);
        let listener = match tokio::net::TcpListener::bind(&addr).await {
            Ok(l) => {
                log::info!("Otium Remote Server listening on http://{}", addr);
                l
            }
            Err(e) => {
                log::warn!("Could not bind Remote Server port {}: {}", addr, e);
                return;
            }
        };

        loop {
            let (mut socket, _) = match listener.accept().await {
                Ok(conn) => conn,
                Err(_) => continue,
            };

            let app = app_handle.clone();
            let state = remote_state.clone();

            tauri::async_runtime::spawn(async move {
                use tokio::io::{AsyncReadExt, AsyncWriteExt};
                let mut buf = vec![0u8; 8192];
                let n = match socket.read(&mut buf).await {
                    Ok(n) if n > 0 => n,
                    _ => return,
                };

                let request = String::from_utf8_lossy(&buf[..n]);

                // Handle CORS preflight for LAN requests
                if request.starts_with("OPTIONS") {
                    let response = "HTTP/1.1 204 No Content\r\n\
                        Access-Control-Allow-Origin: *\r\n\
                        Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n\
                        Access-Control-Allow-Headers: Content-Type, Authorization, X-Otium-Pin\r\n\
                        Access-Control-Max-Age: 86400\r\n\
                        Content-Length: 0\r\n\r\n";
                    let _ = socket.write_all(response.as_bytes()).await;
                    return;
                }

                // Endpoint: GET /remote/ping (No pin required, discovery only)
                if request.starts_with("GET /remote/ping") {
                    let local_ip = get_local_lan_ip();
                    let body = format!(
                        r#"{{"status":"ok","app":"Otium PC Remote","version":"1.3.1","ip":"{}"}}"#,
                        local_ip
                    );
                    let response = format!(
                        "HTTP/1.1 200 OK\r\n\
                        Access-Control-Allow-Origin: *\r\n\
                        Content-Type: application/json\r\n\
                        Content-Length: {}\r\n\r\n{}",
                        body.len(),
                        body
                    );
                    let _ = socket.write_all(response.as_bytes()).await;
                    return;
                }

                // Verify PIN for sensitive remote endpoints
                let expected_pin = state.pin.read().await.clone();
                let has_valid_pin = request.contains(&format!("pin={}", expected_pin))
                    || request.lines().any(|l| {
                        let lower = l.to_ascii_lowercase();
                        lower.starts_with("x-otium-pin:") && l[12..].trim() == expected_pin
                    })
                    || request.contains(&format!("\"pin\":\"{}\"", expected_pin));

                if !has_valid_pin {
                    let body = r#"{"error":"invalid_pin","message":"Authentication failed: Incorrect 6-digit PIN"}"#;
                    let response = format!(
                        "HTTP/1.1 401 Unauthorized\r\n\
                        Access-Control-Allow-Origin: *\r\n\
                        Content-Type: application/json\r\n\
                        Content-Length: {}\r\n\r\n{}",
                        body.len(),
                        body
                    );
                    let _ = socket.write_all(response.as_bytes()).await;
                    return;
                }

                // Endpoint: GET /remote/status (Protected with PIN)
                if request.starts_with("GET /remote/status") {
                    let snapshot = state.cached_snapshot.read().await.clone();
                    let response = format!(
                        "HTTP/1.1 200 OK\r\n\
                        Access-Control-Allow-Origin: *\r\n\
                        Content-Type: application/json\r\n\
                        Content-Length: {}\r\n\r\n{}",
                        snapshot.len(),
                        snapshot
                    );
                    let _ = socket.write_all(response.as_bytes()).await;
                    return;
                }

                // Endpoint: POST /remote/add (Add download to PC)
                if request.starts_with("POST /remote/add") {
                    if let Some(body_start) = request.find("\r\n\r\n") {
                        let json_part = &request[body_start + 4..];
                        if let Ok(mut payload) = serde_json::from_str::<BrowserDownloadPayload>(json_part.trim()) {
                            let url_trim = payload.url.trim();
                            if url_trim.starts_with("http://")
                                || url_trim.starts_with("https://")
                                || url_trim.starts_with("magnet:?")
                            {
                                if let Some(ref fname) = payload.filename {
                                    payload.filename = Some(sanitize_filename(fname));
                                }
                                let _ = app.emit("browser-add-download", payload);
                                let body = r#"{"status":"accepted","message":"Download queued on PC"}"#;
                                let response = format!(
                                    "HTTP/1.1 200 OK\r\n\
                                    Access-Control-Allow-Origin: *\r\n\
                                    Content-Type: application/json\r\n\
                                    Content-Length: {}\r\n\r\n{}",
                                    body.len(),
                                    body
                                );
                                let _ = socket.write_all(response.as_bytes()).await;
                                return;
                            }
                        }
                    }
                }

                // Endpoint: POST /remote/action (Control PC download tasks)
                if request.starts_with("POST /remote/action") {
                    if let Some(body_start) = request.find("\r\n\r\n") {
                        let json_part = &request[body_start + 4..];
                        #[derive(Deserialize)]
                        struct ActionPayload {
                            action: String,
                            task_id: Option<String>,
                        }
                        if let Ok(act) = serde_json::from_str::<ActionPayload>(json_part.trim()) {
                            let _ = app.emit("remote-control-action", serde_json::json!({
                                "action": act.action,
                                "taskId": act.task_id
                            }));
                            let body = r#"{"status":"ok","message":"Action delivered to PC"}"#;
                            let response = format!(
                                "HTTP/1.1 200 OK\r\n\
                                Access-Control-Allow-Origin: *\r\n\
                                Content-Type: application/json\r\n\
                                Content-Length: {}\r\n\r\n{}",
                                body.len(),
                                body
                            );
                            let _ = socket.write_all(response.as_bytes()).await;
                            return;
                        }
                    }
                }

                // Endpoint: POST /remote/shutdown
                if request.starts_with("POST /remote/shutdown") {
                    #[cfg(windows)]
                    {
                        use std::process::Command;
                        let _ = Command::new("shutdown")
                            .args(["/s", "/t", "60", "/c", "Otium: Remote shutdown triggered from mobile"])
                            .status();
                    }
                    let body = r#"{"status":"ok","message":"PC shutdown scheduled in 60s"}"#;
                    let response = format!(
                        "HTTP/1.1 200 OK\r\n\
                        Access-Control-Allow-Origin: *\r\n\
                        Content-Type: application/json\r\n\
                        Content-Length: {}\r\n\r\n{}",
                        body.len(),
                        body
                    );
                    let _ = socket.write_all(response.as_bytes()).await;
                    return;
                }

                // 404
                let body = r#"{"error":"not_found"}"#;
                let response = format!(
                    "HTTP/1.1 404 Not Found\r\n\
                    Access-Control-Allow-Origin: *\r\n\
                    Content-Type: application/json\r\n\
                    Content-Length: {}\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = socket.write_all(response.as_bytes()).await;
            });
        }
    });
}

#[tauri::command]
async fn get_remote_server_info(
    state: tauri::State<'_, Arc<RemoteControlState>>,
) -> Result<RemoteServerInfo, String> {
    let local_ip = get_local_lan_ip();
    let pin = state.pin.read().await.clone();
    let enabled = state.enabled.load(Ordering::Relaxed);
    Ok(RemoteServerInfo {
        local_ip,
        port: state.port,
        pin,
        enabled,
    })
}

#[tauri::command]
async fn update_remote_snapshot(
    state: tauri::State<'_, Arc<RemoteControlState>>,
    snapshot_json: String,
) -> Result<(), String> {
    let mut current = state.cached_snapshot.write().await;
    *current = snapshot_json;
    Ok(())
}

#[tauri::command]
async fn system_shutdown(cancel: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::process::Command;
        if cancel {
            let _ = Command::new("shutdown").args(["/a"]).status();
        } else {
            let _ = Command::new("shutdown")
                .args(["/s", "/t", "60", "/c", "Otium Downloader: Scheduled shutdown in 60s"])
                .status();
        }
    }
    Ok(())
}

#[tauri::command]
async fn open_browser_extension_dir(app: AppHandle) -> Result<(), String> {
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let ext_dir = current_dir.join("browser-extension");
    if ext_dir.exists() {
        app.opener().open_path(ext_dir.to_string_lossy().to_string(), None::<&str>).map_err(|e| e.to_string())
    } else {
        Err("Browser extension folder not found".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let task_manager = Arc::new(TaskManager::default());
    let remote_state = Arc::new(RemoteControlState::default());
    let remote_state_setup = remote_state.clone();

    tauri::Builder::default()
        .manage(task_manager)
        .manage(remote_state)
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            #[cfg(desktop)]
            {
                start_browser_bridge(_app.handle().clone());
                start_remote_control_server(_app.handle().clone(), remote_state_setup);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            probe_url,
            set_global_speed_limit,
            get_default_download_directory,
            prepare_download_file,
            cancel_task,
            cleanup_task,
            download_segment,
            verify_file_sha256,
            open_destination_folder,
            open_file_item,
            delete_file_item,
            open_browser_extension_dir,
            get_remote_server_info,
            update_remote_snapshot,
            system_shutdown
        ])
        .run(tauri::generate_context!())
        .expect("error while running otium downloader application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename_traversal() {
        assert_eq!(sanitize_filename("../../etc/passwd"), "passwd");
        assert_eq!(sanitize_filename("..\\..\\Windows\\System32\\cmd.exe"), "cmd.exe");
        assert_eq!(sanitize_filename("/var/log/syslog"), "syslog");
        assert_eq!(sanitize_filename(".."), "download");
        assert_eq!(sanitize_filename("."), "download");
    }

    #[test]
    fn test_sanitize_filename_reserved_windows() {
        assert_eq!(sanitize_filename("CON.txt"), "_CON.txt");
        assert_eq!(sanitize_filename("prn.zip"), "_prn.zip");
        assert_eq!(sanitize_filename("aux.tar.gz"), "_aux.tar.gz");
        assert_eq!(sanitize_filename("nul.dat"), "_nul.dat");
        assert_eq!(sanitize_filename("com1.bin"), "_com1.bin");
        assert_eq!(sanitize_filename("lpt3.log"), "_lpt3.log");
        assert_eq!(sanitize_filename("normal_file.txt"), "normal_file.txt");
    }

    #[test]
    fn test_sanitize_filename_illegal_chars() {
        assert_eq!(
            sanitize_filename("report:2026*final?.pdf"),
            "report_2026_final_.pdf"
        );
        assert_eq!(
            sanitize_filename("bad\"pipe\"|redir>.txt"),
            "bad_pipe__redir_.txt"
        );
    }

    #[test]
    fn test_sanitize_filename_fallback() {
        assert_eq!(sanitize_filename(""), "download");
        assert_eq!(sanitize_filename("   "), "download");
        assert_eq!(sanitize_filename("...."), "download");
    }

    #[test]
    fn test_percent_decode() {
        assert_eq!(percent_decode("hello%20world"), "hello world");
        assert_eq!(
            percent_decode("%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9.zip"),
            "العربية.zip"
        );
        // Malformed inputs should not panic
        assert_eq!(percent_decode("broken%2"), "broken%2");
        assert_eq!(percent_decode("broken%"), "broken%");
        assert_eq!(percent_decode("broken%ZZ"), "broken%ZZ");
    }

    #[test]
    fn test_parse_content_disposition_filename() {
        let rfc5987 = "attachment; filename*=UTF-8''%D8%AA%D9%82%D8%B1%D9%8A%D8%B1.pdf";
        assert_eq!(
            parse_content_disposition_filename(rfc5987),
            Some("تقرير.pdf".to_string())
        );

        let quoted = "attachment; filename=\"my_archive.tar.gz\"; size=1024";
        assert_eq!(
            parse_content_disposition_filename(quoted),
            Some("my_archive.tar.gz".to_string())
        );

        let unquoted = "attachment; filename=setup.exe";
        assert_eq!(
            parse_content_disposition_filename(unquoted),
            Some("setup.exe".to_string())
        );

        let traversal = "attachment; filename=\"../../danger.sh\"";
        assert_eq!(
            parse_content_disposition_filename(traversal),
            Some("danger.sh".to_string())
        );

        let none = "inline; size=4096";
        assert_eq!(parse_content_disposition_filename(none), None);
    }

    #[tokio::test]
    async fn test_task_manager_lifecycle() {
        let tm = TaskManager::default();

        // Speed limit
        assert_eq!(tm.get_speed_limit(), 0);
        tm.set_speed_limit(1_048_576);
        assert_eq!(tm.get_speed_limit(), 1_048_576);

        // Tokens
        let t1 = tm.get_or_create_token("t1").await;
        assert!(!t1.load(Ordering::Relaxed));

        // Cancellation
        tm.cancel("t1").await;
        assert!(t1.load(Ordering::Relaxed));

        // Re-acquiring a cancelled token creates a fresh uncancelled one
        let t1_fresh = tm.get_or_create_token("t1").await;
        assert!(!t1_fresh.load(Ordering::Relaxed));

        // Cleanup
        tm.remove("t1").await;
        let map = tm.cancellations.read().await;
        assert!(!map.contains_key("t1"));
    }

    #[test]
    fn test_browser_payload_deserialization() {
        let json = r#"{"url":"https://example.com/app.exe","filename":"app.exe","headers":{"Referer":"https://example.com/"}}"#;
        let payload: Result<BrowserDownloadPayload, _> = serde_json::from_str(json);
        assert!(payload.is_ok());
        let p = payload.unwrap();
        assert_eq!(p.url, "https://example.com/app.exe");
        assert_eq!(p.filename, Some("app.exe".to_string()));
        assert_eq!(p.headers.unwrap().get("Referer").unwrap(), "https://example.com/");
    }

    #[test]
    fn test_browser_payload_protocol_validation() {
        let valid_http = "http://example.com/file.zip";
        let valid_https = "https://example.com/file.zip";
        let valid_magnet = "magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335de7ec72523ad";
        let invalid_file = "file:///etc/passwd";
        let invalid_script = "javascript:alert(1)";

        let is_valid = |url: &str| {
            let u = url.trim();
            u.starts_with("http://") || u.starts_with("https://") || u.starts_with("magnet:?")
        };

        assert!(is_valid(valid_http));
        assert!(is_valid(valid_https));
        assert!(is_valid(valid_magnet));
        assert!(!is_valid(invalid_file));
        assert!(!is_valid(invalid_script));
    }
}
