export type FaqItem = {
  question: string
  answer: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Is 1-800 Ads a subscription?',
    answer:
      'No — it’s a one-time purchase. Choose your quantity, pay once, and we deliver. You can also select monthly delivery at checkout if you want ads on a recurring cadence.',
  },
  {
    question: 'How fast will I get my ads?',
    answer:
      'Most orders are delivered within 1–3 business days after you submit your brief. Timing can vary slightly based on order size and revision rounds.',
  },
  {
    question: 'What do I need to provide?',
    answer:
      'After checkout, you’ll get a brief to share your product, audience, offer, brand assets, and any angles or references you want us to explore.',
  },
  {
    question: 'What’s included in each static ad?',
    answer:
      'Concept, copy, and design. Feed and story dimensions. One round of revisions. Files ready to upload to Meta.',
  },
  {
    question: 'What’s the free creative audit?',
    answer:
      'Orders of 20+ ads include a free creative audit — we review your current ads and share actionable recommendations with your first delivery.',
  },
  {
    question: 'Can I choose a recurring delivery schedule?',
    answer:
      "Yes — at checkout you can choose one-time delivery or monthly. There are no retainers or subscriptions; you pay per order and pick the cadence that fits your testing schedule.",
  },
  {
    question: 'What if I need changes after delivery?',
    answer:
      'Each order includes one round of revisions. Need more ads or another round? Just place another order.',
  },
]
