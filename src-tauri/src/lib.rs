use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::process::Command;
use tauri::Manager;

#[derive(Debug, Deserialize, Clone)]
pub struct Segment {
    start: f64,
    end: f64,
}

#[derive(Debug, Serialize)]
pub struct ExportResult {
    success: bool,
    message: String,
}

fn get_ffmpeg_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let sidecar_path = app_handle
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("binaries")
        .join(if cfg!(target_os = "windows") {
            "ffmpeg-x86_64-pc-windows-msvc.exe"
        } else if cfg!(target_os = "macos") {
            "ffmpeg-x86_64-apple-darwin"
        } else {
            "ffmpeg-x86_64-unknown-linux-gnu"
        });

    if sidecar_path.exists() {
        return Ok(sidecar_path);
    }

    if Command::new("ffmpeg").arg("-version").output().is_ok() {
        return Ok(std::path::PathBuf::from("ffmpeg"));
    }

    Err("FFmpeg bulunamadı!".to_string())
}

fn format_time(seconds: f64) -> String {
    let hours = (seconds / 3600.0).floor() as i32;
    let minutes = ((seconds % 3600.0) / 60.0).floor() as i32;
    let secs = seconds % 60.0;
    format!("{:02}:{:02}:{:06.3}", hours, minutes, secs)
}

#[tauri::command]
async fn export_video(
    app_handle: tauri::AppHandle,
    input_path: String,
    output_path: String,
    segments: Vec<Segment>,
    merge: bool,
) -> Result<ExportResult, String> {
    let ffmpeg_path = get_ffmpeg_path(&app_handle)?;

    if segments.is_empty() {
        return Err("En az bir kesim bölgesi seçmelisiniz.".to_string());
    }

    let mut sorted_segments = segments.clone();
    sorted_segments.sort_by(|a, b| a.start.partial_cmp(&b.start).unwrap());

    let temp_dir = std::env::temp_dir().join("video_cutter_temp");
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let mut temp_files: Vec<String> = Vec::new();

    for (i, segment) in sorted_segments.iter().enumerate() {
        let temp_output = temp_dir.join(format!("segment_{}.mp4", i));
        let temp_output_str = temp_output.to_string_lossy().to_string();

        let start_time = format_time(segment.start);
        let duration = segment.end - segment.start;

        let status = Command::new(&ffmpeg_path)
            .args([
                "-y",
                "-ss", &start_time,
                "-i", &input_path,
                "-t", &duration.to_string(),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "18",
                "-c:a", "aac",
                "-b:a", "192k",
                "-movflags", "+faststart",
                "-avoid_negative_ts", "make_zero",
                &temp_output_str,
            ])
            .output()
            .map_err(|e| format!("FFmpeg çalıştırılamadı: {}", e))?;

        if !status.status.success() {
            for f in &temp_files {
                let _ = fs::remove_file(f);
            }
            let _ = fs::remove_dir_all(&temp_dir);

            let stderr = String::from_utf8_lossy(&status.stderr);
            return Err(format!("Segment {} kesilirken hata: {}", i + 1, stderr));
        }

        temp_files.push(temp_output_str);
    }

    if merge {
        if temp_files.len() == 1 {
            fs::copy(&temp_files[0], &output_path).map_err(|e| e.to_string())?;
        } else {
            let concat_file = temp_dir.join("concat_list.txt");
            let mut file = fs::File::create(&concat_file).map_err(|e| e.to_string())?;

            for temp_file in &temp_files {
                writeln!(file, "file '{}'", temp_file.replace('\\', "/"))
                    .map_err(|e| e.to_string())?;
            }
            drop(file);

            let status = Command::new(&ffmpeg_path)
                .args([
                    "-y",
                    "-f", "concat",
                    "-safe", "0",
                    "-i", &concat_file.to_string_lossy(),
                    "-c", "copy",
                    "-movflags", "+faststart",
                    &output_path,
                ])
                .output()
                .map_err(|e| format!("FFmpeg birleştirme hatası: {}", e))?;

            if !status.status.success() {
                let stderr = String::from_utf8_lossy(&status.stderr);
                return Err(format!("Videolar birleştirilirken hata: {}", stderr));
            }
        }
    } else {
        let parts: Vec<&str> = output_path.split('|').collect();
        let output_dir = parts[0];
        
        for (i, temp_file) in temp_files.iter().enumerate() {
            let file_name = if i + 1 < parts.len() {
                parts[i + 1].to_string()
            } else {
                format!("video_{}.mp4", i + 1)
            };
            let final_path = std::path::Path::new(output_dir).join(&file_name);
            fs::copy(temp_file, &final_path).map_err(|e| e.to_string())?;
        }
    }

    for f in &temp_files {
        let _ = fs::remove_file(f);
    }
    let _ = fs::remove_dir_all(&temp_dir);

    Ok(ExportResult {
        success: true,
        message: "Video başarıyla dışa aktarıldı!".to_string(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![export_video])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
