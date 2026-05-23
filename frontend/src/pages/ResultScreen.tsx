import React, { useEffect, useState, Children } from 'react';
import { motion, animate } from 'framer-motion';
import {
  TargetIcon,
  ArrowDownIcon,
  ActivityIcon,
  ZapIcon,
  RotateCcwIcon,
  HomeIcon,
  SparklesIcon,
  TrophyIcon } from
'lucide-react';
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
// ─── Mock Chart Data ───
const generateChartData = () => {
  const data = [];
  for (let i = 0; i <= 120; i += 10) {
    data.push({
      time: `${i}s`,
      depth: 4.5 + Math.random() * 2.2,
      speed: 88 + Math.random() * 40
    });
  }
  return data;
};
const chartData = generateChartData();
// ─── Custom Tooltip ───
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 text-sm">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((entry: any, i: number) =>
      <p
        key={i}
        className="font-heading text-lg"
        style={{
          color: entry.color
        }}>
        
          {entry.name}: {Number(entry.value).toFixed(1)}{' '}
          {entry.name === '깊이' ? 'cm' : 'BPM'}
        </p>
      )}
    </div>);

}
// ─── Animated Counter Hook ───
function useCountUp(
target: number,
duration: number = 2.5,
delay: number = 0.5)
{
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const controls = animate(0, target, {
        duration,
        ease: 'easeOut',
        onUpdate(v) {
          setValue(Math.round(v));
        }
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return value;
}
interface ResultScreenProps {
  onRestart: () => void;
}
export function ResultScreen({ onRestart }: ResultScreenProps) {
  const score = useCountUp(7550, 2.5, 0.8);
  return (
    <div className="relative z-10 w-full min-h-screen overflow-y-auto font-body">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col items-center">
        {/* ===== HEADER: Title + Score ===== */}
        <motion.div
          initial={{
            opacity: 0,
            y: -30
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            duration: 0.7
          }}
          className="flex flex-col items-center mb-8">
          
          <div className="flex items-center gap-3 mb-4">
            <SparklesIcon
              className="w-7 h-7 text-neon-yellow animate-pulse"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.6))'
              }} />
            
            <h1 className="text-5xl md:text-6xl font-heading tracking-wider text-neon-blue text-glow-blue">
              세션 결과
            </h1>
            <SparklesIcon
              className="w-7 h-7 text-neon-yellow animate-pulse"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.6))'
              }} />
            
          </div>

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
              delay: 0.4,
              type: 'spring',
              stiffness: 120
            }}
            className="glass-card rounded-3xl px-12 py-6 flex flex-col items-center"
            style={{
              boxShadow: '0 0 40px rgba(0, 212, 255, 0.15)'
            }}>
            
            <div className="flex items-center gap-2 mb-1">
              <TrophyIcon
                className="w-6 h-6 text-neon-yellow"
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.5))'
                }} />
              
              <span className="text-sm font-body text-white/50 uppercase tracking-[0.3em]">
                최종 점수
              </span>
            </div>
            <p className="text-7xl md:text-8xl font-heading text-neon-yellow text-glow-yellow tracking-wider">
              {score.toLocaleString()}
              <span className="text-4xl text-neon-yellow/60 ml-2">점</span>
            </p>
          </motion.div>
        </motion.div>

        {/* ===== GRADE BADGE ===== */}
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
            stiffness: 160,
            damping: 14,
            delay: 1
          }}
          className="relative mb-10">
          
          {/* Glow layers */}
          <div className="absolute inset-[-30px] rounded-full bg-neon-purple/10 blur-[60px] animate-glow-pulse" />
          <div className="absolute inset-[-16px] rounded-full border-2 border-neon-purple/20 animate-spin-slow" />
          <div className="absolute inset-[-32px] rounded-full border border-neon-blue/10 animate-spin-reverse" />

          {/* Badge */}
          <div
            className="relative w-44 h-44 md:w-52 md:h-52 rounded-full p-1.5 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #FBBF24, #F59E0B, #D97706)',
              boxShadow:
              '0 0 40px rgba(251, 191, 36, 0.3), 0 0 80px rgba(168, 85, 247, 0.2)'
            }}>
            
            <div
              className="w-full h-full rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #1A1E35, #111427)',
                border: '3px solid rgba(251, 191, 36, 0.3)'
              }}>
              
              <span className="text-8xl md:text-9xl font-heading text-neon-yellow text-glow-yellow">
                A
              </span>
            </div>
          </div>

          <motion.div
            initial={{
              opacity: 0,
              y: 15
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: 1.5
            }}
            className="mt-5 text-center">
            
            <span className="glass-card rounded-full px-6 py-2 text-xl font-heading text-neon-yellow/90 tracking-[0.2em]">
              등급 A
            </span>
          </motion.div>
        </motion.div>

        {/* ===== STAT CARDS ===== */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {
              opacity: 0
            },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15,
                delayChildren: 1.8
              }
            }
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 w-full">

          {/* Card 1 - 적정압박률 */}
          <motion.div
            variants={{
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
            }}
            className="bg-white shadow-lg shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden relative group transition-colors duration-300">

            <div className="h-2 w-full bg-blue-400 opacity-80" />

            <div className="p-6 flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600 font-body font-medium text-lg">
                  적정압박률
                </span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-500">
                  <TargetIcon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-auto">
                <span className="text-4xl md:text-5xl font-heading tracking-wider text-blue-500 drop-shadow-sm">
                  82%
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 2 - 평균 깊이 */}
          <motion.div
            variants={{
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
            }}
            className="bg-white shadow-lg shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden relative group transition-colors duration-300">

            <div className="h-2 w-full bg-emerald-400 opacity-80" />

            <div className="p-6 flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600 font-body font-medium text-lg">
                  평균 깊이
                </span>
                <div className="p-2 rounded-lg bg-green-50 text-emerald-500">
                  <ArrowDownIcon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-auto">
                <span className="text-4xl md:text-5xl font-heading tracking-wider bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent drop-shadow-sm">
                  5.6 cm
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 3 - 평균 속도 */}
          <motion.div
            variants={{
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
            }}
            className="bg-white shadow-lg shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden relative group transition-colors duration-300">

            <div className="h-2 w-full bg-amber-400 opacity-80" />

            <div className="p-6 flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600 font-body font-medium text-lg">
                  평균 속도
                </span>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-500">
                  <ActivityIcon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-auto">
                <span className="text-4xl md:text-5xl font-heading tracking-wider bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent drop-shadow-sm">
                  108 BPM
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 4 - 최대 콤보 */}
          <motion.div
            variants={{
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
            }}
            className="bg-white shadow-lg shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden relative group transition-colors duration-300">

            <div className="h-2 w-full bg-pink-400 opacity-80" />

            <div className="p-6 flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600 font-body font-medium text-lg">
                  최대 콤보
                </span>
                <div className="p-2 rounded-lg bg-pink-50 text-pink-500">
                  <ZapIcon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-auto">
                <span className="text-4xl md:text-5xl font-heading tracking-wider bg-gradient-to-r from-pink-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-sm">
                  24 COMBO
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ===== CHARTS ===== */}
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
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 w-full">
          
          {/* Depth Chart */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-heading text-white/90 tracking-wider">
                압박 깊이 변화
              </h3>
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full bg-neon-green"
                  style={{
                    boxShadow: '0 0 6px rgba(0,255,136,0.5)'
                  }} />
                
                <span className="text-xs text-white/40 font-body">
                  적정 구간 (5-6cm)
                </span>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 20,
                    left: -20,
                    bottom: 5
                  }}>
                  
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false} />
                  
                  <XAxis
                    dataKey="time"
                    stroke="rgba(255,255,255,0.25)"
                    tick={{
                      fill: 'rgba(255,255,255,0.35)',
                      fontSize: 11
                    }}
                    axisLine={false}
                    tickLine={false} />
                  
                  <YAxis
                    domain={[0, 10]}
                    stroke="rgba(255,255,255,0.25)"
                    tick={{
                      fill: 'rgba(255,255,255,0.35)',
                      fontSize: 11
                    }}
                    axisLine={false}
                    tickLine={false} />
                  
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceArea
                    y1={5}
                    y2={6}
                    fill="#00FF88"
                    fillOpacity={0.1}
                    stroke="#00FF88"
                    strokeOpacity={0.2} />
                  
                  <Line
                    type="monotone"
                    dataKey="depth"
                    name="깊이"
                    stroke="#00D4FF"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: '#00D4FF',
                      strokeWidth: 0
                    }}
                    activeDot={{
                      r: 7,
                      fill: '#00D4FF',
                      strokeWidth: 0
                    }} />
                  
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Speed Chart */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-heading text-white/90 tracking-wider">
                압박 속도 변화
              </h3>
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full bg-neon-green"
                  style={{
                    boxShadow: '0 0 6px rgba(0,255,136,0.5)'
                  }} />
                
                <span className="text-xs text-white/40 font-body">
                  목표 구간 (100-120 BPM)
                </span>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 20,
                    left: -20,
                    bottom: 5
                  }}>
                  
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false} />
                  
                  <XAxis
                    dataKey="time"
                    stroke="rgba(255,255,255,0.25)"
                    tick={{
                      fill: 'rgba(255,255,255,0.35)',
                      fontSize: 11
                    }}
                    axisLine={false}
                    tickLine={false} />
                  
                  <YAxis
                    domain={[60, 160]}
                    stroke="rgba(255,255,255,0.25)"
                    tick={{
                      fill: 'rgba(255,255,255,0.35)',
                      fontSize: 11
                    }}
                    axisLine={false}
                    tickLine={false} />
                  
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceArea
                    y1={100}
                    y2={120}
                    fill="#00FF88"
                    fillOpacity={0.1}
                    stroke="#00FF88"
                    strokeOpacity={0.2} />
                  
                  <Line
                    type="monotone"
                    dataKey="speed"
                    name="속도"
                    stroke="#00FF88"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: '#00FF88',
                      strokeWidth: 0
                    }}
                    activeDot={{
                      r: 7,
                      fill: '#00FF88',
                      strokeWidth: 0
                    }} />
                  
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* ===== FEEDBACK ===== */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {
              opacity: 0
            },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.2,
                delayChildren: 2.6
              }
            }
          }}
          className="w-full max-w-4xl mx-auto mb-10">
          
          <div className="glass-card rounded-2xl p-8">
            <h3 className="text-2xl font-heading text-white/90 mb-6 text-center tracking-wider">
              AI 분석 피드백
            </h3>
            <div className="space-y-3">
              <motion.div
                variants={{
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
                }}
                className="flex items-center gap-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-neon-green/20 transition-colors">
                
                <div className="text-3xl w-12 h-12 rounded-full bg-neon-green/10 flex items-center justify-center flex-shrink-0">
                  👏
                </div>
                <p className="text-lg font-body text-white/80">
                  좋은 CPR 수행입니다!
                </p>
              </motion.div>

              <motion.div
                variants={{
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
                }}
                className="flex items-center gap-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-neon-blue/20 transition-colors">
                
                <div className="text-3xl w-12 h-12 rounded-full bg-neon-blue/10 flex items-center justify-center flex-shrink-0">
                  ✅
                </div>
                <p className="text-lg font-body text-white/80">
                  압박 깊이는 매우 정확했습니다.
                </p>
              </motion.div>

              <motion.div
                variants={{
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
                }}
                className="flex items-center gap-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-neon-purple/20 transition-colors">
                
                <div className="text-3xl w-12 h-12 rounded-full bg-neon-purple/10 flex items-center justify-center flex-shrink-0">
                  💡
                </div>
                <p className="text-lg font-body text-white/80">
                  속도를 조금 더 일정하게 유지하면 더 좋습니다.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ===== ACTION BUTTONS ===== */}
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
            duration: 0.7,
            delay: 3
          }}
          className="flex flex-col sm:flex-row items-center justify-center gap-5 pb-12">
          
          <motion.button
            whileHover={{
              scale: 1.05,
              boxShadow: '0 0 35px rgba(0, 212, 255, 0.5)'
            }}
            whileTap={{
              scale: 0.95
            }}
            onClick={onRestart}
            className="flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-heading text-2xl tracking-wider text-white border-0 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #00D4FF, #0099CC)',
              boxShadow: '0 0 25px rgba(0, 212, 255, 0.3)'
            }}>
            
            <RotateCcwIcon className="w-7 h-7" />
            다시 도전하기
          </motion.button>

          <motion.button
            whileHover={{
              scale: 1.05,
              boxShadow: '0 0 35px rgba(168, 85, 247, 0.5)'
            }}
            whileTap={{
              scale: 0.95
            }}
            className="flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-heading text-2xl tracking-wider text-white border-0 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
              boxShadow: '0 0 25px rgba(168, 85, 247, 0.3)'
            }}>
            
            <HomeIcon className="w-7 h-7" />
            메인 화면으로
          </motion.button>
        </motion.div>
      </div>
    </div>);

}