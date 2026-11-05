import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { shouldSpeakCoach, type VoiceNotice, type VoiceTiming } from '../utils/voiceCoach';

export function VoiceCoach({ notice, eventCount }: { notice: VoiceNotice; eventCount: number }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(notice);
  const lastEvent = useRef({ count: eventCount, at: Date.now() });
  useEffect(() => { lastEvent.current = { count: eventCount, at: Date.now() }; }, [eventCount]);
  const timing = useRef<VoiceTiming>({ lastText: '', lastAt: 0, pendingText: notice.text, pendingSince: 0 });
  const owned = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => { setSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window); }, []);
  useEffect(() => { latest.current = notice; }, [notice]);

  const stop = () => {
    if (owned.current) {
      owned.current.onend = null;
      owned.current.onerror = null;
      window.speechSynthesis.cancel();
      owned.current = null;
    }
  };
  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.05;
    const voice = synth.getVoices().find(v => /^ko([-_]|$)/i.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.onend = () => { if (owned.current === utterance) owned.current = null; };
    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      owned.current = null;
      setEnabled(false);
      setError('음성을 재생하지 못했어요. 기기의 한국어 음성과 소리 설정을 확인해주세요.');
    };
    owned.current = utterance;
    synth.speak(utterance);
  };
  // Functions use refs and browser APIs only; one timer lives for the enabled period.
  const playback = useRef({ speak, stop });
  playback.current = { speak, stop };
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      const current: VoiceNotice = latest.current.kind !== 'offline' && lastEvent.current.count > 0 && now - lastEvent.current.at > 3000
        ? { text: '압박을 이어가세요.', kind: 'waiting' } : latest.current;
      if (timing.current.pendingText !== current.text) {
        timing.current.pendingText = current.text;
        timing.current.pendingSince = now;
      }
      if (!shouldSpeakCoach(current, timing.current, now)) return;
      const urgent = current.kind === 'offline' && current.text !== timing.current.lastText;
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        if (!urgent) return;
        playback.current.stop();
      }
      playback.current.speak(current.text);
      timing.current.lastText = current.text;
      timing.current.lastAt = now;
    }, 500);
    return () => { window.clearInterval(timer); playback.current.stop(); };
  }, [enabled]);

  const toggle = () => {
    if (!supported) return;
    if (enabled) { stop(); setEnabled(false); return; }
    setError('');
    timing.current = { lastText: '', lastAt: Date.now(), pendingText: latest.current.text, pendingSince: Date.now() };
    setEnabled(true);
    // The first utterance runs directly from the button gesture.
    speak('음성 코치를 켰습니다. 깊이와 속도를 안내할게요.');
  };
  return <div className="tp-voice-control"><button type="button" className="tp-voice-toggle" aria-pressed={enabled} onClick={toggle} disabled={!supported} title={!supported ? '이 브라우저에서는 음성 코치를 사용할 수 없습니다' : '기기 스피커로 한국어 안내를 재생합니다'}>{enabled ? <Volume2 size={17}/> : <VolumeX size={17}/>} {!supported ? '음성 미지원' : enabled ? '음성 코치 끄기' : '음성 코치 켜기'}</button>{error && <span className="tp-voice-error" role="status">{error}</span>}</div>;
}
