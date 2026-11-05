import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LivePracticeMonitor } from '../components/LivePracticeMonitor';
import { useGameContext } from '../context/GameContext';
import { useGameData } from '../hooks/useGameData';
import { useCountdown } from '../hooks/useCountdown';
import { CPR_PROFILES, getRotationPrompt } from '../utils/cprGuidance';
import { calculateAverages, calculatePoints, calculateProperPercent } from '../utils/scoring';
import { calculateGrade } from '../utils/grading';
import { DataPoint } from '../types/game.types';
import { getNewCompressionEvents } from '../utils/compressionEvents';
import { getLiveCoachFeedback } from '../utils/cprCoach';
import { assessPracticeCompression } from '../utils/practiceGame';

export function GamePlayScreen() {
  const { savePlayerResult, currentPlayerIndex, playerCount, victimType, setScreen, dataMode } = useGameContext();
  const { data, sensorOnline } = useGameData();
  const { seconds, isFinished, start } = useCountdown(120);
  const profile = CPR_PROFILES[victimType];
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [dataHistory, setDataHistory] = useState<DataPoint[]>([]);
  const [compressionPeaks, setCompressionPeaks] = useState<DataPoint[]>([]);
  const [lastCompressionDepth, setLastCompressionDepth] = useState(0);
  const dataRef = useRef(data);
  const peakRef = useRef(0);
  const isCompressingRef = useRef(false);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const finishedRef = useRef(false);
  const lastCompressionAtRef = useRef(0);
  const lastSensorCompressionCountRef = useRef<number | null>(null);

  useEffect(() => { start(); }, [start]);

  const recordCompression = useCallback((peak: number, bpm: number) => {
    const newPeak: DataPoint = { time: '', depth: peak, bpm, timestamp: Date.now() };
    const { points, newCombo } = calculatePoints(peak, bpm, comboRef.current, victimType);
    comboRef.current = newCombo;
    maxComboRef.current = Math.max(maxComboRef.current, newCombo);
    setLastCompressionDepth(peak);
    setCombo(newCombo);
    setMaxCombo(maxComboRef.current);
    setCompressionPeaks((previous) => [...previous, { ...newPeak, time: `${previous.length}` }]);
    if (points > 0) setScore((previous) => Math.min(100, previous + points));
  }, [victimType]);

  useEffect(() => {
    dataRef.current = dataMode === 'simulation' || sensorOnline ? data : null;
    if (!data || (dataMode !== 'simulation' && !sensorOnline)) return;

    if (typeof data.compression_count === 'number') {
      const previousCount = lastSensorCompressionCountRef.current;
      const events = getNewCompressionEvents(
        previousCount,
        data.compression_count,
        data.compression_peak_cm ?? data.depth,
        data.compression_bpm === null ? 0 : data.compression_bpm ?? data.bpm
      );
      events.forEach((event) => recordCompression(event.peakCm, event.bpm));
      lastSensorCompressionCountRef.current = data.compression_count;
      return;
    }

    if (data.depth >= 3) {
      isCompressingRef.current = true;
      peakRef.current = Math.max(peakRef.current, data.depth);
      return;
    }

    if (!isCompressingRef.current || peakRef.current < 3) return;
    const peak = peakRef.current;
    const now = Date.now();
    const minimumGapMs = 60_000 / Math.min(140, Math.max(80, data.bpm || 100)) * 0.72;
    if (now - lastCompressionAtRef.current < minimumGapMs) {
      isCompressingRef.current = false;
      peakRef.current = 0;
      return;
    }
    lastCompressionAtRef.current = now;
    recordCompression(peak, data.bpm);
    isCompressingRef.current = false;
    peakRef.current = 0;
  }, [data, dataMode, sensorOnline, recordCompression]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const reading = dataRef.current;
      if (!reading) return;
      setDataHistory((previous) => [...previous, {
        time: `${(previous.length * 0.2).toFixed(1)}s`,
        depth: reading.depth,
        bpm: reading.bpm,
        timestamp: Date.now()
      }].slice(-60));
    }, 200);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setDataHistory([]);
    setCompressionPeaks([]);
    setLastCompressionDepth(0);
    peakRef.current = 0;
    isCompressingRef.current = false;
    comboRef.current = 0;
    maxComboRef.current = 0;
    finishedRef.current = false;
    lastCompressionAtRef.current = 0;
    lastSensorCompressionCountRef.current = null;
  }, [currentPlayerIndex, profile.targetDepthCm.max, profile.targetDepthCm.min]);

  const finishSession = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const samples = dataHistory.filter((point) => point.depth >= 3);
    const averages = calculateAverages(samples);
    savePlayerResult({
      playerNumber: currentPlayerIndex + 1,
      score,
      grade: calculateGrade(score),
      properCompressionPercent: calculateProperPercent(compressionPeaks, victimType),
      avgDepth: averages.avgDepth,
      avgBpm: averages.avgBpm,
      maxCombo,
      victimType,
      dataHistory,
      compressionPeaks
    });
    setScreen(currentPlayerIndex + 1 < playerCount ? 'handoff' : 'final-results');
  }, [compressionPeaks, currentPlayerIndex, dataHistory, maxCombo, playerCount, savePlayerResult, score, setScreen, victimType]);

  useEffect(() => { if (isFinished) finishSession(); }, [finishSession, isFinished]);

  const currentBpm = dataMode === 'simulation' || sensorOnline ? data?.bpm ?? 0 : 0;
  const coach = getLiveCoachFeedback({
    sensorOnline: dataMode === 'simulation' || sensorOnline,
    victimType,
    depth: lastCompressionDepth,
    bpm: currentBpm,
    compressionCount: compressionPeaks.length
  });
  const feedback = {
    message: coach.action,
    tone: coach.severity === 'offline' ? 'urgent' as const : coach.severity === 'good' ? 'good' as const : 'caution' as const
  };
  const rotationPrompt = getRotationPrompt({ playerCount, secondsRemaining: seconds });
  const averages = calculateAverages(compressionPeaks);
  const rotationMessage = rotationPrompt?.message ?? (playerCount > 1 ? `다음 교대까지 ${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}` : '개인 실습 진행 중');

  const assessment = assessPracticeCompression({depth:lastCompressionDepth,bpm:currentBpm,recoil:null},victimType,combo);
  return <LivePracticeMonitor
    targetDepthRange={[profile.targetDepthCm.min,profile.targetDepthCm.max]}
    connected={dataMode === 'simulation' || sensorOnline}
    accuracyScore={null} grade={null}
    judgement={assessment.judgement} matchPercent={assessment.matchPercent} depthScore={assessment.depthScore} rateScore={assessment.rateScore} recoilLimited={false}
    victimLabel={profile.label}
    targetDepth={profile.guideDepth}
    handPlacement={profile.handPlacement}
    depth={dataMode === 'simulation' || sensorOnline ? lastCompressionDepth : 0}
    bpm={currentBpm}
    recoil={sensorOnline ? data?.recoil_percent ?? null : null}
    feedback={feedback.message}
    feedbackTone={feedback.tone}
    coach={coach}
    compressionCount={compressionPeaks.length}
    properPercent={calculateProperPercent(compressionPeaks, victimType)}
    averageDepth={averages.avgDepth}
    averageBpm={averages.avgBpm}
    score={score}
    combo={combo}
    secondsRemaining={seconds}
    playerLabel={`${currentPlayerIndex + 1}번 실습자`}
    rotationMessage={rotationMessage}
    history={compressionPeaks}
    onFinish={finishSession}
  />;
}
