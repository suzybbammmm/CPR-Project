import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HomeIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer
} from 'recharts';
import { useGameContext } from '../context/GameContext';
import { PlayerResultCard } from '../components/PlayerResultCard';
import { DataPoint } from '../types/game.types';
import { AiSessionAnalysis } from '../components/AiSessionAnalysis';
import { CPR_PROFILES } from '../utils/cprGuidance';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xl">
        <p className="text-slate-600 text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="font-heading text-xl"
            style={{ color: entry.color }}
          >
            {entry.name}: {entry.value.toFixed(1)}{' '}
            {entry.name === '깊이' ? 'cm' : 'BPM'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface PlayerChartsProps {
  playerNumber: number;
  dataHistory: DataPoint[];
  victimType: keyof typeof CPR_PROFILES;
  isExpanded: boolean;
  onToggle: () => void;
}

function PlayerCharts({ playerNumber, dataHistory, victimType, isExpanded, onToggle }: PlayerChartsProps) {
  const profile = CPR_PROFILES[victimType];
  // Sample data for cleaner charts (every 10th point)
  const sampledData = dataHistory.filter((_, index) => index % 10 === 0);

  // Transform data for charts (map depth and bpm separately)
  const chartData = sampledData.map(point => ({
    time: point.time,
    depth: point.depth,
    speed: point.bpm
  }));

  return (
    <div className="mb-6">
      {/* Toggle Button */}
      <motion.button
        onClick={onToggle}
        className="
          w-full glass-card rounded-2xl p-4
          flex items-center justify-between
          hover:bg-white/10 transition-all duration-300
        "
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <p className="text-xl font-heading text-white">
          플레이어 {playerNumber} 상세 그래프
        </p>
        {isExpanded ? (
          <ChevronUpIcon className="w-6 h-6 text-neon-cyan" />
        ) : (
          <ChevronDownIcon className="w-6 h-6 text-neon-cyan" />
        )}
      </motion.button>

      {/* Charts */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4"
        >
          {/* Depth Chart */}
          <div className="bg-white shadow-lg rounded-3xl p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading text-slate-800 tracking-wide">
                압박 깊이 변화
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-slate-500 text-sm font-body">
                  적정 구간 ({profile.guideDepth})
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="rgba(100,116,139,0.8)"
                    tick={{ fill: 'rgba(100,116,139,0.8)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    stroke="rgba(100,116,139,0.8)"
                    tick={{ fill: 'rgba(100,116,139,0.8)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceArea y1={profile.targetDepthCm.min} y2={profile.targetDepthCm.max} fill="#34D399" fillOpacity={0.2} />
                  <Line
                    type="monotone"
                    dataKey="depth"
                    name="깊이"
                    stroke="#60A5FA"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Speed Chart */}
          <div className="bg-white shadow-lg rounded-3xl p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading text-slate-800 tracking-wide">
                압박 속도 변화
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-slate-500 text-sm font-body">
                  목표 구간 (100-120 BPM)
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="rgba(100,116,139,0.8)"
                    tick={{ fill: 'rgba(100,116,139,0.8)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[60, 160]}
                    stroke="rgba(100,116,139,0.8)"
                    tick={{ fill: 'rgba(100,116,139,0.8)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceArea y1={100} y2={120} fill="#34D399" fillOpacity={0.2} />
                  <Line
                    type="monotone"
                    dataKey="speed"
                    name="속도"
                    stroke="#34D399"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function MultiplayerResultScreen() {
  const { allPlayerResults, returnToMain } = useGameContext();
  const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null);

  // Sort players by score (descending)
  const sortedResults = [...allPlayerResults].sort((a, b) => b.score - a.score);
  const winnerId = sortedResults[0]?.playerNumber;

  return (
    <div className="relative w-full min-h-screen overflow-auto py-12 px-8 font-body">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center mb-12"
      >
        <h1 className="text-6xl font-heading text-neon-cyan text-glow-blue tracking-wider mb-2">
          최종 결과
        </h1>
        <p className="text-xl text-white/60 font-body">
          모든 플레이어의 결과를 확인하세요
        </p>
      </motion.div>

      {/* Player Result Cards */}
      <div className="max-w-6xl mx-auto space-y-6 mb-12">
        {sortedResults.map((result, index) => (
          <div key={result.playerNumber}>
            <PlayerResultCard
              result={result}
              isWinner={result.playerNumber === winnerId}
              rank={index + 1}
            />

            {/* Player Charts */}
            <div className="mt-4">
              <PlayerCharts
                playerNumber={result.playerNumber}
                dataHistory={result.dataHistory}
                victimType={result.victimType}
                isExpanded={expandedPlayer === result.playerNumber}
                onToggle={() =>
                  setExpandedPlayer(
                    expandedPlayer === result.playerNumber ? null : result.playerNumber
                  )
                }
              />
            </div>
            <AiSessionAnalysis result={result} />
          </div>
        ))}
      </div>

      {/* Return to Main Button */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="flex justify-center"
      >
        <motion.button
          whileHover={{
            scale: 1.05,
            boxShadow: '0 0 40px rgba(168, 85, 247, 0.6)'
          }}
          whileTap={{ scale: 0.95 }}
          onClick={returnToMain}
          className="
            px-12 py-4 rounded-2xl
            font-heading text-2xl tracking-wider
            text-white
            bg-gradient-to-r from-neon-purple to-neon-pink
            shadow-neon-purple
            border-0 cursor-pointer
            flex items-center gap-3
          "
        >
          <HomeIcon className="w-6 h-6" />
          메인으로
        </motion.button>
      </motion.div>
    </div>
  );
}
