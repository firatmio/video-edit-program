import { createEffect, createSignal, onMount } from "solid-js";

interface VideoPlayerProps {
  src: string | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onVideoRef: (ref: HTMLVideoElement) => void;
}

export function VideoPlayer(props: VideoPlayerProps) {
  let videoRef: HTMLVideoElement | undefined;
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [volume, setVolume] = createSignal(1);
  const [playbackRate, setPlaybackRate] = createSignal(1);

  onMount(() => {
    if (videoRef) {
      props.onVideoRef(videoRef);
    }
  });

  createEffect(() => {
    if (videoRef && Math.abs(videoRef.currentTime - props.currentTime) > 0.5) {
      videoRef.currentTime = props.currentTime;
    }
  });

  const handleTimeUpdate = () => {
    if (videoRef) {
      props.onTimeUpdate(videoRef.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef) {
      props.onDurationChange(videoRef.duration);
    }
  };

  const togglePlay = () => {
    if (videoRef) {
      if (isPlaying()) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsPlaying(!isPlaying());
    }
  };

  const handleVolumeChange = (e: Event) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    setVolume(value);
    if (videoRef) videoRef.volume = value;
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef) videoRef.playbackRate = rate;
  };

  const skipTime = (seconds: number) => {
    if (videoRef) {
      videoRef.currentTime = Math.max(0, Math.min(videoRef.duration, videoRef.currentTime + seconds));
    }
  };

  const frameStep = (forward: boolean) => {
    if (videoRef) {
      // 30fps varsayımıyla 1 frame = ~0.033 saniye
      const frameTime = 1 / 30;
      videoRef.currentTime += forward ? frameTime : -frameTime;
    }
  };

  return (
    <div class="video-player">
      {props.src ? (
        <>
          <video
            ref={videoRef}
            src={props.src}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={togglePlay}
          />
          <div class="video-controls">
            <div class="controls-left">
              <button class="control-btn" onClick={() => skipTime(-10)} title="10 saniye geri">
                ⏪
              </button>
              <button class="control-btn" onClick={() => frameStep(false)} title="1 frame geri">
                ◀
              </button>
              <button class="control-btn play-btn" onClick={togglePlay}>
                {isPlaying() ? "⏸" : "▶"}
              </button>
              <button class="control-btn" onClick={() => frameStep(true)} title="1 frame ileri">
                ▶
              </button>
              <button class="control-btn" onClick={() => skipTime(10)} title="10 saniye ileri">
                ⏩
              </button>
            </div>
            
            <div class="controls-center">
              <div class="speed-controls">
                {[0.25, 0.5, 1, 1.5, 2].map((rate) => (
                  <button
                    class={`speed-btn ${playbackRate() === rate ? 'active' : ''}`}
                    onClick={() => handlePlaybackRateChange(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <div class="controls-right">
              <span class="volume-icon">🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume()}
                onInput={handleVolumeChange}
                class="volume-slider"
              />
            </div>
          </div>
        </>
      ) : (
        <div class="video-placeholder">
          <div class="placeholder-content">
            <span class="placeholder-icon">🎬</span>
            <p>Video yüklemek için tıklayın</p>
          </div>
        </div>
      )}
    </div>
  );
}
