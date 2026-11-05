import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TeamPracticeScreen, TeamPracticeScreenProps } from './TeamPracticeScreen';
import { getParticipantReading } from '../demo/scenario';
const base: TeamPracticeScreenProps = {
 mode:'live',victimType:'adult',playerCount:4,phase:'setup',currentPlayerIndex:0,elapsedSeconds:0,remainingSeconds:30,connected:false,
 reading:{...getParticipantReading(0),recoil:null},results:[],coach:{severity:'offline',title:'연결 대기',action:'센서를 연결하세요.',rationale:'새 데이터가 없습니다.',criterion:'실제 센서'},
 onConfigure:()=>undefined,onStart:()=>undefined,onEndRound:()=>undefined,onNextPlayer:()=>undefined,onChangeSettings:()=>undefined
};
describe('TeamPracticeScreen',()=>{
 it('offers all team sizes and 30-second rounds',()=>{const html=renderToStaticMarkup(<TeamPracticeScreen {...base}/>);for(const n of [1,2,3,4])expect(html).toContain(`>${n}명<`);expect(html).toContain('한 사람당 30초');expect(html).toContain('영아');});
 it('hides stale readings and unknown recoil',()=>{const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="active"/>);expect(html).toContain('센서 연결 대기');expect(html).toContain('측정 대기');expect(html).not.toContain('NaN');});
 it('shows the next person handoff',()=>{const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="handoff"/>);expect(html).toContain('2번 참가자');expect(html).toContain('준비 완료');});
 it('keeps missing scores unknown',()=>{const result={attemptUuid:'test-uuid-0',playerIndex:0,elapsedSeconds:120,compressionCount:0,observedCount:0,missingCount:0,score:null,avgDepth:null,avgBpm:null,avgRecoil:null,depthGoodPercent:null,rateGoodPercent:null,history:[]};const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="results" results={[result]}/>);expect(html).toContain('분석 대기');expect(html).toContain('유효 기록 0회');expect(html).not.toContain('NaN');});
});

it('shows live XP/combo and explains the scoring rules',()=>{
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="active" connected game={{xp:12,combo:6,maxCombo:6,scoredCount:6,score:100,grade:'S'}}/>);
 for(const text of ['100점','12 XP','>6</strong><span>콤보','정확 +2','근접 +1'])expect(html).toContain(text);
});

it('ranks four participants and displays score, grade, XP and best combo',()=>{
 const results=[90,80,80,60].map((score,playerIndex)=>({attemptUuid:`test-uuid-${playerIndex}`,playerIndex,elapsedSeconds:120,compressionCount:200,observedCount:200,missingCount:0,score,xp:score*4,maxCombo:12,grade:score>=90?'S':'A',avgDepth:5.4,avgBpm:110,avgRecoil:98,depthGoodPercent:90,rateGoodPercent:90,history:[]}));
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="results" results={results}/>);
 for(const text of ['1번 참가자 1위','2번 참가자 2위','3번 참가자 2위','4번 참가자 4위','등급 S','최대 12콤보'])expect(html).toContain(text);
});

it('shows both depth and rate corrections using the completed peak',()=>{
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="active" connected reading={{...base.reading,depthCm:0,rate:90,compressionCount:7}} game={{xp:12,combo:6,maxCombo:6,scoredCount:6,score:100,grade:'S',gamePoints:160,assessmentDepth:4}}/>);
 for(const text of ['더 깊게 누르세요!','속도를 더 올리세요!','×2','160','직전 완료 압박 기준']) expect(html).toContain(text);
});
it('suppresses stale combo encouragement while disconnected',()=>{
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="active" game={{xp:12,combo:6,maxCombo:6,scoredCount:6,score:100,grade:'S'}}/>);
 expect(html).toContain('보너스 일시 정지');
 expect(html).not.toContain('보너스까지');
});

it('moves depth and rate charts from the active screen to the scrollable results',()=>{
 const history=[{time:0,depth:0,bpm:0},{time:1,depth:5.4,bpm:110}];
 const result={attemptUuid:'chart-result',playerIndex:0,elapsedSeconds:12,compressionCount:2,observedCount:2,missingCount:0,score:100,avgDepth:5.4,avgBpm:110,avgRecoil:100,depthGoodPercent:100,rateGoodPercent:100,history};
 const active=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="active" connected/>);
 const results=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="results" playerCount={1} results={[result]}/>);
 expect(active).not.toContain('30초 압박 깊이 그래프');
 expect(active).not.toContain('30초 압박 속도 그래프');
 for(const text of ['참가자별 깊이·속도 기록','30초 압박 깊이 그래프','30초 압박 속도 그래프','아래로 스크롤']) expect(results).toContain(text);
 expect(results).toContain('viewBox="0 0 610 250"');
});

it('spaces result chart points into two-second summaries',()=>{
 const history=Array.from({length:301},(_,index)=>({time:index/10,depth:index%10===5?5.4:0,bpm:110}));
 const result={attemptUuid:'spaced-chart',playerIndex:0,elapsedSeconds:30,compressionCount:50,observedCount:50,missingCount:0,score:100,avgDepth:5.4,avgBpm:110,avgRecoil:100,depthGoodPercent:100,rateGoodPercent:100,history};
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="results" playerCount={1} results={[result]}/>);
 const lines=[...html.matchAll(/<polyline points="([^"]*)"/g)];
 expect(lines).toHaveLength(2);
 expect(lines[0][1].split(' ')).toHaveLength(16);
 expect(lines[1][1].split(' ')).toHaveLength(16);
});
