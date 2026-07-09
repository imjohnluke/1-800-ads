export type ProcessStep = {
  title: string
  lead: string
  points: [string, string]
  visual: 'concept' | 'design' | 'deliver'
  images?: string[]
}

export const PROCESS_STEPS: ProcessStep[] = [
  {
    title: 'New, Fresh Angles',
    lead: 'We turn your brief into angles, hooks, and directions built to test and convert on Meta.',
    points: ['Fresh hooks', 'Conversion focused'],
    visual: 'concept',
  },
  {
    title: 'Top Tier Design',
    lead: 'Professional static ads for feed and story — conversion-focused and ready to run.',
    points: ['Eye catching designs', 'On-brand polish'],
    visual: 'design',
    images: [
      '/images/1-800-ads/ad-1.png',
      '/images/1-800-ads/ad-3.png',
      '/images/1-800-ads/ad-5.png',
    ],
  },
  {
    title: 'Delivered Fast',
    lead: 'Platform-ready files in your inbox in under 24 hours, formatted for Meta.',
    points: ['Under 24 hours', 'Revisions included'],
    visual: 'deliver',
  },
]
