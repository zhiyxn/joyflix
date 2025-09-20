/* eslint-disable @typescript-eslint/no-explicit-any,no-console */
import he from 'he';
import Hls from 'hls.js';

function getDoubanImageProxyConfig(): {
  proxyType:
    | 'direct'
    | 'server'
    | 'img3'
    | 'cmliussss-cdn-tencent'
    | 'cmliussss-cdn-ali'
    | 'custom';
  proxyUrl: string;
} {
  const doubanImageProxyType =
    localStorage.getItem('doubanImageProxyType') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
    'direct';
  const doubanImageProxy =
    localStorage.getItem('doubanImageProxyUrl') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY ||
    '';
  return {
    proxyType: doubanImageProxyType,
    proxyUrl: doubanImageProxy,
  };
}

/**
 * 处理图片 URL，如果设置了图片代理则使用代理
 */
export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  // 仅处理豆瓣图片代理
  if (!originalUrl.includes('doubanio.com')) {
    return originalUrl;
  }

  const { proxyType, proxyUrl } = getDoubanImageProxyConfig();
  switch (proxyType) {
    case 'server':
      return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
    case 'img3':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, 'img3.doubanio.com');
    case 'cmliussss-cdn-tencent':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.net'
      );
    case 'cmliussss-cdn-ali':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.com'
      );
    case 'custom':
      return `${proxyUrl}${encodeURIComponent(originalUrl)}`;
    case 'direct':
    default:
      return originalUrl;
  }
}

/**
 * 从m3u8地址获取视频质量等级和网络信息
 * @param m3u8Url m3u8播放列表的URL
 * @returns Promise<{quality: string, loadSpeed: string, pingTime: number}> 视频质量等级和网络信息
 */
export async function getVideoResolutionFromM3u8(m3u8Url: string): Promise<{
  quality: string;
  loadSpeed: string;
  pingTime: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';

    const hls = new Hls({
      // 8秒内必须加载到首个片段，否则超时
      fragLoadingTimeOut: 8000,
    });

    let testResult = {
      quality: '未知',
      loadSpeed: '未知',
      pingTime: 0,
    };

    let requestTime = 0;
    let hasResolved = false;

    const cleanup = () => {
      if (hasResolved) return;
      hasResolved = true;
      
      clearTimeout(timeout);
      if (hls) {
        hls.off(Hls.Events.FRAG_LOADING);
        hls.off(Hls.Events.FRAG_LOADED);
        hls.off(Hls.Events.ERROR);
        hls.destroy();
      }
      if (video) {
        video.onloadedmetadata = null;
        video.onerror = null;
        video.src = '';
        video.load();
        video.remove();
      }
    };

    // 设置一个总体的、最后的超时防线
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout: Test took longer than 8 seconds.'));
    }, 8000);

    video.onerror = () => {
      cleanup();
      reject(new Error('Video element failed to load metadata.'));
    };

    // 监听HLS事件
    hls.on(Hls.Events.FRAG_LOADING, () => {
      if (testResult.pingTime === 0) {
        testResult.pingTime = performance.now() - requestTime;
      }
    });

    hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
      // 首个片段加载成功，我们已经获得了足够的信息来判断线路是否可用
      const loadTime = data.frag.stats.loading.end - data.frag.stats.loading.first;
      const size = data.frag.stats.loaded;
      if (loadTime > 0 && size > 0) {
        const speedKBps = size / 1024 / (loadTime / 1000);
        testResult.loadSpeed = speedKBps >= 1024 ? `${(speedKBps / 1024).toFixed(1)} MB/s` : `${speedKBps.toFixed(1)} KB/s`;
      }

      // 尝试从 video 元素获取分辨率
      if (video.videoWidth > 0) {
         const width = video.videoWidth;
         testResult.quality =
            width >= 3840 ? '4K' :
            width >= 2560 ? '2K' :
            width >= 1920 ? '1080P' :
            width >= 1280 ? '720P' :
            width >= 854 ? '480P' : 'SD';
      }
      
      cleanup();
      resolve({
        ...testResult,
        pingTime: Math.round(testResult.pingTime),
      });
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        cleanup();
        reject(new Error(`HLS fatal error: ${data.details}`));
      }
    });

    // 启动测试
    requestTime = performance.now();
    hls.loadSource(m3u8Url);
    hls.attachMedia(video);
  });
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';

  const cleanedText = text
    .replace(/<[^>]+>/g, '\n') // 将 HTML 标签替换为换行
    .replace(/\n+/g, '\n') // 将多个连续换行合并为一个
    .replace(/[ \t]+/g, ' ') // 将多个连续空格和制表符合并为一个空格，但保留换行符
    .replace(/^\n+|\n+$/g, '') // 去掉首尾换行
    .trim(); // 去掉首尾空格

  // 使用 he 库解码 HTML 实体
  return he.decode(cleanedText);
}
