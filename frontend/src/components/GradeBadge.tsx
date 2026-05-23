import React from 'react';
import { motion } from 'framer-motion';
export function GradeBadge() {
  return (
    <div className="flex flex-col items-center justify-center mb-16 relative z-10">
      <motion.div
        initial={{
          scale: 0,
          rotate: -180
        }}
        animate={{
          scale: 1,
          rotate: 0
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          delay: 1
        }}
        className="relative">
        
        {/* Soft background layers */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-300 to-purple-400 blur-2xl opacity-30 animate-pulse-slow"></div>
        <div className="absolute inset-[-20px] rounded-full border-4 border-blue-300/30 animate-[spin_10s_linear_infinite]"></div>
        <div className="absolute inset-[-40px] rounded-full border-2 border-purple-300/20 animate-[spin_15s_linear_infinite_reverse]"></div>

        {/* Main Badge */}
        <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400 p-2 shadow-[0_0_40px_rgba(251,191,36,0.3)] flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-50 to-yellow-200 flex items-center justify-center border-4 border-yellow-100 shadow-inner">
            <span className="text-8xl md:text-9xl font-heading text-amber-600 drop-shadow-sm">
              A
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{
          delay: 1.5,
          duration: 0.5
        }}
        className="mt-8 bg-white/80 backdrop-blur-md px-8 py-3 rounded-full border border-white shadow-lg shadow-blue-100/50">
        
        <span className="text-2xl md:text-3xl font-heading text-slate-700 tracking-widest">
          등급 A
        </span>
      </motion.div>
    </div>);

}