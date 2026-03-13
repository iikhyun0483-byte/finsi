// app/api/telegram/route.ts
// botToken은 서버에서 Supabase user_settings에서 직접 조회
// 클라이언트에 토큰 노출 없음
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // 서버에서만 사용
)

export async function POST(req: NextRequest) {
  try {
    const { userId, text } = await req.json()
    if (!userId || !text) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 })
    }
    const { data: settings } = await supabase
      .from('user_settings')
      .select('telegram_bot_token, telegram_chat_id')
      .eq('user_id', userId)
      .single()

    if (!settings?.telegram_bot_token || !settings?.telegram_chat_id) {
      return NextResponse.json({ error: '텔레그램 미설정' }, { status: 400 })
    }

    const result = await sendTelegramMessage(
      { botToken: settings.telegram_bot_token, chatId: settings.telegram_chat_id },
      text
    )
    return NextResponse.json(result)
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
