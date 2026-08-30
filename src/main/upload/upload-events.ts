import { EventEmitter } from 'node:events';

/**
 * Typed upload progress events for IPC relay to the renderer.
 */
export interface UploadProgressEvent {
  uploadId: string;
  sessionId: string;
  fileName: string;
  uploadedBytes: number;
  totalBytes: number;
}

export interface UploadCompleteEvent {
  uploadId: string;
  sessionId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
}

// Singleton event emitter for upload events
let emitter: EventEmitter | null = null;

export function getUploadProgressEmitter(): EventEmitter {
  if (!emitter) {
    emitter = new EventEmitter();
    emitter.setMaxListeners(20);
  }
  return emitter;
}
