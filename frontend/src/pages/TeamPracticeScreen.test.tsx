import { createTeamSession, startTeamRound, recordTeamFrame, finishTeamRound } from '../live/teamSession';
import type { SensorReading } from '../live/sensorState';
const sensorFrame: SensorReading={type:'reading',deviceId:'one',sequence:10,timestamp:1000,depth:0.7,bpm:110,compressionCount:10,compressionPeakCm:5.4,compressionBpm:110,recoilPercent:95,accelZ:0,gyroZ:0};
import { summarizeChart } from '../utils/practiceChart';
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
 for(const text of ['100점','12 XP','>6</strong><span>콤보','MISS 0','BAD 5','GOOD 10','GREAT 15','PERFECT 20'])expect(html).toContain(text);
});

it('ranks four participants and displays score, grade, XP and best combo',()=>{
 const results=[90,80,80,60].map((score,playerIndex)=>({attemptUuid:`test-uuid-${playerIndex}`,playerIndex,elapsedSeconds:120,compressionCount:200,observedCount:200,missingCount:0,score,xp:score*4,maxCombo:12,grade:score>=90?'S':'A',avgDepth:5.4,avgBpm:110,avgRecoil:98,depthGoodPercent:90,rateGoodPercent:90,history:[]}));
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="results" results={results}/>);
 for(const text of ['1번 참가자 1위','2번 참가자 2위','3번 참가자 2위','4번 참가자 4위','등급 S','최대 12콤보'])expect(html).toContain(text);
});

it('shows both depth and rate corrections using the completed peak',()=>{
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="active" connected reading={{...base.reading,depthCm:0,rate:90,compressionCount:7}} game={{xp:12,combo:6,maxCombo:6,scoredCount:6,score:100,grade:'S',gamePoints:160,assessmentDepth:4}}/>);
 for(const text of ['더 깊게 누르세요!','속도를 더 올리세요!','×2','160','완료 압박 기준']) expect(html).toContain(text);
});
it('renders live depth immediately and does not keep the completed peak on screen',()=>{
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="active" connected reading={{...base.reading,depthCm:5.2,rate:110,compressionCount:7}} game={{xp:2,combo:0,maxCombo:1,scoredCount:2,score:50,grade:'D',gamePoints:20,assessmentDepth:4,lastJudgement:'miss'}}/>);
 expect(html).toContain('5.2<small>cm');
 expect(html).toContain('GOOD');
 expect(html).toContain('기준에 가까워요');
});
it('shows the registered participant name in the live header',()=>{
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="active" connected participants={[{name:'제수지',studentNumber:'202245830'}]} />);
 expect(html).toContain('<h1>제수지 <small>1/4</small></h1>');
 expect(html).not.toContain('<h1>1번 참가자');
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
 expect(active).not.toContain('실시간 압박 그래프');
 expect(active).not.toContain('30초 압박 깊이 그래프');
 expect(active).not.toContain('30초 압박 속도 그래프');
 for(const text of ['참가자별 깊이·속도 기록','30초 압박 깊이 그래프','30초 압박 속도 그래프','아래로 스크롤']) expect(results).toContain(text);
 expect(results).toContain('viewBox="0 0 610 250"');
});

it('compresses the whole waveform into smooth result curves',()=>{
 const history=Array.from({length:301},(_,index)=>({time:index/10,depth:index%10===5?5.4:0,bpm:110}));
 const result={attemptUuid:'spaced-chart',playerIndex:0,elapsedSeconds:30,compressionCount:50,observedCount:50,missingCount:0,score:100,avgDepth:5.4,avgBpm:110,avgRecoil:100,depthGoodPercent:100,rateGoodPercent:100,history};
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="results" playerCount={1} results={[result]}/>);
 const lines=[...html.matchAll(/data-sample-count="(\d+)" d="([^"]*)"/g)];
 expect(lines).toHaveLength(2);
 expect(Number(lines[0][1])).toBeLessThanOrEqual(120);
 expect(Number(lines[1][1])).toBe(60);
 expect(lines[0][2]).toContain(' C ');
 const depths=summarizeChart(history,'depth').map(point=>point.value);
 expect(Math.max(...depths)).toBe(5.4);
 expect(Math.min(...depths)).toBe(0);
});

it('keeps the completed judgement during release while displaying live depth',()=>{
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="active" connected reading={{...base.reading,depthCm:0,rate:110,compressionCount:7}} game={{xp:20,combo:1,maxCombo:1,scoredCount:1,score:100,grade:'S',assessmentDepth:5.4,assessmentBpm:110}}/>);
 expect(html).toContain('0.0<small>cm');
 expect(html).toContain('PERFECT');
});

it('renders actual recorded metrics with a resting sensor offset',()=>{
 let state=startTeamRound(createTeamSession(1,'adult'),1000,{...sensorFrame,depth:0.7});
 state=recordTeamFrame(state,{...sensorFrame,sequence:11,timestamp:1600,compressionCount:11,depth:0.8,compressionPeakCm:5.4},1600,true,1600);
 state=recordTeamFrame(state,{...sensorFrame,sequence:12,timestamp:2200,compressionCount:12,depth:0.7,compressionPeakCm:4.5},2200,true,2200);
 state=finishTeamRound(state,3000);
 const html=renderToStaticMarkup(<TeamPracticeScreen {...base} phase="results" results={state.results}/>);
 for(const text of ['>75</strong>','>5.0 ','>110 ','평균 깊이','평균 속도','완료 압박']) expect(html).toContain(text);
 expect(html).not.toContain('분석 대기');
});
