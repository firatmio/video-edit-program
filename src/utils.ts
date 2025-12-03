export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop() || '';
}

export function getFileNameWithoutExtension(filename: string): string {
  const parts = filename.split('.');
  parts.pop();
  return parts.join('.');
}
