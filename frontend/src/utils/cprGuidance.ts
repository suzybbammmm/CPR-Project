export type VictimType = 'adult' | 'child' | 'infant';
export type FeedbackTone = 'good' | 'caution' | 'urgent';

export interface CprProfile {
  label: string;
  description: string;
  targetDepthCm: { min: number; max: number };
  guideDepth: string;
  handPlacement: string;
}

export const CPR_PROFILES: Record<VictimType, CprProfile> = {
  adult: {
    label: '성인',
    description: '사춘기 이상',
    targetDepthCm: { min: 5, max: 6 },
    guideDepth: '5–6cm',
    handPlacement: '가슴 중앙에 양손'
  },
  child: {
    label: '소아',
    description: '1세 ∼ 사춘기 전',
    targetDepthCm: { min: 4.5, max: 5.5 },
    guideDepth: '약 5cm (가슴 두께의 1/3)',
    handPlacement: '가슴 중앙에 한 손 또는 양손'
  },
  infant: {
    label: '영아',
    description: '1세 미만',
    targetDepthCm: { min: 3.5, max: 4.5 },
    guideDepth: '약 4cm (가슴 두께의 1/3)',
    handPlacement: '젊꼭지 선 아래 두 손가락'
  }
};

export function getCompressionFeedback(victimType: VictimType, depthCm: number, bpm: number): { message: string; tone: FeedbackTone } {
  const { min, max } = CPR_PROFILES[victimType].targetDepthCm;
  if (depthCm < min) return { message: `압박을 더 깊게 하세요. 목표는 ${CPR_PROFILES[victimType].guideDepth}입니다.`, tone: 'caution' };
  if (depthCm > max) return { message: `압박 깊이를 조금 줄이세요. 목표는 ${CPR_PROFILES[victimType].guideDepth}입니다.`, tone: 'caution' };
  if (bpm < 100) return { message: '압박 속도를 높이세요. 분당 100–120회를 유지하세요.', tone: 'caution' };
  if (bpm > 120) return { message: '압박 속도를 조금 낮추세요. 분당 100–120회가 목표입니다.', tone: 'caution' };
  return { message: '좋습니다. 깊이와 속도를 유지하세요.', tone: 'good' };
}

export function getRotationPrompt({ playerCount, secondsRemaining }: { playerCount: number; secondsRemaining: number }): { kind: 'warning' | 'handoff'; message: string } | null {
  if (playerCount < 2) return null;
  if (secondsRemaining === 0) return { kind: 'handoff', message: '지금 교대하세요. CPR 중단은 10초 이내로 유지하세요.' };
  if (secondsRemaining <= 10) return { kind: 'warning', message: `${secondsRemaining}초 후 교대입니다. 다음 실습자를 준비하세요.` };
  return null;
}
