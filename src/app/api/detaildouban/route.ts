import { NextRequest, NextResponse } from 'next/server';
import { getCacheTime } from '@/lib/config';
import { fetchDoubanData } from '@/lib/douban';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const start = searchParams.get('start') || '0';
  const count = searchParams.get('count') || '2';
  const ck = searchParams.get('ck') || '';

  if (!id) {
    return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
  }

  const url = `https://m.douban.com/rexxar/api/v2/movie/${id}/verify_users?start=${start}&count=${count}&ck=${ck}`;

  try {
    const data = await fetchDoubanData<any>(url);
    
    const cacheTime = await getCacheTime();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
      },
    });

  } catch (error) {
    console.error('[DOUBAN DETAIL API ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
