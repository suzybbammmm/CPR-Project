import React from 'react';
import { motion } from 'framer-motion';
import { CrownIcon, TrophyIcon } from 'lucide-react';
import { PlayerResult } from '../types/game.types';
import { GradeBadge } from './GradeBadge';
import { getGradeColor } from '../utils/grading';

interface PlayerResultCardProps {
  result: PlayerResult;
  isWinner: boolean;
  rank: number;
}

export function PlayerResultCard({ result, isWinner, rank }: PlayerResultCardProps) {
  const gradeColor = getGradeColor(result.grade);

  const rankColors = ['#FBBF24', '#C0C0C0', '#CD7F32', '#00D4FF'];
  const accentColor = rankColors[rank - 1] || '#A855F7';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: (rank - 1) * 0.1 }}
      className={`
        glass-card rounded-3xl p-6
        border-2 transition-all duration-300
        ${isWinner ? 'neon-border-yellow' : 'border-white/10'}
      `}
      style={{
        boxShadow: isWinner
          ? '0 0 40px rgba(251, 191, 36, 0.4)'
          : undefined
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isWinner && (
            <CrownIcon
              className="w-8 h-8 text-neon-yellow"
              style={{
                filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.8))'
              }}
            />
          )}
          <h3 className="text-3xl font-heading text-white">
            플레이어 {result.playerNumber}
          </h3>
          {rank <= 3 && (
            <div
              className="px-3 py-1 rounded-full text-sm font-heading"
              style={{
                backgroundColor: `${accentColor}20`,
                color: accentColor,
                border: `1px solid ${accentColor}40`
              }}
            >
              {rank}등
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-white/50 font-body">점수</p>
            <p
              className="text-4xl font-heading"
              style={{ color: gradeColor, textShadow: `0 0 15px ${gradeColor}80` }}
            >
              {result.score.toLocaleString()}
            </p>
          </div>
          <div className="scale-75">
            <GradeBadge grade={result.grade} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Proper Compression Percent */}
        <div className="glass-card-light rounded-xl p-4">
          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">
            적정 압박률
          </p>
          <p className="text-3xl font-heading text-neon-green">
            {result.properCompressionPercent}%
          </p>
        </div>

        {/* Average Depth */}
        <div className="glass-card-light rounded-xl p-4">
          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">
            평균 깊이
          </p>
          <p className="text-3xl font-heading text-neon-blue">
            {result.avgDepth} <span className="text-lg text-white/50">cm</span>
          </p>
        </div>

        {/* Average BPM */}
        <div className="glass-card-light rounded-xl p-4">
          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">
            평균 속도
          </p>
          <p className="text-3xl font-heading text-neon-cyan">
            {result.avgBpm} <span className="text-lg text-white/50">BPM</span>
          </p>
        </div>

        {/* Max Combo */}
        <div className="glass-card-light rounded-xl p-4">
          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">
            최대 콤보
          </p>
          <p className="text-3xl font-heading text-neon-purple">
            x{result.maxCombo}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
