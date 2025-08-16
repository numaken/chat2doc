import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { signOut } from 'next-auth/react'

export async function DELETE(request: NextRequest) {
  console.log('🗑️ アカウント削除リクエスト開始')
  
  try {
    // 認証チェック
    console.log('🔍 認証確認中...')
    const session = await getServerSession()
    console.log('👤 セッション情報:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    })
    
    if (!session || !session.user || !session.user.email) {
      console.log('❌ 認証エラー: セッションまたはユーザー情報が不足')
      return NextResponse.json(
        { 
          error: 'ログインが必要です。',
          code: 'AUTHENTICATION_REQUIRED'
        },
        { status: 401 }
      )
    }

    // LocalStorageデータのクリア指示（クライアント側で実行）
    console.log('🧹 ユーザーデータクリア準備:', {
      userId: session.user.id,
      email: session.user.email
    })

    // ここで通常はデータベースからユーザーデータを削除しますが、
    // 現在はLocalStorageベースなので、クライアント側でクリアします

    console.log('✅ アカウント削除処理完了')

    return NextResponse.json({
      success: true,
      message: 'アカウントが正常に削除されました',
      action: 'clear_local_storage',
      userId: session.user.id
    })

  } catch (error) {
    console.error('❌ アカウント削除エラー:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: 'アカウント削除中にエラーが発生しました',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}