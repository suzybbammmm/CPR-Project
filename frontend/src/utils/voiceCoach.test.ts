import { describe, expect, it } from 'vitest';
import { shouldSpeakCoach, type VoiceTiming } from './voiceCoach';
const timing: VoiceTiming = {lastText:'더 깊게 누르세요',lastAt:1000,pendingText:'속도를 올리세요',pendingSince:3500};
describe('voice coach scheduling',()=>{
 it('waits for a stable instruction and spacing between speech',()=>{
  const notice={text:'속도를 올리세요',kind:'correction' as const};
  expect(shouldSpeakCoach(notice,timing,4200)).toBe(false);
  expect(shouldSpeakCoach(notice,timing,4400)).toBe(false);
  expect(shouldSpeakCoach(notice,timing,4500)).toBe(true);
  expect(shouldSpeakCoach({...notice,text:'다른 문구'},timing,10000)).toBe(false);
 });
 it('repeats corrections every eight seconds and praise every fifteen',()=>{
  const same={...timing,pendingText:timing.lastText,pendingSince:0};
  expect(shouldSpeakCoach({text:same.lastText,kind:'correction'},same,8999)).toBe(false);
  expect(shouldSpeakCoach({text:same.lastText,kind:'correction'},same,9000)).toBe(true);
  expect(shouldSpeakCoach({text:same.lastText,kind:'good'},same,15000)).toBe(false);
  expect(shouldSpeakCoach({text:same.lastText,kind:'good'},same,16000)).toBe(true);
 });
 it('prioritizes a stable disconnection warning',()=>{
  const offline={text:'연결 확인',kind:'offline' as const};
  const recent={...timing,lastAt:4000,pendingText:offline.text,pendingSince:3500};
  expect(shouldSpeakCoach(offline,recent,4200)).toBe(false);
  expect(shouldSpeakCoach(offline,recent,4300)).toBe(true);
 });
});
