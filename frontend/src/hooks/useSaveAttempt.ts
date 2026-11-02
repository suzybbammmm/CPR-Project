import { useCallback, useRef, useState } from 'react';
import { saveAttempt } from '../api/attempts';
import type { AttemptPayload, SaveAttemptResult, SaveStatus } from '../types/exhibition.types';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export function useSaveAttempt() {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastResult, setLastResult] = useState<SaveAttemptResult | null>(null);
  const retryCount = useRef(0);
  const pendingPayload = useRef<AttemptPayload | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attemptSave = useCallback(async (payload: AttemptPayload) => {
    setStatus('saving');
    try {
      const result = await saveAttempt(payload);
      setLastResult(result);
      setStatus('saved');
      retryCount.current = 0;
      pendingPayload.current = null;
    } catch {
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current += 1;
        setStatus('retrying');
        retryTimer.current = setTimeout(() => {
          if (pendingPayload.current) attemptSave(pendingPayload.current);
        }, RETRY_DELAY_MS);
      } else {
        setStatus('failed');
      }
    }
  }, []);

  const save = useCallback((payload: AttemptPayload) => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryCount.current = 0;
    pendingPayload.current = payload;
    attemptSave(payload);
  }, [attemptSave]);

  const reset = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryCount.current = 0;
    pendingPayload.current = null;
    setStatus('idle');
    setLastResult(null);
  }, []);

  return { status, lastResult, save, reset };
}
