import { useEffect, useRef, useState } from 'react';
import type { RuntimeMode } from '../config/runtime';
import type { VictimType } from '../utils/cprGuidance';
import type { SensorReading } from '../live/sensorState';
import { getParticipantReading } from '../demo/scenario';
import { buildLiveParticipantReading } from '../live/readings';
import { getLiveCoachFeedback } from '../utils/cprCoach';
import { TEAM_ROUND_SECONDS, createTeamSession, startTeamRound, nextTeamRound, finishTeamRound, recordTeamFrame, tickTeamSession, teamGameStats, buildCompressionPayload } from '../live/teamSession';
import { useWebSocket } from './useWebSocket';
import { useSaveAttempt } from './useSaveAttempt';
import { createSession } from '../api/sessions';
import type { ParticipantInfo } from '../types/exhibition.types';

function demoFrame(elapsed: number): SensorReading {
 const demo=getParticipantReading(elapsed), cycle=600, phase=(elapsed%cycle)/cycle;
 return {type:'reading',deviceId:'demo',sequence:Math.floor(elapsed/100)+1,timestamp:elapsed,depth:demo.depthCm*(1-Math.abs(2*phase-1)),bpm:demo.rate,compressionCount:Math.floor(elapsed/cycle),compressionPeakCm:demo.depthCm,compressionBpm:Math.floor(elapsed/cycle)>1?demo.rate:null,recoilPercent:demo.recoil,accelZ:0,gyroZ:0};
}
export function useTeamSession(mode: RuntimeMode, initialVictim: VictimType, initialPlayers: number, initiallyStarted: boolean) {
 const socket=useWebSocket(mode==='live'?(import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8765'):'');
 const [now,setNow]=useState(()=>Date.now());
 const [session,setSession]=useState(()=>{
   const initial=createTeamSession(initialPlayers,initialVictim);
   return initiallyStarted?startTeamRound(initial,Date.now(),mode==='demo'?demoFrame(0):null):initial;
 });
 const saveAttempt=useSaveAttempt();
 const sessionCreated=useRef(false);

 // Create server-side session record once on first start
 const ensureServerSession=async(sess:typeof session)=>{
   if(sessionCreated.current||mode==='demo')return;
   sessionCreated.current=true;
   try{
     await createSession({sessionUuid:sess.sessionUuid,victimType:sess.victimType,playerCount:sess.playerCount,mode:'live'});
   }catch{/* non-fatal: save attempt will fail too, which shows retry UI */}
 };

 useEffect(()=>{
   const timer=window.setInterval(()=>{const time=Date.now();setNow(time);setSession(current=>{
     const ticked=tickTeamSession(current,time);
     if(ticked!==current&&ticked.phase!=='active'&&current.phase==='active'){
       // round just ended via timer — schedule save outside updater
       const round=ticked.results[ticked.results.length-1];
       if(round&&round.participant&&mode!=='demo'){
         const compressionEvents=buildCompressionPayload(current.events,current.victimType);
         const payload={attemptUuid:round.attemptUuid,sessionUuid:current.sessionUuid,studentNumber:round.participant.studentNumber,name:round.participant.name,phone:round.participant.phone,playerOrder:round.playerIndex,elapsedSeconds:round.elapsedSeconds,victimType:current.victimType,score:round.score,compressionEvents};
         setTimeout(()=>saveAttempt.save(payload),0);
       }
     }
     return mode==='demo'&&ticked.phase==='active'?recordTeamFrame(ticked,demoFrame(time-(ticked.startedAt??time)),time,true,time):ticked;
   });},100);
   return ()=>window.clearInterval(timer);
 },[mode,saveAttempt]);
 useEffect(()=>{
   if(mode==='live' && socket.data && socket.lastReceivedAt!==null) {
     const frame=socket.data, receivedAt=socket.lastReceivedAt;
     setSession(current=>recordTeamFrame(current,frame,Date.now(),socket.sensorOnline,receivedAt));
   }
 },[mode,socket.data,socket.lastReceivedAt,socket.sensorOnline]);
 const elapsedSeconds=session.phase==='active'?Math.min(TEAM_ROUND_SECONDS,Math.max(0,now-(session.startedAt??now))/1000):0;
 const connected=mode==='demo'||socket.sensorOnline;
 const data=mode==='demo'?demoFrame(elapsedSeconds*1000):socket.data;
 const game=teamGameStats(session.events,session.victimType);
 const live=buildLiveParticipantReading(data,elapsedSeconds*1000,connected,session.victimType);
 const reading={...live,compressionCount:session.compressionCount,score:game.score??0,recoil:connected?(session.events.at(-1)?.recoil??null):null};
 const coach=getLiveCoachFeedback({sensorOnline:connected,victimType:session.victimType,depth:session.events.at(-1)?.depth??reading.depthCm,bpm:reading.rate,compressionCount:session.compressionCount});
 const baseline=()=>mode==='demo'?demoFrame(0):connected?socket.data:null;
 const configure=(victimType:VictimType,playerCount:number)=>setSession(current=>current.phase==='setup'?createTeamSession(playerCount,victimType):current);
 const setParticipants=(participants:ParticipantInfo[])=>setSession(current=>({...current,participants}));
 const endRound=()=>setSession(current=>{
   const next=finishTeamRound(current,Date.now());
   const round=next.results[next.results.length-1];
   if(round&&round.participant&&mode!=='demo'){
     const compressionEvents=buildCompressionPayload(current.events,current.victimType);
     const payload={attemptUuid:round.attemptUuid,sessionUuid:current.sessionUuid,studentNumber:round.participant.studentNumber,name:round.participant.name,phone:round.participant.phone,playerOrder:round.playerIndex,elapsedSeconds:round.elapsedSeconds,victimType:current.victimType,score:round.score,compressionEvents};
     setTimeout(()=>saveAttempt.save(payload),0);
   }
   return next;
 });
 return {session,reading,coach,connected,game,elapsedSeconds,remainingSeconds:Math.max(0,TEAM_ROUND_SECONDS-elapsedSeconds),
  saveStatus:saveAttempt.status,
  configure,setParticipants,
  start:()=>setSession(current=>{const next=startTeamRound(current,Date.now(),baseline());setTimeout(()=>ensureServerSession(next),0);return next;}),
  endRound,
  nextPlayer:()=>setSession(current=>nextTeamRound(current,Date.now(),baseline())),
  reset:()=>{sessionCreated.current=false;saveAttempt.reset();setSession(current=>createTeamSession(current.playerCount,current.victimType));}};
}
