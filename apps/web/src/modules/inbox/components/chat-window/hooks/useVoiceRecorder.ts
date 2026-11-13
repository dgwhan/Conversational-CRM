import { useCallback, useEffect, useRef, useState } from 'react';
import { notify } from '../../../../../components/feedback/toastEmitter.js';

/** Thời lượng ghi âm tối đa (giây) — tin nhắn thoại ngắn, tránh tệp quá lớn */
export const MAX_VOICE_SECONDS = 120;

/** Ưu tiên AAC/MP4 (Messenger, Zalo phát tốt), không có thì Opus/WebM */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t));
}

/**
 * Ghi âm tin nhắn thoại bằng micro của trình duyệt (MediaRecorder).
 * Kết thúc trả về File (m4a hoặc webm) để tải lên như một tệp AUDIO.
 */
export function useVoiceRecorder(onRecorded: (file: File) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cancelled = useRef(false);
  const timer = useRef<number | null>(null);
  const stream = useRef<MediaStream | null>(null);

  const cleanup = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setIsRecording(false);
    setSeconds(0);
  };

  const stop = useCallback(() => {
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelled.current = true;
    stop();
  }, [stop]);

  const start = useCallback(async () => {
    const mimeType = pickMimeType();
    if (!navigator.mediaDevices?.getUserMedia || !mimeType) {
      notify.error('Trình duyệt không hỗ trợ ghi âm.');
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      notify.error('Không truy cập được micro. Hãy cho phép quyền micro cho trang này.');
      return;
    }
    chunks.current = [];
    cancelled.current = false;
    const rec = new MediaRecorder(stream.current, { mimeType, audioBitsPerSecond: 64_000 });
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
    rec.onstop = () => {
      const wasCancelled = cancelled.current;
      cleanup();
      if (wasCancelled || chunks.current.length === 0) return;
      const isMp4 = mimeType.startsWith('audio/mp4');
      const blob = new Blob(chunks.current, { type: isMp4 ? 'audio/mp4' : 'audio/webm' });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      onRecorded(new File([blob], `ghi-am-${stamp}.${isMp4 ? 'm4a' : 'webm'}`, { type: blob.type }));
    };
    rec.start(1000);
    recorder.current = rec;
    setIsRecording(true);
    const startedAt = Date.now();
    timer.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_VOICE_SECONDS) rec.stop();
    }, 250);
  }, [onRecorded]);

  useEffect(() => () => {
    cancelled.current = true;
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  return { isRecording, seconds, start, stop, cancel };
}
