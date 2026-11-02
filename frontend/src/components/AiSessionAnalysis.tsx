import React from 'react';
import { BrainCircuitIcon, CheckCircle2Icon, TargetIcon, TrendingUpIcon } from 'lucide-react';
import { PlayerResult } from '../types/game.types';
import { analyzeCprSession } from '../utils/cprCoach';

const SOURCES = [
  { label: '대한심폐소생협회 성인 가슴압박 안내', href: 'https://www.kacpr.org/page/page.php?category1_code=1247206302&category2_code=1527742406&category_idx=3&page_idx=1120' },
  { label: '대한심폐소생협회 2025 소아 기본소생술', href: 'https://www.kacpr.org/download/2025%EB%85%84%20%ED%95%9C%EA%B5%AD%20%EC%8B%AC%ED%8F%90%EC%86%8C%EC%83%9D%EC%88%A0%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8.pdf' },
  { label: 'AHA 2025 Basic Life Support', href: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support' },
  { label: 'CPR 실시간 피드백 교육 효과 문헌고찰', href: 'https://pubmed.ncbi.nlm.nih.gov/40230367/' }
];

export function AiSessionAnalysis({ result }: { result: PlayerResult }) {
  const analysis = analyzeCprSession(result.compressionPeaks, result.victimType);

  return (
    <section className="mt-4 rounded-3xl border border-cyan-300/20 bg-slate-950/75 p-5 text-white shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex gap-3"><span className="rounded-xl bg-cyan-400/15 p-2 text-cyan-300"><BrainCircuitIcon className="h-6 w-6" /></span><div><h3 className="text-xl font-black">AI 세션 분석</h3><p className="text-xs text-slate-400">공식 CPR 기준과 이번 세션의 완료 압박 데이터 기반 AI 코칭</p></div></div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">완료 압박 {analysis.totalCompressions}회</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Insight icon={<CheckCircle2Icon className="h-4 w-4 text-emerald-300" />} title="잘한 점" text={analysis.strength} />
        <Insight icon={<TargetIcon className="h-4 w-4 text-amber-300" />} title="가장 중요한 교정" text={analysis.priority} />
        <Insight icon={<TrendingUpIcon className="h-4 w-4 text-cyan-300" />} title="다음 라운드 목표" text={analysis.nextGoal} />
        <Insight icon={<TrendingUpIcon className="h-4 w-4 text-violet-300" />} title="그래프 해석" text={analysis.summary} />
      </div>

      <div className="mt-4 rounded-2xl bg-white/[0.05] p-4 text-sm text-slate-300">
        <p><strong className="text-white">실제 평균:</strong> 깊이 {analysis.averageDepth.toFixed(1)}cm · 속도 {analysis.averageBpm}회/분 · 깊이·속도 동시 적정 {analysis.properPercent}%</p>
        <p className="mt-2 text-xs text-slate-400">교육용 프로토타입 측정값입니다. 이완·손 위치·환기 품질은 분석 대상이 아닙니다. 점수와 분석은 깊이·속도 데이터만 반영합니다.</p>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        <p className="font-bold text-slate-400">AI 코칭 기준</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{SOURCES.map(source => <a key={source.href} className="underline decoration-slate-600 underline-offset-2 hover:text-cyan-300" href={source.href} target="_blank" rel="noreferrer">{source.label}</a>)}</div>
      </div>
    </section>
  );
}

function Insight({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><h4 className="flex items-center gap-2 text-sm font-black text-white">{icon}{title}</h4><p className="mt-2 text-sm leading-6 text-slate-300">{text}</p></article>;
}
