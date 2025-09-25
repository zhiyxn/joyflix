/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { getCacheTime, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    // 如果没有查询参数，可以返回一个空的JSON或错误信息
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const config = await getConfig();
  const apiSites = config.SourceConfig.filter((site) => !site.disabled);
  const cacheTime = await getCacheTime();

  // 创建一个可读流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const processSite = async (site: (typeof apiSites)[0]) => {
        try {
          const results = await Promise.race([
            searchFromApi(site, query),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`${site.name} timeout`)), 20000)
            ),
          ]);

          if (results && results.length > 0) {
            // 将每个数据源的结果作为一个JSON对象字符串发送，并用换行符分隔
            const chunk = encoder.encode(JSON.stringify(results) + '\n');
            controller.enqueue(chunk);
          }
        } catch (err: any) {
          console.warn(`搜索失败 ${site.name}:`, err.message);
          // 即使某个源失败，也不中断整个流
        }
      };

      // 并行处理所有站点
      const allPromises = apiSites.map(processSite);

      // 等待所有处理完成后关闭流
      await Promise.all(allPromises);
      controller.close();
    },
  });

  // 返回流式响应
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
      'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
      'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
    },
  });
}
