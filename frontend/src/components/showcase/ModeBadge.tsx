import React from 'react';
import { RadioIcon } from 'lucide-react';
import { RuntimeMode } from '../../config/runtime';

interface ModeBadgeProps {
  mode: RuntimeMode;
  connected?: boolean;
  light?: boolean;
}

export function ModeBadge({ mode, connected = true, light = false }: ModeBadgeProps) {
  const base = light ? 'border-slate-200 bg-white text-slate-600' : 'border-white/10 bg-white/5 text-white/70';
  const dot = mode === 'demo' ? 'bg-amber-400' : connected ? 'bg-emerald-400' : 'bg-red-400';
  const label = mode === 'demo'
    ? '시연 모드 · 가상 센서 데이터'
    : connected
      ? '실제 센서 연결됨'
      : '실제 센서 연결 대기';

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${base}`}>
      <span className={`h-2 w-2 rounded-full ${dot} ${connected ? 'animate-pulse' : ''}`} />
      <RadioIcon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
