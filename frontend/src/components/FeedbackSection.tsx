import React, { Children } from 'react';
import { motion } from 'framer-motion';
const feedbacks = [
{
  icon: '👏',
  text: '좋은 CPR 수행입니다!'
},
{
  icon: '✅',
  text: '압박 깊이는 매우 정확했습니다.'
},
{
  icon: '💡',
  text: '속도를 조금 더 일정하게 유지하면 더 좋습니다.'
}];

const containerVariants = {
  hidden: {
    opacity: 0
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 2.6
    }
  }
};
const itemVariants = {
  hidden: {
    opacity: 0,
    x: -30
  },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 100
    }
  }
};
export function FeedbackSection() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-4xl mx-auto mb-16 relative z-10">
      
      <div className="bg-white shadow-lg rounded-3xl p-8 md:p-10 border border-slate-100">
        <h3 className="text-3xl font-heading text-slate-800 mb-8 text-center tracking-wide">
          AI 분석 피드백
        </h3>

        <div className="space-y-4">
          {feedbacks.map((feedback, index) =>
          <motion.div
            key={index}
            variants={itemVariants}
            className="flex items-center gap-6 bg-slate-50 hover:bg-slate-100 transition-colors p-5 rounded-2xl border border-slate-100">
            
              <div className="text-4xl bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center shadow-inner">
                {feedback.icon}
              </div>
              <p className="text-xl md:text-2xl font-body text-slate-700 font-medium">
                {feedback.text}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>);

}