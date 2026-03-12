import { NextRequest, NextResponse } from 'next/server';
import { generateAIComment, AICommentInput } from '@/lib/ai-comment';

export async function POST(request: NextRequest) {
  try {
    const input: AICommentInput = await request.json();

    const comment = await generateAIComment(input);

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error: any) {
    console.error('AI comment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'AI 코멘트 생성 실패',
      },
      { status: 500 }
    );
  }
}
