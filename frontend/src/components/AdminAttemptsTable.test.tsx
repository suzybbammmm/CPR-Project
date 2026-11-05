import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminAttemptsTable } from './AdminAttemptsTable';
import type { AdminAttempt } from '../api/admin';

const attempt: AdminAttempt = {
 id:1,attemptUuid:'test',playerOrder:0,victimType:'adult',score:90,grade:'S',xp:20,maxCombo:10,
 compressionCount:20,observedCount:20,missingCount:0,averageDepth:5.5,averageBpm:110,averageRecoil:null,
 depthGoodPercent:90,rateGoodPercent:90,elapsedSeconds:120,completedAt:'2026-11-05T00:00:00Z',
 invalidatedAt:null,invalidatedReason:null,studentNumber:'test0000',name:'연락처테스트',phone:'01000000000'
};
describe('admin participant contacts',()=>{
 it('shows identity, formatted contact, score and missing phone distinctly',()=>{
  const html=renderToStaticMarkup(<AdminAttemptsTable attempts={[attempt,{...attempt,id:2,phone:null}]}/>);
  for(const text of ['전화번호','연락처테스트','test0000','010-0000-0000','미입력','90']) expect(html).toContain(text);
 });
 it('shows an empty state for no matching records',()=>{
  const html=renderToStaticMarkup(<AdminAttemptsTable attempts={[]}/>);
  expect(html).toContain('표시할 참가자 기록이 없습니다.');
 });
});
