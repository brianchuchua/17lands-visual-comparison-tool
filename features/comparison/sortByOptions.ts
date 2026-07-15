export const sortByOptions = [
  {
    name: 'ever_drawn_win_rate',
    label: 'Win Rate In Hand (Opener or Drawn)',
    shortLabel: 'GIH',
    usePercentage: true,
  },
  {
    name: 'opening_hand_win_rate',
    label: 'Win Rate In Opening Hand',
    shortLabel: 'OH',
    usePercentage: true,
  },
  {
    name: 'drawn_win_rate',
    label: 'Win Rate When Drawn (Turn 1+)',
    shortLabel: 'GD',
    usePercentage: true,
  },
  {
    name: 'win_rate',
    label: 'Win Rate In Main Deck',
    shortLabel: 'GP',
    usePercentage: true,
  },
  {
    name: 'never_drawn_win_rate',
    label: 'Win Rate If Never Drawn',
    shortLabel: 'GND',
    usePercentage: true,
  },
  {
    name: 'drawn_improvement_win_rate',
    label: 'Win Rate Improvement When Drawn',
    shortLabel: 'IWD',
    usePercentage: true,
  },
  {
    name: 'avg_seen',
    label: 'Average Last Seen At',
    shortLabel: 'ALSA',
    usePercentage: false,
  },
  {
    name: 'avg_pick',
    label: 'Average Pick Taken At',
    shortLabel: 'ATA',
    usePercentage: false,
  },
  {
    name: 'price_usd',
    label: 'Price',
    shortLabel: 'USD',
    usePercentage: false,
    useCurrency: true,
  },
];
