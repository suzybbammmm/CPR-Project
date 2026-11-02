import React from 'react';
import { ActivityIcon, ArrowRightIcon, HeartPulseIcon, MonitorIcon, RadioTowerIcon } from 'lucide-react';
import { getShowcaseLinks } from '../config/runtime';

export function RoleLauncher({ origin }: { origin: string }) {
  const links = getShowcaseLinks(origin);

  return (
    <main className="min-h-screen bg-[#f2f4f6] px-6 py-10 text-slate-800">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center">
        <header className="mb-10 max-w-3xl">
          <p className="mb-3 text-base font-bold uppercase tracking-[0.28em] text-[#3182f6]">Retry · Smart CPR Training</p>
          <div className="mb-5 flex items-center gap-4">
            <span className="rounded-2xl bg-[#e8f3ff] p-3 text-[#3182f6]"><HeartPulseIcon className="h-10 w-10" /></span>
            <h1 className="text-5xl font-black tracking-tight md:text-7xl">LifePulse</h1>
          </div>
          <p className="text-lg leading-relaxed text-slate-500 md:text-xl">
            기존 CPR 마네킹을 교체하지 않고, 센서 모듈과 웹 관제로 더 정확한 교육 환경을 만듭니다.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2">
          <article className="group rounded-3xl bg-white p-7 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
            <span className="mb-5 inline-flex rounded-2xl bg-[#e8f3ff] p-3"><ActivityIcon className="h-8 w-8 text-[#3182f6]" /></span>
            <p className="text-sm font-bold uppercase tracking-widest text-[#3182f6]">iPad 권장</p>
            <h2 className="mt-2 text-3xl font-black">CPR 시행자 화면</h2>
            <p className="mt-3 min-h-12 text-base leading-6 text-slate-500">압박 깊이·속도와 즉시 행동 피드백을 큰 화면으로 보여줍니다.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <a href={links.participantDemo} className="flex items-center justify-between rounded-xl bg-[#3182f6] px-4 py-3 font-bold text-white transition hover:bg-[#1b6fe5]">시연 모드 <ArrowRightIcon className="h-4 w-4" /></a>
              <a href={links.participantLive} className="flex items-center justify-between rounded-xl bg-[#edf4ff] px-4 py-3 font-bold text-[#3182f6] transition hover:bg-[#e1eeff]">실제 센서 <RadioTowerIcon className="h-4 w-4" /></a>
            </div>
          </article>

          <article className="group rounded-3xl bg-white p-7 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
            <span className="mb-5 inline-flex rounded-2xl bg-[#ecf9f2] p-3"><MonitorIcon className="h-8 w-8 text-[#0a9b64]" /></span>
            <p className="text-sm font-bold uppercase tracking-widest text-[#0a9b64]">MacBook 권장</p>
            <h2 className="mt-2 text-3xl font-black">강사 관제 화면</h2>
            <p className="mt-3 min-h-12 text-base leading-6 text-slate-500">8개 스테이션의 상태와 경고, 교육생별 수행 지표를 동시에 확인합니다.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <a href={links.instructorDemo} className="flex items-center justify-between rounded-xl bg-[#0a9b64] px-4 py-3 font-bold text-white transition hover:bg-[#078457]">시연 모드 <ArrowRightIcon className="h-4 w-4" /></a>
              <a href={links.instructorLive} className="flex items-center justify-between rounded-xl bg-[#ecf9f2] px-4 py-3 font-bold text-[#0a9b64] transition hover:bg-[#d9f4e6]">실제 센서 <RadioTowerIcon className="h-4 w-4" /></a>
            </div>
          </article>
        </section>

        <footer className="mt-8 flex flex-col gap-1 text-base text-slate-400 sm:flex-row sm:justify-between">
          <span>장비가 아닌 교육의 정확도를 바꿉니다.</span>
          <span className="flex flex-wrap items-center gap-3"><a className="font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4" href={links.game}>기존 게임형 훈련 화면</a><a className="font-semibold text-[#3182f6] underline decoration-[#b9d5ff] underline-offset-4" href="/guide">대상별 자세 안내</a>LifePulse Gallery Demo · 오프라인 실행 지원</span>
        </footer>
      </div>
    </main>
  );
}
