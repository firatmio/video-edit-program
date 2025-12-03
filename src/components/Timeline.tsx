import { For, createMemo } from "solid-js";
import type { CutSegment } from "../types";
import { formatTime } from "../utils";

interface TimelineProps {
  duration: number;
  currentTime: number;
  segments: CutSegment[];
  onSeek: (time: number) => void;
  onSegmentUpdate: (id: string, startTime: number, endTime: number) => void;
}

export function Timeline(props: TimelineProps) {
  let timelineRef: HTMLDivElement | undefined;

  const getPositionPercent = (time: number): number => {
    return props.duration > 0 ? (time / props.duration) * 100 : 0;
  };

  const getTimeFromPosition = (clientX: number): number => {
    if (!timelineRef || props.duration === 0) return 0;
    const rect = timelineRef.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percent * props.duration;
  };

  const handleTimelineClick = (e: MouseEvent) => {
    const time = getTimeFromPosition(e.clientX);
    props.onSeek(time);
  };

  const handleMarkerDrag = (segmentId: string, type: 'start' | 'end') => (e: MouseEvent) => {
    e.stopPropagation();
    const segment = props.segments.find(s => s.id === segmentId);
    if (!segment) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const time = getTimeFromPosition(moveEvent.clientX);
      if (type === 'start') {
        props.onSegmentUpdate(segmentId, Math.min(time, segment.endTime - 0.1), segment.endTime);
      } else {
        props.onSegmentUpdate(segmentId, segment.startTime, Math.max(time, segment.startTime + 0.1));
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Zaman işaretleri oluştur
  const timeMarkers = createMemo(() => {
    if (props.duration === 0) return [];
    const markers = [];
    const interval = props.duration > 300 ? 60 : props.duration > 60 ? 10 : 5;
    for (let t = 0; t <= props.duration; t += interval) {
      markers.push(t);
    }
    return markers;
  });

  return (
    <div class="timeline-container">
      <div class="timeline-time-display">
        <span>{formatTime(props.currentTime)}</span>
        <span>/</span>
        <span>{formatTime(props.duration)}</span>
      </div>
      
      <div class="timeline" ref={timelineRef} onClick={handleTimelineClick}>
        {/* Zaman işaretleri */}
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

        {/* Kesim bölgeleri */}
        <For each={props.segments}>
          {(segment) => (
            <div
              class="segment"
              style={{
                left: `${getPositionPercent(segment.startTime)}%`,
                width: `${getPositionPercent(segment.endTime - segment.startTime)}%`
              }}
            >
              <div 
                class="segment-handle start" 
                onMouseDown={handleMarkerDrag(segment.id, 'start')}
                title={formatTime(segment.startTime)}
              />
              <div 
                class="segment-handle end" 
                onMouseDown={handleMarkerDrag(segment.id, 'end')}
                title={formatTime(segment.endTime)}
              />
            </div>
          )}
        </For>

        {/* Oynatma kafası */}
        <div 
          class="playhead" 
          style={{ left: `${getPositionPercent(props.currentTime)}%` }}
        />
      </div>
    </div>
  );
}
