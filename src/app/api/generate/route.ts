import { NextResponse } from 'next/server';
import { generateAdContent } from '@/app/create-ad/actions';

export async function POST(req: Request) {
  try {
    const { clickUrl } = await req.json();
    if (!clickUrl) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }
    const result = await generateAdContent(clickUrl);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Generate Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate ad content" },
      { status: 500 }
    );
  }
}
