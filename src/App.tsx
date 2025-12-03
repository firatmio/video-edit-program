import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { createSignal } from "solid-js";
import "./App.css";
import { CutList } from "./components/CutList";
import { Timeline } from "./components/Timeline";
import { VideoPlayer } from "./components/VideoPlayer";
import type { CutSegment, ExportStatus, VideoInfo } from "./types";
import { generateId } from "./utils";

function App() {
  const [videoInfo, setVideoInfo] = createSignal<VideoInfo | null>(null);
  const [videoSrc, setVideoSrc] = createSignal<string | null>(null);
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(0);
  const [segments, setSegments] = createSignal<CutSegment[]>([]);
  const [exportStatus, setExportStatus] = createSignal<ExportStatus>('idle');
  const [exportProgress, setExportProgress] = createSignal(0);
  
  let videoRef: HTMLVideoElement | null = null;

  const handleVideoRef = (ref: HTMLVideoElement) => {
    videoRef = ref;
  };

  const openVideo = async () => {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Video',
        extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv']
      }]
    });

    if (selected) {
      const path = selected as string;
      const name = path.split('\\').pop() || path.split('/').pop() || 'video';
      
      setVideoInfo({ path, name, duration: 0 });
      setVideoSrc(convertFileSrc(path));
      setSegments([]);
      setCurrentTime(0);
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleDurationChange = (dur: number) => {
    setDuration(dur);
    if (videoInfo()) {
      setVideoInfo({ ...videoInfo()!, duration: dur });
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef) {
      videoRef.currentTime = time;
    }
  };

  const addSegment = () => {
    const newSegment: CutSegment = {
      id: generateId(),
      startTime: currentTime(),
      endTime: Math.min(currentTime() + 10, duration())
    };
    setSegments([...segments(), newSegment]);
  };

  const removeSegment = (id: string) => {
    setSegments(segments().filter(s => s.id !== id));
  };

  const updateSegment = (id: string, startTime: number, endTime: number) => {
    setSegments(segments().map(s => 
      s.id === id ? { ...s, startTime, endTime } : s
    ));
  };

  const setSegmentStart = (id: string) => {
    const segment = segments().find(s => s.id === id);
    if (segment && currentTime() < segment.endTime) {
      updateSegment(id, currentTime(), segment.endTime);
    }
  };

  const setSegmentEnd = (id: string) => {
    const segment = segments().find(s => s.id === id);
    if (segment && currentTime() > segment.startTime) {
      updateSegment(id, segment.startTime, currentTime());
    }
  };

  const jumpToSegment = (segment: CutSegment) => {
    handleSeek(segment.startTime);
  };

  const exportVideo = async () => {
    if (!videoInfo() || segments().length === 0) return;

    const outputPath = await save({
      filters: [{
        name: 'Video',
        extensions: ['mp4']
      }],
      defaultPath: `${videoInfo()!.name.replace(/\.[^/.]+$/, '')}_cut.mp4`
    });

    if (!outputPath) return;

    setExportStatus('processing');
    setExportProgress(0);

    try {
      const segmentData = segments().map(s => ({
        start: s.startTime,
        end: s.endTime
      }));

      await invoke('export_video', {
        inputPath: videoInfo()!.path,
        outputPath,
        segments: segmentData
      });

      setExportStatus('done');
      setExportProgress(100);
      
      setTimeout(() => {
        setExportStatus('idle');
        setExportProgress(0);
      }, 3000);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
      setTimeout(() => {
        setExportStatus('idle');
      }, 3000);
    }
  };

  return (
    <main class="app">
      <header class="app-header">
        <h1>🎬 Video Kesici</h1>
        <div class="header-actions">
          <button class="header-btn" onClick={openVideo}>
            📂 Video Aç
          </button>
          <button 
            class="header-btn export-btn" 
            onClick={exportVideo}
            disabled={!videoInfo() || segments().length === 0 || exportStatus() === 'processing'}
          >
            {exportStatus() === 'processing' ? '⏳ İşleniyor...' : 
             exportStatus() === 'done' ? '✅ Tamamlandı!' :
             exportStatus() === 'error' ? '❌ Hata!' : '💾 Dışa Aktar'}
          </button>
        </div>
      </header>

      <div class="main-content">
        <div class="video-section">
          <div class="video-wrapper" onClick={() => !videoSrc() && openVideo()}>
            <VideoPlayer
              src={videoSrc()}
              currentTime={currentTime()}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              onVideoRef={handleVideoRef}
            />
          </div>
          
          <Timeline
            duration={duration()}
            currentTime={currentTime()}
            segments={segments()}
            onSeek={handleSeek}
            onSegmentUpdate={updateSegment}
          />
        </div>

        <aside class="sidebar">
          <CutList
            segments={segments()}
            currentTime={currentTime()}
            duration={duration()}
            onAddSegment={addSegment}
            onRemoveSegment={removeSegment}
            onSetStart={setSegmentStart}
            onSetEnd={setSegmentEnd}
            onJumpToSegment={jumpToSegment}
          />
        </aside>
      </div>

      {exportStatus() === 'processing' && (
        <div class="export-overlay">
          <div class="export-modal">
            <div class="spinner"></div>
            <p>Video işleniyor...</p>
            <p class="export-hint">Bu işlem biraz zaman alabilir</p>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
