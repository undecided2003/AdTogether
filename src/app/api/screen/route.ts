import { NextResponse } from 'next/server';
import { screenAdContent } from '@/app/create-ad/actions';

export async function POST(req: Request) {
  try {
    const { title, description, clickUrl } = await req.json();
    const result = await screenAdContent(title, description, clickUrl);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Screen Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to screen ad content" },
      { status: 500 }
    );
  }
}
