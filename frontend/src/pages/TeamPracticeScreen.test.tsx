import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TeamPracticeScreen, TeamPracticeScreenProps } from './TeamPracticeScreen';
import { getParticipantReading } from '../demo/scenario';
const base: TeamPracticeScreenProps = {
 mode:'live',victimType:'adult',playerCount:4,phase:'setup',currentPlayerIndex:0,elapsedSeconds:0,remainingSeconds:120,connected:false,
 reading:{...getParticipantReading(0),recoil:null},history:[],results:[],coach:{severity:'offline',title:'연결 대기',action:'센서를 연결하세요.',rationale:'새 데이터가 없습니다.',criterion:'실제 센서'},
 onConfigure:()=>undefined,onStart:()=>undefined,onEndRound:()=>undefined,onNextPlayer:()=>undefined,onChangeSettings:()=>undefined
};
describe('TeamPracticeScreen',()=>{
 it('offers all team sizes and two-minute rounds',()=>{const html=renderToStaticMarkup(<TeamPracticeScreen {...base}/>);for(const n of [1,2,3,4])expect(html).toContain(`>${n}명<`);expect(html).toContain('한 사람당 2분');expect(html).toContain('영아');});
 it('hides stale readings and unknown recoil',()=>{const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="active"/>);expect(html).toContain('센서 연결 대기');expect(html).toContain('측정 대기');expect(html).not.toContain('NaN');});
 it('shows the next person handoff',()=>{const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="handoff"/>);expect(html).toContain('2번 참가자');expect(html).toContain('준비 완료');});
 it('keeps missing scores unknown',()=>{const result={attemptUuid:'test-uuid-0',playerIndex:0,elapsedSeconds:120,compressionCount:0,observedCount:0,missingCount:0,score:null,avgDepth:null,avgBpm:null,avgRecoil:null,depthGoodPercent:null,rateGoodPercent:null,history:[]};const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="results" results={[result]}/>);expect(html).toContain('분석 대기');expect(html).toContain('유효 기록 0회');expect(html).not.toContain('NaN');});
});

it('shows live XP/combo and explains the scoring rules',()=>{
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="active" game={{xp:12,combo:6,maxCombo:6,scoredCount:6,score:100,grade:'S'}}/>);
 for(const text of ['100점','12 XP','6 콤보','정확 +2','근접 +1'])expect(html).toContain(text);
});

it('ranks four participants and displays score, grade, XP and best combo',()=>{
 const results=[90,80,80,60].map((score,playerIndex)=>({attemptUuid:`test-uuid-${playerIndex}`,playerIndex,elapsedSeconds:120,compressionCount:200,observedCount:200,missingCount:0,score,xp:score*4,maxCombo:12,grade:score>=90?'S':'A',avgDepth:5.4,avgBpm:110,avgRecoil:98,depthGoodPercent:90,rateGoodPercent:90,history:[]}));
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="results" results={results}/>);
 for(const text of ['1번 참가자 1위','2번 참가자 2위','3번 참가자 2위','4번 참가자 4위','등급 S','최대 12콤보'])expect(html).toContain(text);
});
