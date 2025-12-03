import { createEffect, createMemo, createSignal, For } from "solid-js";
import type { CutSegment } from "../types";
import { formatTime } from "../utils";

interface TimelineProps {
  duration: number;
  currentTime: number;
  segments: CutSegment[];
  videoElement: HTMLVideoElement | null;
  onSeek: (time: number) => void;
  onSegmentUpdate: (id: string, startTime: number, endTime: number) => void;
}

export function Timeline(props: TimelineProps) {
  let timelineRef: HTMLDivElement | undefined;
  let thumbnailsContainerRef: HTMLDivElement | undefined;
  
  const [isDraggingPlayhead, setIsDraggingPlayhead] = createSignal(false);
  const [isDraggingSegment, setIsDraggingSegment] = createSignal(false);
  const [zoom, setZoom] = createSignal(1);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [isPanning, setIsPanning] = createSignal(false);
  const [thumbnails, setThumbnails] = createSignal<string[]>([]);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = createSignal(false);

  const THUMBNAIL_WIDTH = 160;
  const THUMBNAIL_HEIGHT = 90;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 20;

  const getVisibleWidth = () => timelineRef?.clientWidth || 800;
  
  const getTotalWidth = () => getVisibleWidth() * zoom();
  
  const getMaxScroll = () => Math.max(0, getTotalWidth() - getVisibleWidth());

  const getTimeFromPosition = (clientX: number): number => {
    if (!timelineRef || props.duration === 0) return 0;
    const rect = timelineRef.getBoundingClientRect();
    const pixelPosition = clientX - rect.left + scrollOffset();
    const percent = Math.max(0, Math.min(1, pixelPosition / getTotalWidth()));
    return percent * props.duration;
  };

  const getPositionPercent = (time: number): number => {
    return props.duration > 0 ? (time / props.duration) * 100 : 0;
  };

  const generateThumbnails = async () => {
    if (!props.videoElement || props.duration === 0 || isGeneratingThumbnails()) return;
    
    const video = props.videoElement;
    if (video.readyState < 2) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (video.readyState < 2) return;
    }
    
    setIsGeneratingThumbnails(true);
    const canvas = document.createElement('canvas');
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsGeneratingThumbnails(false);
      return;
    }

    const visibleWidth = getVisibleWidth();
    const thumbnailCount = Math.max(Math.ceil(visibleWidth / THUMBNAIL_WIDTH) + 2, 5);
    const interval = props.duration / thumbnailCount;
    const newThumbnails: string[] = [];
    
    const originalTime = video.currentTime;
    const wasPlaying = !video.paused;
    if (wasPlaying) video.pause();
    
    for (let i = 0; i <= thumbnailCount; i++) {
      const time = Math.min(i * interval, props.duration - 0.1);
      
      try {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          }, 2000);
          
          const onSeeked = () => {
            clearTimeout(timeout);
            video.removeEventListener('seeked', onSeeked);
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              newThumbnails.push(canvas.toDataURL('image/jpeg', 0.6));
            } catch {
              newThumbnails.push('');
            }
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
          video.currentTime = time;
        });
      } catch {
        newThumbnails.push('');
      }
    }
    
    video.currentTime = originalTime;
    if (wasPlaying) video.play();
    
    setThumbnails(newThumbnails);
    setIsGeneratingThumbnails(false);
  };

  createEffect(() => {
    const video = props.videoElement;
    const dur = props.duration;
    
    if (video && dur > 0 && thumbnails().length === 0) {
      setTimeout(() => {
        generateThumbnails();
      }, 300);
    }
  });

  const handleTimelineClick = (e: MouseEvent) => {
    if (isDraggingSegment() || isPanning()) return;
    const time = getTimeFromPosition(e.clientX);
    props.onSeek(time);
  };

  const handleWheel = (e: WheelEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.5 : 0.5;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom() + delta));
      
      if (timelineRef) {
        const rect = timelineRef.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseTime = getTimeFromPosition(e.clientX);
        
        setZoom(newZoom);
        
        const newPixelPos = (mouseTime / props.duration) * getTotalWidth();
        const newScroll = Math.max(0, Math.min(getMaxScroll(), newPixelPos - mouseX));
        setScrollOffset(newScroll);
      }
    } else if (e.ctrlKey && zoom() > 1) {
      e.preventDefault();
      const scrollSpeed = 100;
      const delta = e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
      const newScroll = Math.max(0, Math.min(getMaxScroll(), scrollOffset() + delta));
      setScrollOffset(newScroll);
    }
  };

  const handlePanStart = (e: MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && zoom() > 1 && !isDraggingPlayhead() && !isDraggingSegment())) {
      const target = e.target as HTMLElement;
      if (target.closest('.playhead') || target.closest('.segment')) return;
      
      if (zoom() <= 1) return;
      
      e.preventDefault();
      setIsPanning(true);
      const startX = e.clientX;
      const startScroll = scrollOffset();

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX;
        const newScroll = Math.max(0, Math.min(getMaxScroll(), startScroll + delta));
        setScrollOffset(newScroll);
      };

      const onMouseUp = () => {
        setIsPanning(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }
  };

  const handlePlayheadDrag = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingPlayhead(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const time = getTimeFromPosition(moveEvent.clientX);
      props.onSeek(time);
    };

    const onMouseUp = () => {
      setIsDraggingPlayhead(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleMarkerDrag =
    (segmentId: string, type: "start" | "end") => (e: MouseEvent) => {
      e.stopPropagation();
      setIsDraggingSegment(true);
      const segment = props.segments.find((s) => s.id === segmentId);
      if (!segment) return;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const time = getTimeFromPosition(moveEvent.clientX);
        if (type === "start") {
          props.onSegmentUpdate(
            segmentId,
            Math.min(time, segment.endTime - 0.1),
            segment.endTime
          );
        } else {
          props.onSegmentUpdate(
            segmentId,
            segment.startTime,
            Math.max(time, segment.startTime + 0.1)
          );
        }
      };

      const onMouseUp = () => {
        setIsDraggingSegment(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

  const handleSegmentDrag = (segmentId: string) => (e: MouseEvent) => {
    e.stopPropagation();
    setIsDraggingSegment(true);
    const segment = props.segments.find((s) => s.id === segmentId);
    if (!segment) return;

    const segmentDuration = segment.endTime - segment.startTime;
    const startOffset = getTimeFromPosition(e.clientX) - segment.startTime;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentTime = getTimeFromPosition(moveEvent.clientX);
      let newStart = currentTime - startOffset;
      let newEnd = newStart + segmentDuration;

      if (newStart < 0) {
        newStart = 0;
        newEnd = segmentDuration;
      }
      if (newEnd > props.duration) {
        newEnd = props.duration;
        newStart = props.duration - segmentDuration;
      }

      props.onSegmentUpdate(segmentId, newStart, newEnd);
    };

    const onMouseUp = () => {
      setIsDraggingSegment(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const timeMarkers = createMemo(() => {
    if (props.duration === 0) return [];
    const markers = [];
    
    let interval: number;
    const effectiveZoom = zoom();
    
    if (effectiveZoom >= 10) {
      interval = 1;
    } else if (effectiveZoom >= 5) {
      interval = 2;
    } else if (effectiveZoom >= 3) {
      interval = 5;
    } else if (effectiveZoom >= 2) {
      interval = 10;
    } else if (props.duration > 300) {
      interval = 60;
    } else if (props.duration > 60) {
      interval = 10;
    } else {
      interval = 5;
    }
    
    for (let t = 0; t <= props.duration; t += interval) {
      markers.push(t);
    }
    return markers;
  });

  return (
    <div class="timeline-container">
      <div class="timeline-header">
        <div class="timeline-time-display">
          <span>{formatTime(props.currentTime)}</span>
          <span>/</span>
          <span>{formatTime(props.duration)}</span>
        </div>
        <div class="timeline-zoom-info">
          {zoom() > 1 && <span class="zoom-badge">{zoom().toFixed(1)}x</span>}
          <span class="zoom-hint">Shift+Scroll: Yakınlaştır | Ctrl+Scroll: Gezin</span>
        </div>
      </div>

      <div
        class={`timeline ${isDraggingPlayhead() || isDraggingSegment() ? "dragging" : ""} ${isPanning() ? "panning" : ""} ${zoom() > 1 ? "zoomed" : ""}`}
        ref={timelineRef}
        onClick={handleTimelineClick}
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
      >
        <div 
          class="timeline-thumbnails"
          ref={thumbnailsContainerRef}
          style={{
            width: `${zoom() * 100}%`,
            transform: `translateX(${-scrollOffset()}px)`
          }}
        >
          <For each={thumbnails()}>
            {(thumb) => (
              <div class="timeline-thumbnail">
                {thumb && <img src={thumb} alt="" />}
              </div>
            )}
          </For>
        </div>

        <div 
          class="timeline-content"
          style={{
            width: `${zoom() * 100}%`,
            transform: `translateX(${-scrollOffset()}px)`
          }}
        >
          <div class="timeline-markers">
            <For each={timeMarkers()}>
              {(time) => (
                <div
                  class="time-marker"
                  style={{ left: `${getPositionPercent(time)}%` }}
                >
                  <span class="time-marker-label">{formatTime(time)}</span>
                </div>
              )}
            </For>
          </div>

          <For each={props.segments}>
            {(segment) => (
              <div
                class="segment"
                style={{
                  left: `${getPositionPercent(segment.startTime)}%`,
                  width: `${getPositionPercent(segment.endTime - segment.startTime)}%`,
                }}
              >
                <div
                  class="segment-handle start"
                  onMouseDown={handleMarkerDrag(segment.id, "start")}
                  title={formatTime(segment.startTime)}
                />
                <div
                  class="segment-body"
                  onMouseDown={handleSegmentDrag(segment.id)}
                  title="Sürükleyerek taşı"
                />
                <div
                  class="segment-handle end"
                  onMouseDown={handleMarkerDrag(segment.id, "end")}
                  title={formatTime(segment.endTime)}
                />
              </div>
            )}
          </For>

          <div
            class={`playhead ${isDraggingPlayhead() ? "dragging" : ""}`}
            style={{ left: `${getPositionPercent(props.currentTime)}%` }}
            onMouseDown={handlePlayheadDrag}
          />
        </div>
      </div>
    </div>
  );
}
