import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  dx: number;
  dy: number;
}
const NEON_COLORS = [
'rgba(0, 212, 255, 0.4)',
'rgba(0, 255, 136, 0.3)',
'rgba(168, 85, 247, 0.35)',
'rgba(255, 107, 53, 0.3)',
'rgba(251, 191, 36, 0.25)',
'rgba(34, 211, 238, 0.3)'];

export function ParticleBackground({ count = 40 }: {count?: number;}) {
  const particles: Particle[] = useMemo(() => {
    return Array.from(
      {
        length: count
      },
      (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
        duration: Math.random() * 15 + 10,
        delay: Math.random() * 5,
        dx: (Math.random() - 0.5) * 30,
        dy: (Math.random() - 0.5) * 30
      })
    );
  }, [count]);
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true">
      
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-surface-900 via-[#0d1025] to-[#110a20]" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-100" />

      {/* Large ambient glow blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-neon-blue/[0.04] blur-[150px]" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-neon-purple/[0.05] blur-[150px]" />
      <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-neon-green/[0.03] blur-[120px]" />

      {/* Floating particles */}
      {particles.map((p) =>
      <motion.div
        key={p.id}
        className="absolute rounded-full"
        style={{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          backgroundColor: p.color,
          boxShadow: `0 0 ${p.size * 3}px ${p.color}`
        }}
        animate={{
          x: [0, p.dx, -p.dx * 0.5, 0],
          y: [0, p.dy, -p.dy * 0.7, 0],
          opacity: [0.3, 0.8, 0.5, 0.3],
          scale: [1, 1.3, 0.8, 1]
        }}
        transition={{
          duration: p.duration,
          delay: p.delay,
          repeat: Infinity,
          ease: 'easeInOut'
        }} />

      )}
    </div>);

}