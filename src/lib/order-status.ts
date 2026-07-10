export const ORDER_STATUS_PIPELINE = [
  'New Order',
  'Ready for Design',
  'In Design',
  'Design Complete',
  'Sent to Client',
  'Needs Revisions',
  'Revisions Complete',
  'Sent v2',
  'Done',
] as const

export type OrderStatus = (typeof ORDER_STATUS_PIPELINE)[number] | string

export function normalizeOrderStatus(value: string | null | undefined): OrderStatus {
  if (!value) return 'New Order'
  const match = ORDER_STATUS_PIPELINE.find((status) => status.toLowerCase() === value.toLowerCase())
  return match ?? value
}

export function getStatusIndex(status: OrderStatus): number {
  const index = ORDER_STATUS_PIPELINE.indexOf(status as (typeof ORDER_STATUS_PIPELINE)[number])
  if (index >= 0) return index
  return 0
}

export function getStatusProgress(status: OrderStatus): number {
  const index = getStatusIndex(status)
  if (index < 0) return 0
  return Math.round((index / (ORDER_STATUS_PIPELINE.length - 1)) * 100)
}

export function isBriefPending(status: OrderStatus, brandUrl?: string): boolean {
  return status === 'New Order' && !brandUrl
}

export function isDelivered(status: OrderStatus): boolean {
  return status === 'Done' || status === 'Sent to Client'
}

export function packTypeForAdCount(adCount: number): string {
  const map: Record<number, string> = {
    5: '5 ads',
    10: '10 ads',
    20: '20 ads',
    50: '50 ads',
  }
  return map[adCount] ?? `${adCount} ads`
}

export function parseAdCountFromPackType(packType: string): number {
  const match = packType.match(/(\d+)\s*ads?/i)
  return match ? Number(match[1]) : 0
}

export const CUSTOMER_ORDER_STAGES = [
  'Ordered',
  'In Design',
  'Review',
  'Revisions',
  'Ready',
] as const

export type CustomerOrderStage = (typeof CUSTOMER_ORDER_STAGES)[number]

export function getCustomerStageIndex(status: OrderStatus): number {
  const normalized = normalizeOrderStatus(status)

  if (normalized === 'New Order') return 0
  if (normalized === 'Ready for Design' || normalized === 'In Design' || normalized === 'Design Complete') {
    return 1
  }
  if (normalized === 'Sent to Client' || normalized === 'Sent v2') return 2
  if (normalized === 'Needs Revisions' || normalized === 'Revisions Complete') return 3
  if (normalized === 'Done') return 4

  return 0
}

export function getCustomerStageLabel(status: OrderStatus): CustomerOrderStage {
  return CUSTOMER_ORDER_STAGES[getCustomerStageIndex(status)]
}
