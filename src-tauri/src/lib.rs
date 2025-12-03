use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs;
use std::io::Write;

#[derive(Debug, Deserialize)]
pub struct Segment {
    start: f64,
    end: f64,
}

#[derive(Debug, Serialize)]
pub struct ExportResult {
    success: bool,
    message: String,
}

// FFmpeg'in yüklü olup olmadığını kontrol et
fn check_ffmpeg() -> bool {
    Command::new("ffmpeg")
        .arg("-version")
        .output()
        .is_ok()
}

// Zamanı FFmpeg formatına çevir (HH:MM:SS.mmm)
fn format_time(seconds: f64) -> String {
    let hours = (seconds / 3600.0).floor() as i32;
    let minutes = ((seconds % 3600.0) / 60.0).floor() as i32;
    let secs = seconds % 60.0;
    format!("{:02}:{:02}:{:06.3}", hours, minutes, secs)
}

#[tauri::command]
async fn export_video(
    input_path: String,
    output_path: String,
    segments: Vec<Segment>,
) -> Result<ExportResult, String> {
    // FFmpeg kontrolü
    if !check_ffmpeg() {
        return Err("FFmpeg bulunamadı! Lütfen FFmpeg'i yükleyin ve PATH'e ekleyin.".to_string());
    }

    if segments.is_empty() {
        return Err("En az bir kesim bölgesi seçmelisiniz.".to_string());
    }

    // Geçici dosya dizini
    let temp_dir = std::env::temp_dir().join("video_cutter_temp");
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let mut temp_files: Vec<String> = Vec::new();

    // Her segment için ayrı dosya oluştur
    for (i, segment) in segments.iter().enumerate() {
        let temp_output = temp_dir.join(format!("segment_{}.mp4", i));
        let temp_output_str = temp_output.to_string_lossy().to_string();

        let start_time = format_time(segment.start);
        let duration = segment.end - segment.start;

        let status = Command::new("ffmpeg")
            .args([
                "-y",
                "-i", &input_path,
                "-ss", &start_time,
                "-t", &duration.to_string(),
                "-c", "copy",
                "-avoid_negative_ts", "make_zero",
                &temp_output_str,
            ])
            .output()
            .map_err(|e| format!("FFmpeg çalıştırılamadı: {}", e))?;

        if !status.status.success() {
            // Temizlik
            for f in &temp_files {
                let _ = fs::remove_file(f);
            }
            let _ = fs::remove_dir_all(&temp_dir);
            
            let stderr = String::from_utf8_lossy(&status.stderr);
            return Err(format!("Segment {} kesilirken hata: {}", i + 1, stderr));
        }

        temp_files.push(temp_output_str);
    }

    // Tek segment varsa direkt kopyala
    if temp_files.len() == 1 {
        fs::copy(&temp_files[0], &output_path).map_err(|e| e.to_string())?;
    } else {
        // Birden fazla segment varsa birleştir
        let concat_file = temp_dir.join("concat_list.txt");
        let mut file = fs::File::create(&concat_file).map_err(|e| e.to_string())?;
        
        for temp_file in &temp_files {
            writeln!(file, "file '{}'", temp_file.replace('\\', "/"))
                .map_err(|e| e.to_string())?;
        }
        drop(file);

        let status = Command::new("ffmpeg")
            .args([
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", &concat_file.to_string_lossy(),
                "-c", "copy",
                &output_path,
            ])
            .output()
            .map_err(|e| format!("FFmpeg birleştirme hatası: {}", e))?;

        if !status.status.success() {
            let stderr = String::from_utf8_lossy(&status.stderr);
            return Err(format!("Videolar birleştirilirken hata: {}", stderr));
        }
    }

    // Temizlik
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![export_video])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
