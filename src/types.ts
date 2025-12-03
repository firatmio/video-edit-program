export interface CutSegment {
  id: string;
  startTime: number;
  endTime: number;
}

export interface VideoInfo {
  path: string;
  name: string;
  duration: number;
}

export type ExportStatus = 'idle' | 'processing' | 'done' | 'error';