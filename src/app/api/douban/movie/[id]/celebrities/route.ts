import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const url = `https://movie.douban.com/subject/${id}/celebrities`;

  try {
    const response = await fetch(url);
    const html = await response.text();

    const celebrities: any[] = [];

    const castSectionMatch = html.match(/<h2>演员 Cast<\/h2>[\s\S]*?<ul class="celebrities-list[^>]*?>([\s\S]*?)<\/ul>/);
    if (castSectionMatch && castSectionMatch[1]) {
      const celebritiesListContent = castSectionMatch[1];
      // Regex to find each celebrity block within the list content
      const celebrityRegex = /<li class="celebrity">([\s\S]*?)<\/li>/g;
      let match;

      while ((match = celebrityRegex.exec(celebritiesListContent)) !== null) {
        const celebrityBlock = match[1];

      // Extract actorurl
      const actorurlMatch = celebrityBlock.match(/<a href="(https:\/\/www\.douban\.com\/personage\/\d+\/)"/);
      const actorurl = actorurlMatch ? actorurlMatch[1] : '';

      // Extract actorname (Chinese characters only)
      const actornameMatch = celebrityBlock.match(/<span class="name"><a.*?title="(.*?)"/);
      let actorname = actornameMatch ? actornameMatch[1] : '';
      const chineseNameMatch = actorname.match(/[\u4e00-\u9fa5]+/);
      actorname = chineseNameMatch ? chineseNameMatch[0] : actorname;


      // Extract role (remove Chinese and parentheses, format as "Actor 饰 Ritter")
      const roleMatch = celebrityBlock.match(/<span class="role" title="(.*?)">/);
      let role = roleMatch ? roleMatch[1] : '';
      const rolePartMatch = role.match(/\(饰 (.*?)\)/);
      role = rolePartMatch ? `饰 ${rolePartMatch[1]}` : '';


      // Extract actorposter
      const actorposterMatch = celebrityBlock.match(/background-image: url\((.*?)\)/);
      const actorposter = actorposterMatch ? actorposterMatch[1] : '';

      celebrities.push({
        actorname,
        actorposter,
        role,
        actorurl,
      });
    }

    }

    return NextResponse.json(celebrities);
  } catch (error) {
    console.error('Error fetching or parsing celebrity data:', error);
    return NextResponse.json({ error: 'Failed to fetch celebrity data' }, { status: 500 });
  }
}
