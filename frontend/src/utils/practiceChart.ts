import type { ParticipantChartPoint } from '../pages/ParticipantSessionScreen';
import { TEAM_ROUND_SECONDS } from '../live/teamSession';

// Half-second buckets keep both depth extrema, preserving the compression and
// release waveform while fitting the full round into a compact result chart.
export const summarizeChart = (history: ParticipantChartPoint[], kind: 'depth'|'bpm') => {
 const buckets=new Map<number, {time:number;value:number}[]>();
 for(const point of history){
  if(!Number.isFinite(point.time)||!Number.isFinite(point[kind])) continue;
  const time=Math.min(TEAM_ROUND_SECONDS,Math.max(0,point.time));
  const bucket=Math.min(59,Math.floor(time/.5));
  const samples=buckets.get(bucket)??[];
  samples.push({time,value:point[kind]});
  buckets.set(bucket,samples);
 }
 return [...buckets.entries()].sort(([a],[b])=>a-b).flatMap(([,samples])=>{
  if(kind==='bpm') return [{time:samples.reduce((sum,p)=>sum+p.time,0)/samples.length,value:samples.reduce((sum,p)=>sum+p.value,0)/samples.length}];
  const min=samples.reduce((a,b)=>a.value<=b.value?a:b);
  const max=samples.reduce((a,b)=>a.value>=b.value?a:b);
  return min===max?[min]:[min,max].sort((a,b)=>a.time-b.time);
 });
};
