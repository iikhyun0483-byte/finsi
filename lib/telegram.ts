// lib/telegram.ts

export interface TelegramConfig {
  botToken: string
  chatId: string
}

export interface TelegramResult {
  success: boolean
  message?: string
  error?: string
}

export async function sendTelegramMessage(
  config: TelegramConfig,
  text: string
): Promise<TelegramResult> {
  try {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    })

    const data = await response.json()

    if (data.ok) {
      return {
        success: true,
        message: '메시지 전송 성공',
      }
    } else {
      return {
        success: false,
        error: data.description || '전송 실패',
      }
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

export async function verifyTelegramBot(botToken: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getMe`
    const response = await fetch(url)
    const data = await response.json()
    return data.ok === true
  } catch {
    return false
  }
}

export function formatSignalMessage(signal: {
  symbol: string
  type: 'BUY' | 'SELL'
  score: number
  price: number
  reason?: string
}): string {
  const emoji = signal.type === 'BUY' ? '🟢' : '🔴'
  const action = signal.type === 'BUY' ? '매수' : '매도'

  let message = `${emoji} <b>${action} 신호</b>\n\n`
  message += `📊 종목: <b>${signal.symbol}</b>\n`
  message += `💯 점수: <b>${signal.score}점</b>\n`
  message += `💰 가격: <b>${signal.price.toLocaleString()}</b>\n`

  if (signal.reason) {
    message += `\n📝 이유: ${signal.reason}`
  }

  message += `\n\n⏰ ${new Date().toLocaleString('ko-KR')}`

  return message
}
