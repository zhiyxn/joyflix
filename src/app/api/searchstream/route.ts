/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { getCacheTime, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { SearchResult } from '@/lib/types';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const config = await getConfig();
  const apiSites = config.SourceConfig.filter((site) => !site.disabled);
  const cacheTime = await getCacheTime();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const processSite = async (site: (typeof apiSites)[0]) => {
        try {
          const results: SearchResult[] = await Promise.race([
            searchFromApi(site, query),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`${site.name} timeout`)), 20000)
            ),
          ]);

          if (results && results.length > 0) {
            const chunk = encoder.encode(JSON.stringify(results) + '\n');
            controller.enqueue(chunk);
          }
        } catch (err: any) {
          console.warn(`搜索失败 ${site.name}:`, err.message);
        }
      };

      const allPromises = apiSites.map(processSite);
      await Promise.all(allPromises);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
      'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
      'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
    },
  });
}
