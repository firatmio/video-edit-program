// Video kesim bölgesi tipi
export interface CutSegment {
  id: string;
  startTime: number; // saniye
  endTime: number;   // saniye
}

// Video bilgisi
export interface VideoInfo {
  path: string;
  name: string;
  duration: number; // saniye
}

// Export durumu
export type ExportStatus = 'idle' | 'processing' | 'done' | 'error';