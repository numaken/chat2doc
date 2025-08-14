// 使用量管理の型定義
export interface UserUsage {
  userId: string
  email: string
  month: string // "2024-08" 形式
  count: number // 今月の使用回数
  plan: "free" | "premium"
  lastUsed: string // ISO string
  createdAt: string
}

export interface UsageLimit {
  free: number // 無料プランの月間制限
  premium: number // プレミアムプランの制限（-1は無制限）
}

export const USAGE_LIMITS: UsageLimit = {
  free: 5,
  premium: -1 // 無制限
}