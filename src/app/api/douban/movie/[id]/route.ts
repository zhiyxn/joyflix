import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Douban ID is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://movie.douban.com/subject/${id}/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data from Douban: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const description = $('span[property="v:summary"]').text().replace(/\s+/g, ' ').trim() ?? '';
    const genres = $('span[property="v:genre"]').map((i, el) => $(el).text()).get().join(',');
    const year = $('span.year').text().replace('(', '').replace(')', '') ?? '';

    let country = '';
    $('#info span.pl').each((i, el) => {
      if ($(el).text().includes('制片国家/地区')) {
        const nextSibling = el.nextSibling;
        if (nextSibling && nextSibling.nodeType === 3) { // 3 代表 Node.TEXT_NODE
          country = nextSibling.nodeValue.trim().replace(/ \/ /g, ',');
        }
        return false;
      }
    });

    const recommendations = $('#recommendations .recommendations-bd dl').map((i, el) => {
      const link = $('dd a', el);
      const title = link.text();
      const href = link.attr('href');
      const doubanIDMatch = href ? href.match(/subject\/(\d+)/) : null;
      const doubanID = doubanIDMatch ? doubanIDMatch[1] : '';
      const likeposter = $('img', el).attr('src');
      const subjectRate = $('.subject-rate', el).text();

      return {
        title,
        likeposter,
        doubanID,
        subjectRate,
      };
    }).get();

    

    let trailerUrl = '';
    const trailerElement = $('.label-trailer .related-pic-video');
    if (trailerElement.length > 0) {
      trailerUrl = trailerElement.attr('href') || '';
    }

    return NextResponse.json({
      description,
      genre: genres,
      country,
      year,
      recommendations,
      trailerUrl,
    });
  } catch (error) {
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
