import { UserUsage, USAGE_LIMITS } from '@/types/usage'

// LocalStorage を使った使用量管理（後でDBに移行可能）
export class UsageManager {
  private static STORAGE_KEY = 'chat2doc_usage'

  // 現在の月を取得（YYYY-MM形式）
  private static getCurrentMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  // ユーザーの使用量データを取得
  static getUserUsage(userId: string, email: string): UserUsage {
    const currentMonth = this.getCurrentMonth()
    const usageData = this.getAllUsageData()
    const userKey = `${userId}-${currentMonth}`

    if (usageData[userKey]) {
      return usageData[userKey]
    }

    // 新規ユーザーまたは新月の場合、初期データを作成
    const newUsage: UserUsage = {
      userId,
      email,
      month: currentMonth,
      count: 0,
      plan: 'free', // デフォルトは無料プラン
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }

    this.saveUserUsage(newUsage)
    return newUsage
  }

  // 使用量を記録
  static recordUsage(userId: string, email: string): UserUsage {
    const usage = this.getUserUsage(userId, email)
    usage.count += 1
    usage.lastUsed = new Date().toISOString()
    this.saveUserUsage(usage)
    return usage
  }

  // 使用可能かチェック
  static canUseService(userId: string, email: string): {
    canUse: boolean
    usage: UserUsage
    remainingCount: number
    message?: string
  } {
    const usage = this.getUserUsage(userId, email)
    const limit = usage.plan === 'free' ? USAGE_LIMITS.free : USAGE_LIMITS.premium

    if (limit === -1) {
      // 無制限プラン
      return {
        canUse: true,
        usage,
        remainingCount: -1
      }
    }

    const remainingCount = Math.max(0, limit - usage.count)
    const canUse = usage.count < limit

    return {
      canUse,
      usage,
      remainingCount,
      message: canUse 
        ? `今月あと${remainingCount}回利用可能です`
        : '月間利用制限に達しました。プレミアムプランにアップグレードしてください。'
    }
  }

  // ユーザーのプランをアップグレード
  static upgradeToPremium(userId: string, email: string): UserUsage {
    const usage = this.getUserUsage(userId, email)
    usage.plan = 'premium'
    this.saveUserUsage(usage)
    return usage
  }

  // 全使用量データを取得
  private static getAllUsageData(): Record<string, UserUsage> {
    if (typeof window === 'undefined') return {}
    
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  // 使用量データを保存
  private static saveUserUsage(usage: UserUsage): void {
    if (typeof window === 'undefined') return

    const allData = this.getAllUsageData()
    const userKey = `${usage.userId}-${usage.month}`
    allData[userKey] = usage

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allData))
    } catch (error) {
      console.error('使用量データの保存に失敗:', error)
    }
  }

  // 管理者用：全ユーザーの使用状況を取得
  static getAllUserUsage(): UserUsage[] {
    const allData = this.getAllUsageData()
    return Object.values(allData)
  }

  // デバッグ用：データをリセット
  static resetUsageData(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.STORAGE_KEY)
  }
}