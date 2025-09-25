import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const start = searchParams.get('start') || '0';
  const count = searchParams.get('count') || '2';
  const ck = searchParams.get('ck') || '';

  if (!id) {
    return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
  }

  const url = `https://m.douban.com/rexxar/api/v2/movie/${id}/verify_users?start=${start}&count=${count}&ck=${ck}`;

  const config = await getConfig();
  const cookie = config.douban?.cookie || '';

  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://m.douban.com/',
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from Douban: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[DOUBAN DETAIL API ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
