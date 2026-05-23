import { useState, useEffect, useCallback } from 'react';

export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive || seconds === 0) return;

    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const start = useCallback(() => setIsActive(true), []);
  const pause = useCallback(() => setIsActive(false), []);
  const reset = useCallback(() => {
    setSeconds(initialSeconds);
    setIsActive(false);
  }, [initialSeconds]);

  const formatTime = useCallback((s: number) => {
    const minutes = Math.floor(s / 60);
    const secs = s % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    seconds,
    isActive,
    isFinished: seconds === 0,
    start,
    pause,
    reset,
    formatTime: formatTime(seconds)
  };
}
