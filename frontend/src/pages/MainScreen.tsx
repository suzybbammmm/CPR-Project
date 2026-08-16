import React from 'react';
import { motion } from 'framer-motion';
import { HeartIcon, UsersIcon } from 'lucide-react';
import { useGameContext } from '../context/GameContext';
import { CPR_PROFILES, VictimType } from '../utils/cprGuidance';

const PLAYER_OPTIONS = [1, 2, 3, 4];

export function MainScreen() {
  const { playerCount, setPlayerCount, victimType, setVictimType, startGame, dataMode } = useGameContext();

  return (
    <div className="relative w-full h-screen min-h-screen overflow-hidden flex flex-col items-center justify-center font-body">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <HeartIcon
            className="w-20 h-20"
            fill="#FF4466"
            stroke="none"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(255, 68, 102, 0.7))'
            }}
          />
        </div>
        <h1 className="text-7xl font-heading text-neon-blue text-glow-blue tracking-wider mb-2">
          CPR 게임
        </h1>
        <p className="text-xl text-white/60 font-body">
          심폐소생술 시뮬레이션 트레이닝
        </p>
        <p className="text-sm text-neon-cyan/60 mt-2">
          모드: {dataMode === 'websocket' ? 'WebSocket (실제 센서)' : '시뮬레이션'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-3xl px-8 mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <HeartIcon className="w-5 h-5 text-neon-green" />
          <p className="text-xl font-heading text-white/80">압박 대상 선택</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(CPR_PROFILES) as VictimType[]).map(type => {
            const profile = CPR_PROFILES[type];
            const selected = victimType === type;
            return (
              <motion.button
                key={type}
                onClick={() => setVictimType(type)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`glass-card rounded-2xl px-4 py-4 text-left transition-all ${selected ? 'neon-border-green' : 'border-white/10'}`}
                style={{ boxShadow: selected ? '0 0 24px rgba(0,255,136,0.22)' : undefined }}
              >
                <p className="font-heading text-xl text-white">{profile.label}</p>
                <p className="mt-1 text-xs text-white/50">{profile.description}</p>
                <p className="mt-2 text-sm font-semibold text-neon-green">{profile.guideDepth}</p>
              </motion.button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-white/40">교육용 가이드 · 실제 상황에서는 정식 심폐소생술 교육을 따르세요.</p>
      </motion.div>

      {/* Player Selection */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="w-full max-w-3xl px-8 mb-10"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <UsersIcon className="w-6 h-6 text-neon-purple" />
          <p className="text-xl font-heading text-white/80">인원 선택</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {PLAYER_OPTIONS.map(count => (
            <motion.button
              key={count}
              onClick={() => setPlayerCount(count)}
              className={`
                glass-card rounded-2xl px-8 py-6
                transition-all duration-300
                ${playerCount === count ? 'neon-border-blue' : 'border-white/10'}
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                boxShadow: playerCount === count
                  ? '0 0 30px rgba(0, 212, 255, 0.4)'
                  : undefined
              }}
            >
              <p className="text-5xl font-heading text-white mb-2">{count}</p>
              <p className="text-sm text-white/50 font-body">
                {count === 1 ? '싱글' : '멀티'}
              </p>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Start Button */}
      <motion.button
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        whileHover={{
          scale: 1.05,
          boxShadow: '0 0 40px rgba(0, 255, 136, 0.6)'
        }}
        whileTap={{ scale: 0.95 }}
        onClick={startGame}
        className="
          px-16 py-6 rounded-2xl
          font-heading text-3xl tracking-wider
          text-surface-900
          bg-gradient-to-r from-neon-green to-neon-cyan
          shadow-neon-green
          border-0 cursor-pointer
        "
      >
        게임 시작
      </motion.button>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="absolute bottom-8 text-center"
      >
        <p className="text-sm text-white/40 font-body">
          각 플레이어는 2분 동안 CPR을 수행합니다
        </p>
      </motion.div>
    </div>
  );
}
