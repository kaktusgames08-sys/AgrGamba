export const HARDCORE_STARTING_SPINS = 3;
export const HARDCORE_MAX_PAYOUT = 5000;

export const HARDCORE_MONEY_SEGMENTS = [
  { label: '150 Kč', type: 'money', value: 150, extraSpins: 0, tone: 'amber', subLabel: 'HARDCORE' },
  { label: '200 Kč', type: 'money', value: 200, extraSpins: 0, tone: 'violet', subLabel: 'HARDCORE' },
  { label: '250 Kč', type: 'money', value: 250, extraSpins: 0, tone: 'blue', subLabel: 'HARDCORE' },
  { label: '300 Kč', type: 'money', value: 300, extraSpins: 0, tone: 'red', subLabel: 'HARDCORE' },
  { label: '350 Kč', type: 'money', value: 350, extraSpins: 0, tone: 'purple', subLabel: 'HARDCORE' },
  { label: '400 Kč', type: 'money', value: 400, extraSpins: 0, tone: 'green', subLabel: 'HARDCORE' },
  { label: '450 Kč', type: 'money', value: 450, extraSpins: 0, tone: 'orange', subLabel: 'HARDCORE' },
  { label: '500 Kč', type: 'money', value: 500, extraSpins: 0, tone: 'cyan', subLabel: 'HARDCORE' },
  { label: '600 Kč', type: 'money', value: 600, extraSpins: 0, tone: 'pink', subLabel: 'HARDCORE' },
  { label: '700 Kč', type: 'money', value: 700, extraSpins: 0, tone: 'amber', subLabel: 'HARDCORE' },
  { label: '800 Kč', type: 'money', value: 800, extraSpins: 0, tone: 'violet', subLabel: 'HARDCORE' },
  { label: '900 Kč', type: 'money', value: 900, extraSpins: 0, tone: 'blue', subLabel: 'HARDCORE' },
  { label: '1000 Kč', type: 'money', value: 1000, extraSpins: 0, tone: 'red', subLabel: 'HARDCORE' },
  { label: '750 Kč', type: 'money', value: 750, extraSpins: 0, tone: 'green', subLabel: 'HARDCORE' },
  { label: '650 Kč', type: 'money', value: 650, extraSpins: 0, tone: 'orange', subLabel: 'HARDCORE' },
  { label: '550 Kč', type: 'money', value: 550, extraSpins: 0, tone: 'cyan', subLabel: 'HARDCORE' },
  { label: '450 Kč', type: 'money', value: 450, extraSpins: 0, tone: 'pink', subLabel: 'HARDCORE' },
  { label: '300 Kč', type: 'money', value: 300, extraSpins: 0, tone: 'purple', subLabel: 'HARDCORE' },
];

const multipliers = [
  1, 1.5, 2, 2.5, 1.5, 2, 1, 2.5, 1.5,
  2, 1.5, 2.5, 1, 2, 1.5, 2.5, 2, 1,
];

const tones = [
  'amber', 'violet', 'blue', 'red', 'purple', 'green', 'orange', 'cyan', 'pink',
  'amber', 'violet', 'blue', 'red', 'purple', 'green', 'orange', 'cyan', 'pink',
];

export const HARDCORE_MULTIPLIER_SEGMENTS = multipliers.map((multiplier, index) => ({
  label: 'x' + multiplier,
  type: 'multiplier',
  multiplier,
  extraSpins: 0,
  tone: tones[index],
  subLabel: 'FINÁLE',
}));
