import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon, ZapIcon, ActivityIcon } from 'lucide-react';
import { useGameContext } from '../context/GameContext';
import { useGameData } from '../hooks/useGameData';
import { useCountdown } from '../hooks/useCountdown';
import { calculatePoints, calculateAverages, calculateProperPercent } from '../utils/scoring';
import { calculateGrade } from '../utils/grading';
import { DataPoint } from '../types/game.types';

const FEEDBACK_MESSAGES = [
'좋아요! 👍',
'정확한 압박입니다! ✅',
'속도를 조금 더 유지하세요! 💪',
'완벽한 깊이! 🎯',
'리듬이 좋습니다! 🎵',
'조금 더 깊게 눌러주세요! ⬇️',
'훌륭합니다! 계속 유지! 🔥'];

function getDepthColor(depth: number): string {
  if (depth >= 5 && depth <= 6) return '#00FF88';
  if (depth >= 4 && depth < 5) return '#FBBF24';
  if (depth > 6 && depth <= 7) return '#FBBF24';
  return '#FF4444';
}
function getBpmColor(bpm: number): string {
  if (bpm >= 100 && bpm <= 120) return '#00FF88';
  if (bpm >= 85 && bpm < 100) return '#FBBF24';
  if (bpm > 120 && bpm <= 135) return '#FBBF24';
  return '#FF4444';
}
function getDepthLabel(depth: number): string {
  if (depth >= 5 && depth <= 6) return '적정';
  if (depth < 5) return '얕음';
  return '깊음';
}
function getBpmLabel(bpm: number): string {
  if (bpm >= 100 && bpm <= 120) return '적정';
  if (bpm < 100) return '느림';
  return '빠름';
}
export function GamePlayScreen() {
  const { savePlayerResult, currentPlayerIndex, playerCount, setScreen } = useGameContext();
  const { data, isConnected } = useGameData();
  const { seconds, isFinished, start, formatTime } = useCountdown(120);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [dataHistory, setDataHistory] = useState<DataPoint[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(FEEDBACK_MESSAGES[0]);
  const [feedbackKey, setFeedbackKey] = useState(0);
  const [smoothedDepth, setSmoothedDepth] = useState(5.4);

  // Use ref to store latest data
  const dataRef = useRef(data);
  const smoothedDepthRef = useRef(5.4);

  // Moving average filter for depth (last 5 readings)
  const depthHistoryRef = useRef<number[]>([]);

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data;

    // Update smoothed depth for display
    if (data) {
      depthHistoryRef.current.push(data.depth);

      // Keep only last 5 readings
      if (depthHistoryRef.current.length > 5) {
        depthHistoryRef.current.shift();
      }

      // Calculate average
      const sum = depthHistoryRef.current.reduce((a, b) => a + b, 0);
      const smoothed = sum / depthHistoryRef.current.length;
      setSmoothedDepth(smoothed);
      smoothedDepthRef.current = smoothed;
    }
  }, [data]);

  // Get depth and bpm from data or use defaults
  const depth = smoothedDepth;
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
    setFeedbackKey(0);
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

  // Scoring logic - sample data at regular intervals
  useEffect(() => {
    const interval = setInterval(() => {
      const currentData = dataRef.current;
      if (!currentData) return;

      // Use smoothed depth and current bpm
      const rawDepth = currentData.depth;
      const currentDepth = smoothedDepthRef.current; // Use the smoothed value from ref
      const currentBpm = currentData.bpm;

      console.log('📊 데이터 샘플링:', {
        원본깊이: rawDepth.toFixed(2),
        스무딩깊이: currentDepth.toFixed(2),
        bpm: currentBpm
      });

      // Calculate points and combo using smoothed depth
      setCombo(prevCombo => {
        const { points, newCombo } = calculatePoints(currentDepth, currentBpm, prevCombo);
        console.log('🎯 콤보 계산:', {
          원본깊이: rawDepth.toFixed(2),
          스무딩깊이: currentDepth.toFixed(2),
          bpm: currentBpm,
          prevCombo,
          newCombo,
          points,
          isProper: currentDepth >= 5 && currentDepth <= 6 && currentBpm >= 100 && currentBpm <= 120
        });

        // Update score
        if (points > 0) {
          setScore(prev => {
            const newScore = prev + points;
            console.log('💰 점수 업데이트:', prev, '+', points, '=', newScore);
            return newScore;
          });
        }

        // Update max combo
        setMaxCombo(prev => Math.max(prev, newCombo));

        return newCombo;
      });

      // Track data history for charts (use smoothed depth)
      setDataHistory(prev => [...prev, {
        time: `${prev.length}s`,
        depth: currentDepth,
        bpm: currentBpm,
        timestamp: Date.now()
      }]);
    }, 500); // Sample every 500ms (2 times per second)

    return () => clearInterval(interval);
  }, []); // Only create interval once on mount

  // Rotate feedback messages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeedback(
        FEEDBACK_MESSAGES[Math.floor(Math.random() * FEEDBACK_MESSAGES.length)]
      );
      setFeedbackKey((k) => k + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Handle game finish (manual or timer)
  const handleFinish = useCallback(() => {
    console.log('🏁 게임 종료! 데이터 분석 시작...');
    console.log('📊 수집된 데이터 개수:', dataHistory.length);

    const { avgDepth, avgBpm } = calculateAverages(dataHistory);
    const properPercent = calculateProperPercent(dataHistory);
    const grade = calculateGrade(score);

    console.log('📈 분석 결과:', {
      score,
      grade,
      properPercent,
      avgDepth,
      avgBpm,
      maxCombo,
      dataCount: dataHistory.length
    });

    const result = {
      playerNumber: currentPlayerIndex + 1,
      score,
      grade,
      properCompressionPercent: properPercent,
      avgDepth,
      avgBpm,
      maxCombo,
      dataHistory
    };

    savePlayerResult(result);

    if (currentPlayerIndex + 1 < playerCount) {
      setScreen('handoff');
    } else {
      setScreen('final-results');
    }
  }, [score, dataHistory, maxCombo, currentPlayerIndex, playerCount, savePlayerResult, setScreen]);

  // Auto-finish when timer ends
  useEffect(() => {
    if (isFinished) {
      handleFinish();
    }
  }, [isFinished, handleFinish]);
  const depthPercent = Math.min(Math.max(depth / 10 * 100, 0), 100);
  const depthColor = getDepthColor(depth);
  const bpmColor = getBpmColor(bpm);
  const comboScale = Math.min(1 + combo * 0.02, 2);
  return (
    <div className="relative w-full h-screen min-h-screen overflow-hidden flex flex-col font-body">
      {/* ===== ROTATION GUIDE BANNER ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-20 flex justify-center pt-4"
      >
        <div className="glass-card rounded-full px-6 py-2 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
          <p className="text-sm font-body text-white/70 tracking-wide">
            <span className="text-neon-blue font-semibold">가이드라인:</span> CPR은 2분마다 교대하는 것을 권장합니다
          </p>
        </div>
      </motion.div>

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
              {seconds <= 15 && seconds > 0 && (
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
                seconds <= 15 && seconds > 0 ? 'text-neon-orange' : 'text-white/80'
              }`}
              style={
                seconds <= 15 && seconds > 0
                  ? { textShadow: '0 0 10px rgba(255, 107, 53, 0.5)' }
                  : undefined
              }
            >
              {formatTime}
            </p>
            {seconds <= 15 && seconds > 0 && (
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
                duration: 0.4,
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
              
              {getDepthLabel(depth)}
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
                duration: 0.5,
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
            {seconds <= 10 && seconds > 0 ? (
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
                key={feedbackKey}
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
                  {currentFeedback}
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