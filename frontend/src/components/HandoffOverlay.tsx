import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon, CheckCircleIcon } from 'lucide-react';
import { useGameContext } from '../context/GameContext';

export function HandoffOverlay() {
  const { currentPlayerIndex, playerCount, proceedToNextPlayer } = useGameContext();

  const nextPlayerIndex = currentPlayerIndex + 1;
  const isLastPlayer = nextPlayerIndex >= playerCount;

  return (
    <div className="relative w-full h-screen min-h-screen overflow-hidden flex items-center justify-center font-body">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-surface-900/95 backdrop-blur-xl z-40"
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="relative z-50 text-center px-8"
      >
        {/* Completion Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: 'spring' }}
          className="flex justify-center mb-8"
        >
          <CheckCircleIcon
            className="w-32 h-32 text-neon-green"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(0, 255, 136, 0.8))'
            }}
          />
        </motion.div>

        {/* Player Completion Message */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-6xl font-heading text-neon-green text-glow-green tracking-wider mb-6"
        >
          플레이어 {currentPlayerIndex + 1} 종료!
        </motion.h1>

        {/* Next Player Message */}
        {!isLastPlayer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <p className="text-3xl font-body text-white/80">다음:</p>
            <div className="flex items-center gap-3">
              <ArrowRightIcon className="w-8 h-8 text-neon-cyan" />
              <p className="text-5xl font-heading text-neon-cyan text-glow-blue">
                플레이어 {nextPlayerIndex + 1}
              </p>
            </div>
          </motion.div>
        )}

        {/* Handoff Button */}
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          whileHover={{
            scale: 1.05,
            boxShadow: '0 0 50px rgba(0, 212, 255, 0.7)'
          }}
          whileTap={{ scale: 0.95 }}
          onClick={proceedToNextPlayer}
          className="
            px-20 py-8 rounded-3xl
            font-heading text-4xl tracking-wider
            text-surface-900
            bg-gradient-to-r from-neon-blue via-neon-cyan to-neon-blue
            shadow-neon-blue
            border-0 cursor-pointer
          "
        >
          {isLastPlayer ? '최종 결과 보기' : '교대하기'}
        </motion.button>

        {/* Instruction */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="mt-8"
        >
          <p className="text-lg text-white/50 font-body">
            {isLastPlayer ? '모든 플레이어가 완료했습니다' : '다음 플레이어가 준비되면 버튼을 클릭하세요'}
          </p>
          {!isLastPlayer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="mt-4 glass-card rounded-xl px-6 py-3 inline-block"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse" />
                <p className="text-sm text-white/70">
                  <span className="text-neon-orange font-semibold">중요:</span> 교대 시 CPR 중단은 10초 이내로 유지하세요
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
