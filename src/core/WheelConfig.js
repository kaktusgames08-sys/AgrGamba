export const WHEEL_SEGMENTS = [
  { label: '5 Kč + SPIN', type: 'money', value: 5, extraSpins: 1, tone: 'amber' },
  { label: '20 Kč + SPIN', type: 'money', value: 20, extraSpins: 1, tone: 'violet' },
  { label: '10 Kč + SPIN', type: 'money', value: 10, extraSpins: 1, tone: 'blue' },
  { label: '30 Kč + SPIN', type: 'money', value: 30, extraSpins: 1, tone: 'red' },
  { label: 'x2 + SPIN', type: 'multiplier', multiplier: 2, extraSpins: 1, tone: 'purple' },
  { label: '15 Kč + SPIN', type: 'money', value: 15, extraSpins: 1, tone: 'green' },
  { label: '50 Kč + SPIN', type: 'money', value: 50, extraSpins: 1, tone: 'orange' },
  { label: '25 Kč + SPIN', type: 'money', value: 25, extraSpins: 1, tone: 'cyan' },
  { label: '40 Kč + SPIN', type: 'money', value: 40, extraSpins: 1, tone: 'pink' },
  { label: '100 Kč', type: 'money', value: 100, extraSpins: 0, tone: 'final', finale: true },
  { label: '20 Kč + SPIN', type: 'money', value: 20, extraSpins: 1, tone: 'violet' },
  { label: '60 Kč + SPIN', type: 'money', value: 60, extraSpins: 1, tone: 'blue' },
  { label: '10 Kč + SPIN', type: 'money', value: 10, extraSpins: 1, tone: 'amber' },
  { label: 'x3 + SPIN', type: 'multiplier', multiplier: 3, extraSpins: 1, tone: 'green' },
  { label: '30 Kč + SPIN', type: 'money', value: 30, extraSpins: 1, tone: 'red' },
  { label: '75 Kč + SPIN', type: 'money', value: 75, extraSpins: 1, tone: 'orange' },
  { label: '25 Kč + SPIN', type: 'money', value: 25, extraSpins: 1, tone: 'cyan' },
  { label: '50 Kč + SPIN', type: 'money', value: 50, extraSpins: 1, tone: 'pink' },
];

export const STARTING_SPINS = 1;
export const SPIN_DURATION_MS = 5200;
export const MIN_FULL_TURNS = 7;
export const MAX_EXTRA_TURNS = 3;
