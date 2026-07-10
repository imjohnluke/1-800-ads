import elenaVossAvatar from '../assets/1800-testimonials/elena-voss.png'
import marcusWebbAvatar from '../assets/1800-testimonials/marcus-webb.png'
import priyaNairAvatar from '../assets/1800-testimonials/priya-nair.png'

export type Testimonial1800 = {
  headline: string
  quote: string
  name: string
  role: string
  avatar: string
  rating: number
}

export const TESTIMONIALS_1800: Testimonial1800[] = [
  {
    headline: 'Lifeline when we’re slammed',
    quote:
      'We ordered a batch when our in-house team was underwater. Brief in, statics back in a few days — Meta-ready files, no subscription, no retainer.',
    name: 'Jack Berset',
    role: 'Brand Builder',
    avatar: '/images/testimonials/jack-berset.jpeg',
    rating: 5,
  },
  {
    headline: 'Flexibility without the retainer',
    quote:
      'Needed fresh angles for a product launch without committing to monthly creative. Pay per order, get a full set of statics — exactly the flexibility we wanted.',
    name: 'Elena Voss',
    role: 'eCommerce brand owner',
    avatar: elenaVossAvatar.src,
    rating: 5,
  },
  {
    headline: 'Saved our launch timeline',
    quote:
      'Our agency timeline slipped and we still had to ship tests. Submitted a brief, got platform-ready statics in the inbox within days. Saved the campaign.',
    name: 'Marcus Webb',
    role: 'Agency owner',
    avatar: marcusWebbAvatar.src,
    rating: 5,
  },
  {
    headline: 'Our go-to for more creative',
    quote:
      'When we need more static creative, we order another batch. Quality is consistent, turnaround is fast, and we never feel locked into a plan we outgrow.',
    name: 'Priya Nair',
    role: 'Mobile app owner',
    avatar: priyaNairAvatar.src,
    rating: 5,
  },
]
