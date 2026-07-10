export type FlexibilityPoint = {
  title: string
  description: string
  icon: 'order' | 'cadence' | 'retainer'
}

export const FLEXIBILITY_POINTS: FlexibilityPoint[] = [
  {
    title: 'Order ads when you want',
    description:
      'Place an order when you need fresh creative — no monthly minimums, no unused credits sitting in an account.',
    icon: 'order',
  },
  {
    title: 'Choose your cadence',
    description:
      'One-time batches or monthly delivery. Scale up for a launch or pause when you are stocked.',
    icon: 'cadence',
  },
  {
    title: 'No retainers',
    description:
      'Pay per order, not per month. No agency lock-in and no recurring creative retainer required.',
    icon: 'retainer',
  },
]
