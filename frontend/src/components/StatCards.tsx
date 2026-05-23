import React, { Children } from 'react';
import { motion } from 'framer-motion';
import { TargetIcon, ArrowDownIcon, ActivityIcon, ZapIcon } from 'lucide-react';
const stats = [
{
  label: '적정 깊이 압박 비율',
  value: '82%',
  icon: TargetIcon,
  valueColor: 'text-blue-500',
  iconColor: 'text-blue-500',
  iconBg: 'bg-blue-50',
  topBar: 'bg-blue-400',
  isGradient: false
},
{
  label: '평균 압박 깊이',
  value: '5.6 cm',
  icon: ArrowDownIcon,
  valueColor: 'text-blue-500',
  iconColor: 'text-blue-500',
  iconBg: 'bg-blue-50',
  topBar: 'bg-blue-400',
  isGradient: false
},
{
  label: '평균 압박 속도',
  value: '108 BPM',
  icon: ActivityIcon,
  valueColor:
  'bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent',
  iconColor: 'text-emerald-500',
  iconBg: 'bg-green-50',
  topBar: 'bg-emerald-400',
  isGradient: true
},
{
  label: '최고 콤보',
  value: '24 COMBO',
  icon: ZapIcon,
  valueColor:
  'bg-gradient-to-r from-pink-400 to-fuchsia-500 bg-clip-text text-transparent',
  iconColor: 'text-pink-500',
  iconBg: 'bg-pink-50',
  topBar: 'bg-pink-400',
  isGradient: true
}];

const containerVariants = {
  hidden: {
    opacity: 0
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 1.8
    }
  }
};
const itemVariants = {
  hidden: {
    opacity: 0,
    y: 30
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100
    }
  }
};
export function StatCards() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10 w-full">
      
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={index}
            variants={itemVariants}
            className="bg-white shadow-lg shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden relative group transition-colors duration-300">
            
            {/* Top color accent bar */}
            <div className={`h-2 w-full ${stat.topBar} opacity-80`} />

            <div className="p-6 flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600 font-body font-medium text-lg">
                  {stat.label}
                </span>
                <div
                  className={`p-2 rounded-lg ${stat.iconBg} ${stat.iconColor}`}>
                  
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-auto">
                <span
                  className={`text-4xl md:text-5xl font-heading tracking-wider ${stat.valueColor} drop-shadow-sm`}>
                  
                  {stat.value}
                </span>
              </div>
            </div>
          </motion.div>);

      })}
    </motion.div>);

}