/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextResponse } from 'next/server';

import { getCacheTime, getConfig } from '@/lib/config';
import { searchAndFindFromApi } from '@/lib/downstream-stream';
import { SearchResult } from '@/lib/types';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const year = searchParams.get('year');

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  const config = await getConfig();
  const apiSites = config.SourceConfig.filter((site) => !site.disabled);

  try {
    const searchPromises = apiSites.map(site =>
      searchAndFindFromApi(site, query, year, config.SiteConfig.SearchDownstreamMaxPage)
    );

    const results = await Promise.all(searchPromises);

    // 查找第一个未被过滤的有效结果
    const firstValidResult = results.find(result => {
      if (!result) return false;
      // 应用关键词过滤
      if (config.SiteConfig.DisableYellowFilter || !yellowWords.some((word: string) => (result.type_name || '').replace(/[()]/g, '').includes(word))) {
        return true;
      }
      return false;
    });

    if (firstValidResult) {
      const cacheTime = await getCacheTime();
      return NextResponse.json(firstValidResult, {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        },
      });
    }

    return NextResponse.json({ error: 'No results found' }, { status: 404 });

  } catch (error) {
    console.error('流式搜索失败:', error);
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}