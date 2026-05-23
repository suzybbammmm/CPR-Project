import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcwIcon, HomeIcon } from 'lucide-react';
export function ActionButtons() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 50
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 0.8,
        delay: 3.2
      }}
      className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full relative z-10 pb-20">
      
      <motion.button
        whileHover={{
          scale: 1.05,
          boxShadow: '0 0 25px rgba(96, 165, 250, 0.4)'
        }}
        whileTap={{
          scale: 0.95
        }}
        className="flex items-center justify-center gap-3 w-full sm:w-auto px-12 py-6 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl text-white font-heading text-2xl tracking-wide shadow-lg shadow-blue-200/50 border-0">
        
        <RotateCcwIcon className="w-8 h-8" />
        다시 도전하기
      </motion.button>

      <motion.button
        whileHover={{
          scale: 1.05,
          boxShadow: '0 0 25px rgba(167, 139, 250, 0.4)'
        }}
        whileTap={{
          scale: 0.95
        }}
        className="flex items-center justify-center gap-3 w-full sm:w-auto px-12 py-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl text-white font-heading text-2xl tracking-wide shadow-lg shadow-purple-200/50 border-0">
        
        <HomeIcon className="w-8 h-8" />
        메인 화면으로
      </motion.button>
    </motion.div>);

}