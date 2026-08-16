import React from 'react';
import { ActivityIcon, ArrowDownIcon, CheckCircle2Icon, GaugeIcon, HeartPulseIcon, RotateCcwIcon, TimerIcon } from 'lucide-react';
import { RuntimeMode } from '../config/runtime';
import { MonitoringStatus, ParticipantReading } from '../demo/scenario';
import { ModeBadge } from '../components/showcase/ModeBadge';

export type ParticipantDisplayReading = Omit<ParticipantReading, 'recoil'> & { recoil: number | null };

interface ParticipantSessionScreenProps {
  mode: RuntimeMode;
  reading: ParticipantDisplayReading;
  elapsedSeconds: number;
  connected: boolean;
}

const STATUS_STYLE: Record<MonitoringStatus, { color: string; ring: string; label: string }> = {
  normal: { color: 'text-emerald-300', ring: 'border-emerald-400/60 bg-emerald-400/10', label: '정상 범위' },
  caution: { color: 'text-amber-300', ring: 'border-amber-400/60 bg-amber-400/10', label: '교정 필요' },
  urgent: { color: 'text-red-300', ring: 'border-red-400/70 bg-red-400/10', label: '즉시 교정' }
};

function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function MetricCard({ label, value, unit, target, icon }: { label: string; value: string; unit: string; target: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">{icon}{label}</div>
      <div className="flex items-end gap-2"><strong className="text-4xl tabular-nums text-white">{value}</strong><span className="mb-1 text-sm text-slate-400">{unit}</span></div>
      <p className="mt-2 text-xs text-slate-500">권장 {target}</p>
    </div>
  );
}

export function ParticipantSessionScreen({ mode, reading, elapsedSeconds, connected }: ParticipantSessionScreenProps) {
  const style = STATUS_STYLE[reading.status];
  const depthProgress = Math.max(0, Math.min(100, (reading.depthCm / 7) * 100));

  return (
    <main className="min-h-screen bg-[#071426] px-4 py-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300"><HeartPulseIcon className="h-7 w-7" /></span>
            <div><h1 className="text-2xl font-black tracking-tight">LifePulse</h1><p className="text-xs text-slate-400">CPR 기본과정 · 스테이션 A</p></div>
          </div>
          <ModeBadge mode={mode} connected={connected} />
          <div className="flex items-center gap-3 rounded-xl bg-slate-950/50 px-4 py-2">
            <TimerIcon className="h-5 w-5 text-cyan-300" /><span className="font-mono text-2xl font-bold tabular-nums">{formatElapsed(elapsedSeconds)}</span>
          </div>
        </header>

        {!connected && mode === 'live' && (
          <div role="alert" className="mb-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-center font-semibold text-red-200">센서 연결을 기다리고 있습니다. WebSocket 서버와 ESP32 상태를 확인하세요.</div>
        )}

        <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className={`flex min-h-[430px] flex-col items-center justify-center rounded-[2rem] border-2 p-6 text-center shadow-2xl ${style.ring}`}>
            <span className={`mb-3 rounded-full border border-current/30 px-4 py-1.5 text-sm font-bold ${style.color}`}>{style.label} · {reading.phaseLabel}</span>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">현재 압박 깊이</p>
            <div className="my-3 flex items-end justify-center gap-2">
              <strong className={`text-[8rem] font-black leading-none tabular-nums sm:text-[10rem] ${style.color}`}>{reading.depthCm.toFixed(1)}</strong>
              <span className="mb-5 text-2xl font-bold text-slate-400">cm</span>
            </div>
            <div className="mb-7 h-3 w-full max-w-xl overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-current transition-all duration-500" style={{ width: `${depthProgress}%`, color: 'rgb(34 211 238)' }} /></div>
            <div className={`flex max-w-2xl items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-6 py-5 text-xl font-black sm:text-2xl ${style.color}`}>
              {reading.status === 'normal' ? <CheckCircle2Icon className="h-8 w-8 shrink-0" /> : <ArrowDownIcon className="h-8 w-8 shrink-0" />}
              {reading.feedback}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <MetricCard label="분당 압박 횟수" value={reading.rate.toString()} unit="회/분" target="100–120회" icon={<GaugeIcon className="h-4 w-4 text-cyan-300" />} />
            <MetricCard label="압박 이완 비율" value={reading.recoil === null ? '—' : reading.recoil.toString()} unit="%" target="90% 이상" icon={<RotateCcwIcon className="h-4 w-4 text-emerald-300" />} />
            <div className="grid grid-cols-2 gap-4 sm:col-span-2 lg:col-span-1">
              <MetricCard label="실시간 점수" value={reading.score.toString()} unit="/ 100" target="75점 이상" icon={<ActivityIcon className="h-4 w-4 text-amber-300" />} />
              <MetricCard label="누적 압박" value={reading.compressionCount.toString()} unit="회" target="중단 최소화" icon={<HeartPulseIcon className="h-4 w-4 text-rose-300" />} />
            </div>
          </div>
        </section>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-500">
          <span>깊이 5–6cm · 속도 100–120회/분 · 충분한 가슴 이완</span>
          <span>측정 정확도 약 ±0.3cm · 마네킹 및 환경별 지속 검증 중</span>
        </footer>
      </div>
    </main>
  );
}
