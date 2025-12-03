import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Check,
  Download,
  Film,
  FolderOpen,
  Loader2,
  Minus,
  Square,
  Upload,
  X
} from "lucide-solid";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import "./App.css";
import { CutList } from "./components/CutList";
import { Timeline } from "./components/Timeline";
import { VideoPlayer } from "./components/VideoPlayer";
import type { CutSegment, ExportStatus, VideoInfo } from "./types";
import { formatTime, generateId } from "./utils";

function App() {
  const [videoInfo, setVideoInfo] = createSignal<VideoInfo | null>(null);
  const [videoSrc, setVideoSrc] = createSignal<string | null>(null);
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(0);
  const [segments, setSegments] = createSignal<CutSegment[]>([]);
  const [exportStatus, setExportStatus] = createSignal<ExportStatus>('idle');
  const [isDragOver, setIsDragOver] = createSignal(false);
  
  const [showExportModal, setShowExportModal] = createSignal(false);
  const [exportMode, setExportMode] = createSignal<'merge' | 'separate'>('merge');
  const [baseName, setBaseName] = createSignal('video');
  const [segmentNames, setSegmentNames] = createSignal<string[]>([]);
  const [outputFolder, setOutputFolder] = createSignal<string>('');

  let videoRef: HTMLVideoElement | null = null;
  const appWindow = getCurrentWindow();

  const handleVideoRef = (ref: HTMLVideoElement) => {
    videoRef = ref;
  };

  const minimizeWindow = () => appWindow.minimize();
  const toggleMaximize = () => appWindow.toggleMaximize();
  const closeWindow = () => appWindow.close();

  const loadVideo = (path: string) => {
    const name = path.split('\\').pop() || path.split('/').pop() || 'video';
    setVideoInfo({ path, name, duration: 0 });
    setVideoSrc(convertFileSrc(path));
    setSegments([]);
    setCurrentTime(0);
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
      loadVideo(selected as string);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv'];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (videoExtensions.includes(ext)) {
        const path = (file as any).path || file.name;
        if (path && path.includes('\\') || path.includes('/')) {
          loadVideo(path);
        }
      }
    }
  };

  onMount(() => {
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
    
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.remove();
      }, 300);
    }
  });

  onCleanup(() => {
    document.removeEventListener('dragover', handleDragOver);
    document.removeEventListener('dragleave', handleDragLeave);
    document.removeEventListener('drop', handleDrop);
  });

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

  const openExportModal = () => {
    if (!videoInfo() || segments().length === 0) return;
    
    const videoName = videoInfo()!.name.replace(/\.[^/.]+$/, '');
    setBaseName(videoName  + "_edited");
    
    const names = segments().map((_, i) => `${videoName}_${i + 1}`);
    setSegmentNames(names);
    
    const videoPath = videoInfo()!.path;
    const folder = videoPath.substring(0, videoPath.lastIndexOf('\\')) || videoPath.substring(0, videoPath.lastIndexOf('/'));
    setOutputFolder(folder);
    
    setExportMode(segments().length > 1 ? 'merge' : 'merge');
    setShowExportModal(true);
  };

  const selectOutputFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      setOutputFolder(selected as string);
    }
  };

  const exportVideo = async () => {
    if (!videoInfo() || segments().length === 0 || !outputFolder()) return;

    setShowExportModal(false);
    setExportStatus('processing');

    try {
      const segmentData = segments().map(s => ({
        start: s.startTime,
        end: s.endTime
      }));

      let outputPath: string;
      
      if (exportMode() === 'merge') {
        outputPath = `${outputFolder()}\\${baseName()}.mp4`;
      } else {
        const fileNames = segmentNames().map(name => `${name}.mp4`);
        outputPath = `${outputFolder()}|${fileNames.join('|')}`;
      }

      await invoke('export_video', {
        inputPath: videoInfo()!.path,
        outputPath,
        segments: segmentData,
        merge: exportMode() === 'merge'
      });

      setExportStatus('done');

      setTimeout(() => {
        setExportStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
      setTimeout(() => {
        setExportStatus('idle');
      }, 3000);
    }
  };

  const updateSegmentName = (index: number, name: string) => {
    const names = [...segmentNames()];
    names[index] = name;
    setSegmentNames(names);
  };

  return (
    <main class={`app ${isDragOver() ? 'drag-over' : ''}`}>
      {isDragOver() && (
        <div class="drag-overlay">
          <div class="drag-content">
            <Upload size={64} />
            <p>Videoyu buraya bırakın</p>
          </div>
        </div>
      )}

      <div class="titlebar" data-tauri-drag-region>
        <div class="titlebar-left">
          <div class="titlebar-title" data-tauri-drag-region>
            <Film size={18} />
            <span>Video Kesici</span>
          </div>
        </div>
        
        <div class="titlebar-center">
          <button class="titlebar-btn" onClick={openVideo}>
            <FolderOpen size={16} /> Video Aç
          </button>
          <button
            class="titlebar-btn export"
            onClick={openExportModal}
            disabled={!videoInfo() || segments().length === 0 || exportStatus() === 'processing'}
          >
            {exportStatus() === 'processing' ? <><Loader2 size={16} class="spin" /> İşleniyor...</> :
              exportStatus() === 'done' ? <><Check size={16} /> Tamamlandı!</> :
                exportStatus() === 'error' ? <><X size={16} /> Hata!</> : <><Download size={16} /> Dışa Aktar</>}
          </button>
        </div>

        <div class="titlebar-right">
          <button class="window-control" onClick={minimizeWindow}>
            <Minus size={16} />
          </button>
          <button class="window-control" onClick={toggleMaximize}>
            <Square size={14} />
          </button>
          <button class="window-control close" onClick={closeWindow}>
            <X size={16} />
          </button>
        </div>
      </div>

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

          {videoSrc() && (
            <Timeline
              duration={duration()}
              currentTime={currentTime()}
              segments={segments()}
              videoElement={videoRef}
              onSeek={handleSeek}
              onSegmentUpdate={updateSegment}
            />
          )}
        </div>

        {videoSrc() && (
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
        )}
      </div>

      {exportStatus() === 'processing' && (
        <div class="export-overlay">
          <div class="export-modal processing">
            <div class="spinner"></div>
            <p>Video işleniyor...</p>
            <p class="export-hint">Bu işlem biraz zaman alabilir</p>
          </div>
        </div>
      )}

      <Show when={showExportModal()}>
        <div class="export-overlay" onClick={() => setShowExportModal(false)}>
          <div class="export-modal settings" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h2><Download size={20} /> Dışa Aktar</h2>
              <button class="modal-close" onClick={() => setShowExportModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Kayıt Klasörü</label>
                <div class="folder-input">
                  <input 
                    type="text" 
                    value={outputFolder()} 
                    onInput={(e) => setOutputFolder(e.currentTarget.value)}
                    placeholder="Klasör seçin..."
                  />
                  <button onClick={selectOutputFolder}>
                    <FolderOpen size={16} />
                  </button>
                </div>
              </div>

              <Show when={segments().length > 1}>
                <div class="form-group">
                  <label>Kesim Birleştirme</label>
                  <div class="radio-group">
                    <label class={`radio-option ${exportMode() === 'merge' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="exportMode" 
                        checked={exportMode() === 'merge'}
                        onChange={() => setExportMode('merge')}
                      />
                      <span>Birleştir (Tek dosya)</span>
                    </label>
                    <label class={`radio-option ${exportMode() === 'separate' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="exportMode" 
                        checked={exportMode() === 'separate'}
                        onChange={() => setExportMode('separate')}
                      />
                      <span>Ayrı Ayrı ({segments().length} dosya)</span>
                    </label>
                  </div>
                </div>
              </Show>

              <Show when={exportMode() === 'merge' || segments().length === 1}>
                <div class="form-group">
                  <label>Dosya Adı</label>
                  <div class="name-input">
                    <input 
                      type="text" 
                      value={baseName()} 
                      onInput={(e) => setBaseName(e.currentTarget.value)}
                      placeholder="video"
                    />
                    <span class="extension">.mp4</span>
                  </div>
                </div>
              </Show>

              <Show when={exportMode() === 'separate' && segments().length > 1}>
                <div class="form-group">
                  <label>Dosya Adları</label>
                  <div class="segment-names">
                    <For each={segments()}>
                      {(segment, i) => (
                        <div class="segment-name-row">
                          <span class="segment-label">Kesim {i() + 1}</span>
                          <span class="segment-time">({formatTime(segment.startTime)} - {formatTime(segment.endTime)})</span>
                          <div class="name-input">
                            <input 
                              type="text" 
                              value={segmentNames()[i()]} 
                              onInput={(e) => updateSegmentName(i(), e.currentTarget.value)}
                            />
                            <span class="extension">.mp4</span>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>

            <div class="modal-footer">
              <button class="btn-cancel" onClick={() => setShowExportModal(false)}>
                İptal
              </button>
              <button 
                class="btn-export" 
                onClick={exportVideo}
                disabled={!outputFolder()}
              >
                <Download size={16} /> Dışa Aktar
              </button>
            </div>
          </div>
        </div>
      </Show>
    </main>
  );
}

export default App;
