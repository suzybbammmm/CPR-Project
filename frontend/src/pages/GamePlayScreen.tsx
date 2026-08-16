import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon, ZapIcon } from 'lucide-react';
import { useGameContext } from '../context/GameContext';
import { useGameData } from '../hooks/useGameData';
import { useCountdown } from '../hooks/useCountdown';
import { calculatePoints, calculateAverages, calculateProperPercent } from '../utils/scoring';
import { calculateGrade } from '../utils/grading';
import { DataPoint } from '../types/game.types';
import { CPR_PROFILES, getCompressionFeedback, getRotationPrompt } from '../utils/cprGuidance';

function getDepthColor(depth: number, min: number, max: number): string {
  if (depth >= min && depth <= max) return '#00FF88';
  if (depth >= min - 1 && depth < min) return '#FBBF24';
  if (depth > max && depth <= max + 1) return '#FBBF24';
  return '#FF4444';
}
function getBpmColor(bpm: number): string {
  if (bpm >= 100 && bpm <= 120) return '#00FF88';
  if (bpm >= 85 && bpm < 100) return '#FBBF24';
  if (bpm > 120 && bpm <= 135) return '#FBBF24';
  return '#FF4444';
}
function getDepthLabel(depth: number, min: number, max: number): string {
  if (depth >= min && depth <= max) return '적정';
  if (depth < min) return '얕음';
  return '깊음';
}
function getBpmLabel(bpm: number): string {
  if (bpm >= 100 && bpm <= 120) return '적정';
  if (bpm < 100) return '느림';
  return '빠름';
}
export function GamePlayScreen() {
  const { savePlayerResult, currentPlayerIndex, playerCount, victimType, setScreen } = useGameContext();
  const { data } = useGameData();
  const { seconds, isFinished, start, formatTime } = useCountdown(120);
  const profile = CPR_PROFILES[victimType];

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [dataHistory, setDataHistory] = useState<DataPoint[]>([]); // For graph visualization
  const [, setCompressionPeaks] = useState<DataPoint[]>([]); // For proper % calculation
  const [isPressed, setIsPressed] = useState(false);
  const [smoothedDepth, setSmoothedDepth] = useState(5.4);
  const [peakDepth, setPeakDepth] = useState(5.4);

  // Use ref to store latest data
  const dataRef = useRef(data);
  const smoothedDepthRef = useRef(5.4);
  const peakDepthRef = useRef(5.4);
  const peakTimeRef = useRef(Date.now());

  // Moving average filter for depth (last 5 readings)
  const depthHistoryRef = useRef<number[]>([]);

  // Compression peak detection
  const compressionPeakRef = useRef(0);
  const isCompressingRef = useRef(false);
  const lastRawDepthRef = useRef(0);

  // Use refs for combo and maxCombo to avoid dependency issues
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const compressionPeaksRef = useRef<DataPoint[]>([]);

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data;

    // Update smoothed depth for display
    if (data) {
      const currentDepth = data.depth;
      const currentBpm = data.bpm;
      const now = Date.now();

      // Update moving average
      depthHistoryRef.current.push(currentDepth);

      // Keep only last 5 readings
      if (depthHistoryRef.current.length > 5) {
        depthHistoryRef.current.shift();
      }

      // Calculate average
      const sum = depthHistoryRef.current.reduce((a, b) => a + b, 0);
      const smoothed = sum / depthHistoryRef.current.length;
      setSmoothedDepth(smoothed);
      smoothedDepthRef.current = smoothed;

      // Peak hold logic: update peak if current depth is higher
      if (currentDepth > peakDepthRef.current) {
        peakDepthRef.current = currentDepth;
        peakTimeRef.current = now;
        setPeakDepth(currentDepth);
      } else {
        // Decay peak after 300ms
        const timeSincePeak = now - peakTimeRef.current;
        if (timeSincePeak > 300) {
          // Gradually decay peak towards current depth
          const decayRate = 0.15; // 15% decay per update
          const newPeak = Math.max(
            currentDepth,
            peakDepthRef.current - (peakDepthRef.current - currentDepth) * decayRate
          );
          peakDepthRef.current = newPeak;
          setPeakDepth(newPeak);
        }
      }

      // Compression peak detection for data sampling
      // Use absolute depth thresholds instead of relative changes
      const COMPRESSION_START_THRESHOLD = 3; // 3cm 이상 = 압박 중
      const RELEASE_THRESHOLD = 1.5; // 1.5cm 미만 = 이완됨
      const MIN_PEAK_DEPTH = 3; // 최소 3cm 이상 눌러야 유효한 압박

      if (currentDepth >= COMPRESSION_START_THRESHOLD) {
        // Deep enough to be considered a compression
        if (!isCompressingRef.current) {
          // Start of new compression
          isCompressingRef.current = true;
          compressionPeakRef.current = currentDepth;
        } else {
          // Update peak during compression
          compressionPeakRef.current = Math.max(compressionPeakRef.current, currentDepth);
        }
      } else if (currentDepth < RELEASE_THRESHOLD && isCompressingRef.current) {
        // Released after compression -> record the peak
        if (compressionPeakRef.current >= MIN_PEAK_DEPTH) {
          const peakDepthValue = compressionPeakRef.current;

          console.log('🎯 압박 피크 감지:', {
            피크깊이: peakDepthValue.toFixed(2),
            BPM: currentBpm,
            시간: new Date().toLocaleTimeString()
          });

          // Store compression peak for proper % calculation
          const newPeak = {
            time: `${compressionPeaksRef.current.length}`,
            depth: peakDepthValue,
            bpm: currentBpm,
            timestamp: now
          };
          compressionPeaksRef.current = [...compressionPeaksRef.current, newPeak];
          setCompressionPeaks(prev => [...prev, newPeak]);

          // Calculate points based on peak (outside setState) using ref
          const { points, newCombo } = calculatePoints(
            peakDepthValue,
            currentBpm,
            comboRef.current,
            victimType
          );

          // Update combo (both state and ref)
          comboRef.current = newCombo;
          setCombo(newCombo);

          // Update score if points earned
          if (points > 0) {
            setScore(prev => prev + points);
          }

          // Update max combo (both state and ref)
          if (newCombo > maxComboRef.current) {
            maxComboRef.current = newCombo;
            setMaxCombo(newCombo);
          }
        }

        // Reset for next compression
        isCompressingRef.current = false;
        compressionPeakRef.current = 0;
      }

      lastRawDepthRef.current = currentDepth;
    }
  }, [data, victimType]);

  // Get depth and bpm from data or use defaults
  // Use weighted average: 70% peak + 30% smoothed for faster response to peak compression
  const depth = peakDepth * 0.7 + smoothedDepth * 0.3;
  const bpm = data?.bpm ?? 108;
  // Start countdown timer on mount
  useEffect(() => {
    start();
  }, [start]);

  // Reset state when player changes
  useEffect(() => {
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setDataHistory([]);
    setCompressionPeaks([]);

    // Reset compression peak detection
    compressionPeakRef.current = 0;
    isCompressingRef.current = false;
    lastRawDepthRef.current = 0;

    // Reset combo refs
    comboRef.current = 0;
    maxComboRef.current = 0;
    compressionPeaksRef.current = [];
  }, [currentPlayerIndex]);

  // Handle isPressed state based on actual compression depth
  const lastDepthRef = useRef(0);
  const isPressedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!data) return;

    const currentDepth = data.depth;

    // Detect compression: if depth increased by more than 1cm
    if (currentDepth > lastDepthRef.current + 1) {
      setIsPressed(true);

      // Clear existing timeout
      if (isPressedTimeoutRef.current) {
        clearTimeout(isPressedTimeoutRef.current);
      }

      // Auto-release after 200ms
      isPressedTimeoutRef.current = setTimeout(() => {
        setIsPressed(false);
      }, 200);
    }
    // Detect release: if depth decreased significantly
    else if (currentDepth < lastDepthRef.current - 1) {
      setIsPressed(false);
      if (isPressedTimeoutRef.current) {
        clearTimeout(isPressedTimeoutRef.current);
      }
    }

    lastDepthRef.current = currentDepth;

    return () => {
      if (isPressedTimeoutRef.current) {
        clearTimeout(isPressedTimeoutRef.current);
      }
    };
  }, [data]);

  // Real-time data sampling for graph visualization (continuous wave form)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentData = dataRef.current;
      if (!currentData) return;

      // Sample current depth and BPM every 200ms for graph
      setDataHistory(prev => [...prev, {
        time: `${(prev.length * 0.2).toFixed(1)}s`,
        depth: currentData.depth,
        bpm: currentData.bpm,
        timestamp: Date.now()
      }]);
    }, 200); // Sample every 200ms for smooth wave visualization

    return () => clearInterval(interval);
  }, []); // Only create interval once on mount

  // Note: Scoring logic happens in real-time based on compression peaks (not interval)

  // Handle game finish (manual or timer)
  const handleFinish = useCallback(() => {
    console.log('🏁 게임 종료! 데이터 분석 시작...');
    console.log('📊 수집된 그래프 데이터 개수:', dataHistory.length);
    console.log('🎯 압박 피크 개수 (ref):', compressionPeaksRef.current.length);
    console.log('🎯 압박 피크 데이터 (ref):', compressionPeaksRef.current);

    // Use different data for different calculations:
    // - Proper %: Use peaks (more accurate for counting good compressions)
    // - Average depth/bpm: Use all compression samples (more representative)

    const peaksForProper = compressionPeaksRef.current.length > 0
      ? compressionPeaksRef.current
      : dataHistory.filter(d => d.depth >= 3);

    const samplesForAverage = dataHistory.filter(d => d.depth >= 3);

    const { avgDepth, avgBpm } = calculateAverages(samplesForAverage);
    const properPercent = calculateProperPercent(peaksForProper, victimType);
    const grade = calculateGrade(score);

    console.log('📈 분석 결과:', {
      score,
      grade,
      properPercent,
      avgDepth,
      avgBpm,
      maxCombo,
      graphDataCount: dataHistory.length,
      compressionSamplesCount: samplesForAverage.length,
      peakCount: peaksForProper.length
    });

    const result = {
      playerNumber: currentPlayerIndex + 1,
      score,
      grade,
      properCompressionPercent: properPercent,
      avgDepth,
      avgBpm,
      maxCombo,
      victimType,
      dataHistory // Keep graph data for visualization
    };

    savePlayerResult(result);

    if (currentPlayerIndex + 1 < playerCount) {
      setScreen('handoff');
    } else {
      setScreen('final-results');
    }
  }, [score, dataHistory, maxCombo, currentPlayerIndex, playerCount, savePlayerResult, setScreen, victimType]);

  // Auto-finish when timer ends
  useEffect(() => {
    if (isFinished) {
      handleFinish();
    }
  }, [isFinished, handleFinish]);
  const depthPercent = Math.min(Math.max(depth / 10 * 100, 0), 100);
  const depthColor = getDepthColor(depth, profile.targetDepthCm.min, profile.targetDepthCm.max);
  const bpmColor = getBpmColor(bpm);
  const feedback = getCompressionFeedback(victimType, depth, bpm);
  const rotationPrompt = getRotationPrompt({ playerCount, secondsRemaining: seconds });
  return (
    <div className="relative w-full h-screen min-h-screen overflow-hidden flex flex-col font-body">
      {/* ===== ROTATION GUIDE BANNER ===== */}
      {playerCount > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative z-20 flex justify-center pt-4"
        >
          <div className="glass-card rounded-full px-6 py-2 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
            <p className="text-sm font-body text-white/70 tracking-wide">
              <span className="text-neon-blue font-semibold">{currentPlayerIndex + 1}번 실습자 진행 중:</span> 2분마다 교대하고, 중단은 10초 이내로 유지하세요
            </p>
          </div>
        </motion.div>
      )}

      {/* ===== TOP BAR ===== */}
      <div className="relative z-20 flex items-center justify-between px-8 py-5">
        {/* Score */}
        <div className="flex items-center gap-4">
          <div className="glass-card rounded-2xl px-8 py-4 flex items-center gap-4">
            <ZapIcon
              className="w-7 h-7 text-neon-yellow"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.6))'
              }} />
            
            <div>
              <p className="text-xs font-body text-white/50 uppercase tracking-widest">
                현재 점수
              </p>
              <p className="text-4xl font-heading text-neon-yellow text-glow-yellow tracking-wider">
                {score.toLocaleString()}
                <span className="text-xl text-neon-yellow/70 ml-1">점</span>
              </p>
            </div>
          </div>
          {/* Timer */}
          <div className="glass-card rounded-2xl px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-body text-white/50 uppercase tracking-widest">
                남은 시간
              </p>
              {seconds <= 15 && seconds > 0 && playerCount > 1 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-neon-orange"
                  style={{
                    boxShadow: '0 0 8px rgba(255, 107, 53, 0.8)'
                  }}
                />
              )}
            </div>
            <p
              className={`text-2xl font-heading ${
                seconds <= 15 && seconds > 0 && playerCount > 1 ? 'text-neon-orange' : 'text-white/80'
              }`}
              style={
                seconds <= 15 && seconds > 0 && playerCount > 1
                  ? { textShadow: '0 0 10px rgba(255, 107, 53, 0.5)' }
                  : undefined
              }
            >
              {formatTime}
            </p>
            {seconds <= 15 && seconds > 0 && playerCount > 1 && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-body text-neon-orange/80 mt-1"
              >
                곧 교대!
              </motion.p>
            )}
          </div>
        </div>

        {/* Combo */}
        <motion.div
          animate={{
            scale: combo > 0 ? [1, 1.05, 1] : 1
          }}
          transition={{
            duration: 0.3
          }}
          className="glass-card rounded-2xl px-8 py-4 flex items-center gap-4"
          style={{
            boxShadow:
            combo > 5 ?
            `0 0 ${Math.min(combo * 3, 40)}px rgba(168, 85, 247, ${Math.min(combo * 0.04, 0.6)})` :
            undefined,
            borderColor:
            combo > 5 ?
            `rgba(168, 85, 247, ${Math.min(combo * 0.05, 0.5)})` :
            undefined,
            minWidth: '200px'
          }}>

          <div className="w-full">
            <p className="text-xs font-body text-white/50 uppercase tracking-widest text-right">
              콤보
            </p>
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-lg font-body text-neon-purple/70">
                COMBO
              </span>
              <motion.span
                key={combo}
                initial={{
                  scale: 1.4,
                  opacity: 0.5
                }}
                animate={{
                  scale: 1,
                  opacity: 1
                }}
                className="font-heading text-neon-purple text-glow-purple text-4xl"
                style={{
                  display: 'inline-block',
                  minWidth: '80px',
                  textAlign: 'right'
                }}>

                x{combo}
              </motion.span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="relative z-20 mx-auto -mt-2 rounded-full border border-neon-green/25 bg-surface-800/75 px-5 py-2 text-center text-sm backdrop-blur">
        <span className="font-semibold text-neon-green">압박 대상: {profile.label}</span>
        <span className="mx-2 text-white/30">|</span>
        <span className="text-white/70">목표 깊이 {profile.guideDepth}</span>
        <span className="mx-2 text-white/30">|</span>
        <span className="text-white/50">{profile.handPlacement}</span>
      </div>

      {/* ===== MAIN AREA ===== */}
      <div className="relative z-20 flex-1 flex items-center justify-center px-8 gap-8">
        {/* LEFT — Depth Gauge */}
        <div className="flex flex-col items-center gap-3 w-32">
          <p className="text-sm font-body text-white/50 uppercase tracking-widest">
            압박 깊이
          </p>
          <div className="relative w-16 h-[340px] rounded-full bg-surface-700/80 border border-white/10 overflow-hidden">
            {/* Target zone 5-6cm = 50%-60% from bottom */}
            <div
              className="absolute left-0 right-0 bg-neon-green/15 border-y border-neon-green/30"
              style={{
                bottom: '50%',
                height: '10%'
              }} />
            
            <div
              className="absolute left-1/2 -translate-x-1/2 text-[10px] font-body text-neon-green/60 whitespace-nowrap"
              style={{
                bottom: '58%'
              }}>
              
              6cm
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 text-[10px] font-body text-neon-green/60 whitespace-nowrap"
              style={{
                bottom: '48%'
              }}>
              
              5cm
            </div>
            {/* Fill bar */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-b-full"
              animate={{
                height: `${depthPercent}%`
              }}
              transition={{
                duration: 0.15,
                ease: 'easeOut'
              }}
              style={{
                backgroundColor: depthColor,
                boxShadow: `0 0 20px ${depthColor}40, inset 0 0 20px ${depthColor}20`
              }} />
            
          </div>
          <div className="text-center">
            <motion.p
              key={depth.toFixed(1)}
              initial={{
                scale: 1.2
              }}
              animate={{
                scale: 1
              }}
              className="text-3xl font-heading"
              style={{
                color: depthColor,
                textShadow: `0 0 15px ${depthColor}80`
              }}>
              
              {depth.toFixed(1)}
            </motion.p>
            <p className="text-xs text-white/40 font-body">cm</p>
            <p
              className="text-xs font-body mt-1 px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${depthColor}20`,
                color: depthColor
              }}>
              
              {getDepthLabel(depth, profile.targetDepthCm.min, profile.targetDepthCm.max)}
            </p>
          </div>
        </div>

        {/* CENTER — Heart + Rhythm Ring */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-lg">
          <div className="relative flex items-center justify-center">
            {/* Outer rhythm ring */}
            <motion.div
              className="absolute w-72 h-72 rounded-full border-2 border-neon-blue/30"
              animate={{
                scale: isPressed ? [1, 1.08, 1] : 1,
                borderColor: isPressed ?
                'rgba(0, 255, 136, 0.5)' :
                'rgba(0, 212, 255, 0.3)'
              }}
              transition={{
                duration: 0.3
              }}
              style={{
                boxShadow: '0 0 30px rgba(0, 212, 255, 0.1)'
              }} />
            
            {/* Second ring */}
            <div className="absolute w-80 h-80 rounded-full border border-white/5 animate-spin-slow" />
            {/* Dashed ring */}
            <motion.div
              className="absolute w-64 h-64 rounded-full"
              style={{
                border: '2px dashed rgba(0, 212, 255, 0.15)'
              }}
              animate={{
                rotate: 360
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'linear'
              }} />
            

            {/* Heart icon */}
            <motion.div
              animate={{
                scale: isPressed ? 0.75 : 1,
                y: isPressed ? 8 : 0
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 15
              }}
              className="relative z-10 flex items-center justify-center">
              
              <HeartIcon
                className="w-32 h-32"
                fill={isPressed ? '#00FF88' : '#FF4466'}
                stroke="none"
                style={{
                  filter: isPressed ?
                  'drop-shadow(0 0 30px rgba(0, 255, 136, 0.7)) drop-shadow(0 0 60px rgba(0, 255, 136, 0.3))' :
                  'drop-shadow(0 0 20px rgba(255, 68, 102, 0.5)) drop-shadow(0 0 50px rgba(255, 68, 102, 0.2))'
                }} />
              
              {/* Press flash */}
              <AnimatePresence>
                {isPressed &&
                <motion.div
                  initial={{
                    scale: 0.8,
                    opacity: 0.8
                  }}
                  animate={{
                    scale: 2,
                    opacity: 0
                  }}
                  exit={{
                    opacity: 0
                  }}
                  transition={{
                    duration: 0.5
                  }}
                  className="absolute w-32 h-32 rounded-full bg-neon-green/20" />

                }
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Rhythm guide text */}
          <motion.p
            animate={{
              opacity: isPressed ? 1 : 0.4
            }}
            className="mt-8 text-lg font-body text-neon-blue/70 tracking-widest">
            
            {isPressed ? '누르는 중...' : '리듬에 맞춰 압박!'}
          </motion.p>
        </div>

        {/* RIGHT — BPM Gauge */}
        <div className="flex flex-col items-center gap-3 w-32">
          <p className="text-sm font-body text-white/50 uppercase tracking-widest">
            압박 속도
          </p>
          <div className="relative w-16 h-[340px] rounded-full bg-surface-700/80 border border-white/10 overflow-hidden">
            {/* Target zone 100-120 BPM mapped to gauge: (100/180)*100=55.5%, (120/180)*100=66.7% */}
            <div
              className="absolute left-0 right-0 bg-neon-green/15 border-y border-neon-green/30"
              style={{
                bottom: '55.5%',
                height: '11.2%'
              }} />
            
            <div
              className="absolute left-1/2 -translate-x-1/2 text-[10px] font-body text-neon-green/60 whitespace-nowrap"
              style={{
                bottom: '65%'
              }}>
              
              120
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 text-[10px] font-body text-neon-green/60 whitespace-nowrap"
              style={{
                bottom: '53%'
              }}>
              
              100
            </div>
            {/* Fill */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-b-full"
              animate={{
                height: `${Math.min(bpm / 180 * 100, 100)}%`
              }}
              transition={{
                duration: 0.3,
                ease: 'easeOut'
              }}
              style={{
                backgroundColor: bpmColor,
                boxShadow: `0 0 20px ${bpmColor}40, inset 0 0 20px ${bpmColor}20`
              }} />
            
          </div>
          <div className="text-center">
            <motion.p
              key={bpm}
              initial={{
                scale: 1.2
              }}
              animate={{
                scale: 1
              }}
              className="text-3xl font-heading"
              style={{
                color: bpmColor,
                textShadow: `0 0 15px ${bpmColor}80`
              }}>
              
              {bpm}
            </motion.p>
            <p className="text-xs text-white/40 font-body">BPM</p>
            <p
              className="text-xs font-body mt-1 px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${bpmColor}20`,
                color: bpmColor
              }}>
              
              {getBpmLabel(bpm)}
            </p>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM — Feedback + End Button ===== */}
      <div className="relative z-20 flex items-center justify-between px-8 py-5">
        {/* Feedback message */}
        <div className="flex-1 flex justify-center">
          <AnimatePresence mode="wait">
            {rotationPrompt?.kind === 'warning' ? (
              <motion.div
                key="rotation-warning"
                initial={{
                  opacity: 0,
                  scale: 0.9
                }}
                animate={{
                  opacity: 1,
                  scale: 1
                }}
                exit={{
                  opacity: 0,
                  scale: 0.9
                }}
                transition={{
                  duration: 0.3
                }}
                className="glass-card rounded-2xl px-10 py-4 border-2 border-neon-orange/40"
                style={{
                  boxShadow: '0 0 30px rgba(255, 107, 53, 0.3)'
                }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity
                    }}
                  >
                    ⚠️
                  </motion.div>
                  <div>
                    <p className="text-2xl font-heading text-neon-orange tracking-wider"
                      style={{
                        textShadow: '0 0 15px rgba(255, 107, 53, 0.5)'
                      }}
                    >
                      교대 준비! {seconds}초 남음
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      교대 시 중단 시간은 10초 이내로 유지하세요
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`${victimType}-${Math.round(depth * 10)}-${bpm}`}
                initial={{
                  opacity: 0,
                  y: 15
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                exit={{
                  opacity: 0,
                  y: -15
                }}
                transition={{
                  duration: 0.4
                }}
                className="glass-card rounded-2xl px-10 py-4">

                <p className="text-2xl font-heading text-white/90 tracking-wider text-glow-white">
                  {feedback.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* End game button */}
        <motion.button
          whileHover={{
            scale: 1.05,
            boxShadow: '0 0 30px rgba(255, 107, 53, 0.5)'
          }}
          whileTap={{
            scale: 0.95
          }}
          onClick={handleFinish}
          className="px-8 py-4 rounded-2xl font-heading text-xl tracking-wider text-white bg-gradient-to-r from-neon-orange to-red-500 shadow-neon-orange border-0 cursor-pointer">

          게임 종료
        </motion.button>
      </div>
    </div>);

}
