import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LivePracticeMonitor } from '../components/LivePracticeMonitor';
import { useGameContext } from '../context/GameContext';
import { useGameData } from '../hooks/useGameData';
import { useCountdown } from '../hooks/useCountdown';
import { CPR_PROFILES, getCompressionFeedback, getRotationPrompt } from '../utils/cprGuidance';
import { calculateAverages, calculatePoints, calculateProperPercent } from '../utils/scoring';
import { calculateGrade } from '../utils/grading';
import { DataPoint } from '../types/game.types';

export function GamePlayScreen() {
  const { savePlayerResult, currentPlayerIndex, playerCount, victimType, setScreen } = useGameContext();
  const { data } = useGameData();
  const { seconds, isFinished, start } = useCountdown(120);
  const profile = CPR_PROFILES[victimType];
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [dataHistory, setDataHistory] = useState<DataPoint[]>([]);
  const [compressionPeaks, setCompressionPeaks] = useState<DataPoint[]>([]);
  const [lastCompressionDepth, setLastCompressionDepth] = useState((profile.targetDepthCm.min + profile.targetDepthCm.max) / 2);
  const dataRef = useRef(data);
  const peakRef = useRef(0);
  const isCompressingRef = useRef(false);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => { start(); }, [start]);

  useEffect(() => {
    dataRef.current = data;
    if (!data) return;

    if (data.depth >= 3) {
      isCompressingRef.current = true;
      peakRef.current = Math.max(peakRef.current, data.depth);
      return;
    }

    if (!isCompressingRef.current || peakRef.current < 3) return;
    const peak = peakRef.current;
    const newPeak: DataPoint = { time: `${compressionPeaks.length}`, depth: peak, bpm: data.bpm, timestamp: Date.now() };
    const { points, newCombo } = calculatePoints(peak, data.bpm, comboRef.current, victimType);
    comboRef.current = newCombo;
    maxComboRef.current = Math.max(maxComboRef.current, newCombo);
    setLastCompressionDepth(peak);
    setCombo(newCombo);
    setMaxCombo(maxComboRef.current);
    setCompressionPeaks((previous) => [...previous, newPeak]);
    if (points > 0) setScore((previous) => previous + points);
    isCompressingRef.current = false;
    peakRef.current = 0;
  }, [compressionPeaks.length, data, victimType]);

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
    setLastCompressionDepth((profile.targetDepthCm.min + profile.targetDepthCm.max) / 2);
    peakRef.current = 0;
    isCompressingRef.current = false;
    comboRef.current = 0;
    maxComboRef.current = 0;
    finishedRef.current = false;
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
      dataHistory
    });
    setScreen(currentPlayerIndex + 1 < playerCount ? 'handoff' : 'final-results');
  }, [compressionPeaks, currentPlayerIndex, dataHistory, maxCombo, playerCount, savePlayerResult, score, setScreen, victimType]);

  useEffect(() => { if (isFinished) finishSession(); }, [finishSession, isFinished]);

  const currentDepth = data?.depth ?? 0;
  const currentBpm = data?.bpm ?? 0;
  const feedback = getCompressionFeedback(victimType, lastCompressionDepth, currentBpm || 108);
  const rotationPrompt = getRotationPrompt({ playerCount, secondsRemaining: seconds });
  const averages = calculateAverages(compressionPeaks);
  const rotationMessage = rotationPrompt?.message ?? (playerCount > 1 ? `다음 교대까지 ${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}` : '개인 실습 진행 중');

  return <LivePracticeMonitor
    victimLabel={profile.label}
    targetDepth={profile.guideDepth}
    handPlacement={profile.handPlacement}
    depth={currentDepth}
    bpm={currentBpm}
    feedback={feedback.message}
    feedbackTone={feedback.tone}
    compressionCount={compressionPeaks.length}
    properPercent={calculateProperPercent(compressionPeaks, victimType)}
    averageDepth={averages.avgDepth}
    averageBpm={averages.avgBpm}
    score={score}
    combo={combo}
    secondsRemaining={seconds}
    playerLabel={`${currentPlayerIndex + 1}번 실습자`}
    rotationMessage={rotationMessage}
    history={dataHistory}
    onFinish={finishSession}
  />;
}
