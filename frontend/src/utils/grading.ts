import { Grade } from '../types/game.types';

export function calculateGrade(score: number): Grade {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

export function getGradeColor(grade: Grade): string {
  switch (grade) {
    case 'S':
      return '#FBBF24'; // neon-yellow
    case 'A':
      return '#00FF88'; // neon-green
    case 'B':
      return '#00D4FF'; // neon-blue
    case 'C':
      return '#FF6B35'; // neon-orange
    case 'D':
      return '#FF4444'; // red
  }
}
