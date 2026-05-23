import React, { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { SparklesIcon, TrophyIcon } from 'lucide-react';
export function ScoreHeader() {
  const [score, setScore] = useState(0);
  const targetScore = 7550;
  useEffect(() => {
    const controls = animate(0, targetScore, {
      duration: 2.5,
      ease: 'easeOut',
      onUpdate(value) {
        setScore(Math.round(value));
      }
    });
    return () => controls.stop();
  }, []);
  return (
    <div className="flex flex-col items-center justify-center text-slate-800 mb-12 relative z-10">
      <motion.div
        initial={{
          opacity: 0,
          y: -20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{
          duration: 0.6
        }}
        className="flex items-center gap-3 mb-4">
        
        <SparklesIcon className="w-8 h-8 text-amber-400 animate-pulse" />
        <h1 className="text-5xl md:text-6xl font-heading tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
          세션 결과
        </h1>
        <SparklesIcon className="w-8 h-8 text-amber-400 animate-pulse" />
      </motion.div>

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.8
        }}
        animate={{
          opacity: 1,
          scale: 1
        }}
        transition={{
          duration: 0.8,
          delay: 0.3,
          type: 'spring'
        }}
        className="flex flex-col items-center bg-white px-12 py-6 rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/50">
        
        <div className="flex items-center gap-2 mb-2">
          <TrophyIcon className="w-6 h-6 text-amber-400" />
          <span className="text-xl font-body font-bold text-blue-500 tracking-widest">
            최종 점수
          </span>
        </div>
        <div className="text-7xl md:text-8xl font-heading text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 tracking-wider">
          {score.toLocaleString()}
          <span className="text-5xl text-blue-400 ml-2">점</span>
        </div>
      </motion.div>
    </div>);

}