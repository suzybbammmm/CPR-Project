import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'src/config/runtime.ts',
        'src/demo/scenario.ts',
        'src/live/readings.ts',
        'src/utils/cprGuidance.ts',
        'src/components/LivePracticeMonitor.tsx',
        'src/pages/RoleLauncher.tsx',
        'src/pages/ParticipantSessionScreen.tsx',
        'src/pages/InstructorDashboardScreen.tsx'
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});
