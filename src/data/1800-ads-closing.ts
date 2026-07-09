export type ClosingPillar = {
  title: string
  description: string
  icon: 'angles' | 'design' | 'speed'
  bento: 'large' | 'small'
}

export const CLOSING_PILLARS: ClosingPillar[] = [
  {
    title: 'Hooks worth testing',
    description: 'Performance-driven concepts built to test new hooks on Meta.',
    icon: 'angles',
    bento: 'large',
  },
  {
    title: 'Meta-ready creatives',
    description: 'Feed and story dimensions, on-brand and ready to run.',
    icon: 'design',
    bento: 'small',
  },
  {
    title: 'In your inbox in 24h',
    description: 'Platform-ready files in your inbox in under 24 hours.',
    icon: 'speed',
    bento: 'small',
  },
]
