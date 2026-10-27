use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::SeekFrom;
use std::path::Path;
use tauri::{AppHandle, Emitter};
use tokio::fs::OpenOptions;
use tokio::io::{AsyncSeekExt, AsyncWriteExt};

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
async fn probe_url(url: String) -> Result<UrlProbeResult, String> {
    let client = reqwest::Client::builder()
        .user_agent("OtiumDownloader/1.0 (+https://github.com/XRTM8/Otium-Downloader)")
        .build()
        .map_err(|e| e.to_string())?;

    // Try HEAD request first
    let response = match client.head(&url).send().await {
        Ok(res) if res.status().is_success() => res,
        _ => {
            // Fallback: GET with Range 0-0
            client
                .get(&url)
                .header(reqwest::header::RANGE, "bytes=0-0")
                .send()
                .await
                .map_err(|e| e.to_string())?
        }
    };

    let headers = response.headers();

    let accept_ranges = headers
        .get(reqwest::header::ACCEPT_RANGES)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.to_ascii_lowercase().contains("bytes"))
        .unwrap_or(false)
        || headers.contains_key(reqwest::header::CONTENT_RANGE);

    let content_length = if let Some(cr) = headers.get(reqwest::header::CONTENT_RANGE) {
        // e.g. "bytes 0-0/10485760"
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

    let suggested_filename = headers
        .get(reqwest::header::CONTENT_DISPOSITION)
        .and_then(|v| v.to_str().ok())
        .and_then(|cd| {
            if let Some(pos) = cd.find("filename=") {
                let name = &cd[pos + 9..].trim_matches(|c| c == '"' || c == ';');
                Some(name.to_string())
            } else {
                None
            }
        });

    Ok(UrlProbeResult {
        content_length,
        accept_ranges,
        content_type,
        suggested_filename,
    })
}

#[tauri::command]
async fn download_segment(
    app: AppHandle,
    task_id: String,
    url: String,
    destination_path: String,
    start_byte: u64,
    end_byte: u64,
    segment_index: u32,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("OtiumDownloader/1.0 (+https://github.com/XRTM8/Otium-Downloader)")
        .build()
        .map_err(|e| e.to_string())?;

    let range_header = format!("bytes={}-{}", start_byte, end_byte);
    let response = client
        .get(&url)
        .header(reqwest::header::RANGE, range_header)
        .send()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    if !response.status().is_success() && response.status() != reqwest::StatusCode::PARTIAL_CONTENT {
        return Err(format!("Server returned HTTP {}", response.status()));
    }

    let total_segment_bytes = end_byte.saturating_sub(start_byte) + 1;

    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .open(&destination_path)
        .await
        .map_err(|e| format!("Failed to open destination: {}", e))?;

    file.seek(SeekFrom::Start(start_byte))
        .await
        .map_err(|e| format!("Failed to seek offset: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut downloaded = 0u64;

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Disk write error: {}", e))?;

        let delta = chunk.len() as u64;
        downloaded += delta;

        let _ = app.emit(
            "download-progress",
            SegmentProgressEvent {
                task_id: task_id.clone(),
                segment_index,
                delta_bytes: delta,
                downloaded_bytes: downloaded,
                total_bytes: total_segment_bytes,
                is_finished: false,
            },
        );
    }

    file.flush()
        .await
        .map_err(|e| format!("Flush error: {}", e))?;

    let _ = app.emit(
        "download-progress",
        SegmentProgressEvent {
            task_id,
            segment_index,
            delta_bytes: 0,
            downloaded_bytes: downloaded,
            total_bytes: total_segment_bytes,
            is_finished: true,
        },
    );

    Ok(())
}

#[tauri::command]
async fn verify_file_sha256(file_path: String) -> Result<String, String> {
    let mut file = tokio::fs::File::open(&file_path)
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
async fn open_destination_folder(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    let folder = if path.is_file() {
        path.parent().unwrap_or(path)
    } else {
        path
    };

    #[cfg(target_os = "windows")]
    {
        tokio::process::Command::new("explorer")
            .arg(folder)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        tokio::process::Command::new("open")
            .arg(folder)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        tokio::process::Command::new("xdg-open")
            .arg(folder)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            probe_url,
            download_segment,
            verify_file_sha256,
            open_destination_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running otium downloader application");
}
