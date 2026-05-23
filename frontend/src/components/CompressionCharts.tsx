import React from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer } from
'recharts';
// Mock Data Generation
const generateMockData = () => {
  const data = [];
  for (let i = 0; i <= 120; i += 10) {
    data.push({
      time: `${i}s`,
      depth: 4.5 + Math.random() * 2,
      speed: 95 + Math.random() * 30 // Fluctuates around 95 - 125
    });
  }
  return data;
};
const mockData = generateMockData();
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xl">
        <p className="text-slate-600 text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) =>
        <p
          key={index}
          className="font-heading text-xl"
          style={{
            color: entry.color
          }}>
          
            {entry.name}: {entry.value.toFixed(1)}{' '}
            {entry.name === '깊이' ? 'cm' : 'BPM'}
          </p>
        )}
      </div>);

  }
  return null;
};
export function CompressionCharts() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 40
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 0.8,
        delay: 2.2
      }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 relative z-10 w-full">
      
      {/* Chart 1: Depth */}
      <div className="bg-white shadow-lg rounded-3xl p-6 md:p-8 flex flex-col border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-heading text-slate-800 tracking-wide">
            압박 깊이 변화
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            <span className="text-slate-500 text-sm font-body">
              적정 구간 (5-6cm)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mockData}
              margin={{
                top: 5,
                right: 20,
                left: -20,
                bottom: 5
              }}>
              
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,0,0,0.06)"
                vertical={false} />
              
              <XAxis
                dataKey="time"
                stroke="rgba(100,116,139,0.8)"
                tick={{
                  fill: 'rgba(100,116,139,0.8)',
                  fontSize: 12,
                  fontFamily: '"Noto Sans KR", sans-serif'
                }}
                axisLine={false}
                tickLine={false} />
              
              <YAxis
                domain={[0, 10]}
                stroke="rgba(100,116,139,0.8)"
                tick={{
                  fill: 'rgba(100,116,139,0.8)',
                  fontSize: 12,
                  fontFamily: '"Noto Sans KR", sans-serif'
                }}
                axisLine={false}
                tickLine={false} />
              
              <Tooltip content={<CustomTooltip />} />
              <ReferenceArea y1={5} y2={6} fill="#34D399" fillOpacity={0.2} />
              <Line
                type="monotone"
                dataKey="depth"
                name="깊이"
                stroke="#60A5FA"
                strokeWidth={4}
                dot={{
                  r: 4,
                  fill: '#60A5FA',
                  strokeWidth: 2,
                  stroke: '#fff'
                }}
                activeDot={{
                  r: 8,
                  fill: '#60A5FA',
                  strokeWidth: 0
                }} />
              
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Speed */}
      <div className="bg-white shadow-lg rounded-3xl p-6 md:p-8 flex flex-col border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-heading text-slate-800 tracking-wide">
            압박 속도 변화
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            <span className="text-slate-500 text-sm font-body">
              목표 구간 (100-120 BPM)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mockData}
              margin={{
                top: 5,
                right: 20,
                left: -20,
                bottom: 5
              }}>
              
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,0,0,0.06)"
                vertical={false} />
              
              <XAxis
                dataKey="time"
                stroke="rgba(100,116,139,0.8)"
                tick={{
                  fill: 'rgba(100,116,139,0.8)',
                  fontSize: 12,
                  fontFamily: '"Noto Sans KR", sans-serif'
                }}
                axisLine={false}
                tickLine={false} />
              
              <YAxis
                domain={[60, 160]}
                stroke="rgba(100,116,139,0.8)"
                tick={{
                  fill: 'rgba(100,116,139,0.8)',
                  fontSize: 12,
                  fontFamily: '"Noto Sans KR", sans-serif'
                }}
                axisLine={false}
                tickLine={false} />
              
              <Tooltip content={<CustomTooltip />} />
              <ReferenceArea
                y1={100}
                y2={120}
                fill="#34D399"
                fillOpacity={0.2} />
              
              <Line
                type="monotone"
                dataKey="speed"
                name="속도"
                stroke="#34D399"
                strokeWidth={4}
                dot={{
                  r: 4,
                  fill: '#34D399',
                  strokeWidth: 2,
                  stroke: '#fff'
                }}
                activeDot={{
                  r: 8,
                  fill: '#34D399',
                  strokeWidth: 0
                }} />
              
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>);

}