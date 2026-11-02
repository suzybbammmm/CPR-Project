import React from 'react';
import { ArrowLeftIcon, BookOpenCheckIcon, CheckIcon, HeartHandshakeIcon, InfoIcon } from 'lucide-react';
import techniqueImage from '../assets/cpr-technique-3d.png';

type Technique = {
  title: string;
  age: string;
  depth: string;
  placement: string;
  hand: string;
  posture: string;
  caution: string;
};

const TECHNIQUES: Technique[] = [
  {
    title: '성인 (사춘기 이후)', age: '사춘기 이후', depth: '약 5cm · 6cm 초과 주의',
    placement: '가슴 정중앙, 흉골 아래쪽 1/2',
    hand: '한 손의 손바닥 뒤꿈치 위에 다른 손을 겹치고 깍지를 낍니다.',
    posture: '환자 옆에서 무릎을 꿇고, 팔꿈치를 편 채 어깨가 손 바로 위에 오도록 수직으로 압박합니다.',
    caution: '손가락 끝이 가슴에 닿지 않게 하고, 칼돌기 부위를 누르지 않습니다.'
  },
  {
    title: '소아 (만 1세 이상 ~ 사춘기 전)', age: '만 1세 이상 ~ 사춘기 전', depth: '가슴 두께의 1/3 · 4–5cm',
    placement: '흉골 아래쪽 1/2',
    hand: '체격에 맞춰 한 손 또는 두 손의 손바닥 뒤꿈치를 사용합니다.',
    posture: '평평하고 단단한 바닥에서 실시하고, 매 압박 뒤 가슴이 정상 위치로 완전히 이완되게 합니다.',
    caution: '갈비뼈와 칼돌기를 누르지 않습니다.'
  },
  {
    title: '영아 (만 1세 미만)', age: '만 1세 미만', depth: '가슴 두께의 1/3 · 약 4cm',
    placement: '젖꼭지 연결선 바로 아래의 흉골',
    hand: '양손으로 흉곽을 감싸고 두 엄지손가락으로 흉골을 압박합니다.',
    posture: '양손 감싼 두 엄지 가슴압박법을 우선 사용합니다. 매 압박 뒤 완전한 이완을 확인합니다.',
    caution: '칼돌기를 압박하지 않습니다. 기존 두 손가락 압박법은 현재 우선 권장되지 않습니다.'
  }
];

const SOURCES = [
  { label: '대한심폐소생협회, 2025년 한국 심폐소생술 가이드라인 제3장 기본소생술 (p. 67–69)', href: 'https://www.kacpr.org/download/2025%EB%85%84%20%ED%95%9C%EA%B5%AD%20%EC%8B%AC%ED%8F%90%EC%86%8C%EC%83%9D%EC%88%A0%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8.pdf' },
  { label: '대한심폐소생협회, 2025년 한국 심폐소생술 가이드라인 제6장 소아 기본소생술 (p. 287–289)', href: 'https://www.kacpr.org/download/2025%EB%85%84%20%ED%95%9C%EA%B5%AD%20%EC%8B%AC%ED%8F%90%EC%86%8C%EC%83%9D%EC%88%A0%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8.pdf' },
  { label: 'AHA 2025 Adult Basic Life Support', href: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support' }
];

export function CprTechniqueGuideScreen() {
  return (
    <main className="min-h-screen bg-[#f2f4f6] px-4 py-6 text-slate-800 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <a href="/participant?mode=demo" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-base font-bold text-slate-600 shadow-[0_6px_18px_rgba(0,0,0,0.04)] transition hover:bg-[#e8f3ff] hover:text-[#3182f6]"><ArrowLeftIcon className="h-5 w-5" />실습 설정으로</a>
        <header className="mt-6 max-w-4xl">
          <p className="flex items-center gap-2 text-base font-black uppercase tracking-[.18em] text-[#3182f6] sm:text-lg"><BookOpenCheckIcon className="h-6 w-6" />CPR Technique Guide</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight text-slate-800 sm:text-7xl">대상별 가슴압박 자세와 손 위치</h1>
          <p className="mt-5 text-xl leading-9 text-slate-500 sm:text-2xl sm:leading-10">성인·소아·영아는 압박 위치와 손 모양이 다릅니다. 실제 실습 전, 아래 그림과 체크리스트로 차이를 확인하세요.</p>
        </header>

        <section className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
          <img src={techniqueImage} alt="성인, 소아, 영아의 가슴압박 손 위치와 자세를 비교한 3D 교육 그림" className="h-auto w-full" />
          <div className="grid gap-3 border-t border-[#edf0f4] bg-white p-5 text-lg leading-8 text-slate-600 sm:grid-cols-3 sm:p-6"><p><strong className="text-[#3182f6]">성인:</strong> 두 손을 겹치고 팔꿈치를 펴 수직 압박</p><p><strong className="text-[#7d5ce6]">소아:</strong> 체격에 맞춰 한 손 또는 두 손</p><p><strong className="text-[#0a9b64]">영아:</strong> 양손 감싼 두 엄지 가슴압박법</p></div>
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-3">
          {TECHNIQUES.map((technique, index) => <TechniqueCard key={technique.title} technique={technique} accent={index === 0 ? 'cyan' : index === 1 ? 'violet' : 'emerald'} />)}
        </section>

        <section className="mt-7 rounded-3xl bg-[#fff8e6] p-6 text-lg leading-8 text-slate-600">
          <p className="flex items-center gap-2 font-black text-[#d68100]"><InfoIcon className="h-6 w-6" />교육용 안내</p>
          <p className="mt-2">이 화면은 CPR 교육용 프로토타입의 자세 안내입니다. 실제 응급상황에서는 119 신고와 현장 지시를 우선하고, 공인 CPR 교육에서 실습과 평가를 받아야 합니다.</p>
        </section>

        <footer className="mt-7 rounded-3xl bg-white p-6 text-lg text-slate-600 shadow-[0_8px_24px_rgba(0,0,0,0.035)]">
          <p className="flex items-center gap-2 font-black text-slate-800"><HeartHandshakeIcon className="h-6 w-6 text-[#3182f6]" />공식 출처</p>
          <ul className="mt-3 space-y-2">{SOURCES.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-4 hover:text-[#3182f6]">{source.label}</a></li>)}</ul>
          <p className="mt-4 text-base text-slate-400">그림은 공식 문서의 대상별 손 위치·자세 설명을 바탕으로 제작한 교육용 3D 시각화이며, 공식 원본 삽화가 아닙니다.</p>
        </footer>
      </div>
    </main>
  );
}

function TechniqueCard({ technique, accent }: { technique: Technique; accent: 'cyan' | 'violet' | 'emerald' }) {
  const accents = { cyan: 'text-[#3182f6] bg-[#e8f3ff]', violet: 'text-[#7d5ce6] bg-[#f0ecff]', emerald: 'text-[#0a9b64] bg-[#ecf9f2]' };
  return <article className="rounded-3xl bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.035)]"><div className="flex items-start justify-between gap-3"><div><h2 className={`text-2xl font-black leading-8 ${accents[accent].split(' ')[0]}`}>{technique.title}</h2></div><span className={`rounded-full px-3 py-2 text-base font-bold ${accents[accent].split(' ').slice(1).join(' ')}`}>{technique.depth}</span></div><dl className="mt-6 space-y-5 text-lg leading-8"><GuideLine label="압박 위치" text={technique.placement} /><GuideLine label="손 모양" text={technique.hand} /><GuideLine label="자세·이완" text={technique.posture} /><GuideLine label="주의" text={technique.caution} /></dl></article>;
}

function GuideLine({ label, text }: { label: string; text: string }) {
  return <div><dt className="flex items-center gap-2 font-black text-slate-700"><CheckIcon className="h-5 w-5 text-[#3182f6]" />{label}</dt><dd className="mt-1 text-slate-500">{text}</dd></div>;
}
