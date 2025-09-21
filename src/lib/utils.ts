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
async function _getVideoResolutionFromM3u8(m3u8Url: string): Promise<{
  quality: string;
  loadSpeed: string;
  pingTime: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';

    const pingStart = performance.now();
    let pingTime = 0;

    fetch(m3u8Url, { method: 'HEAD', mode: 'no-cors' })
      .then(() => {
        pingTime = performance.now() - pingStart;
      })
      .catch(() => {
        pingTime = performance.now() - pingStart;
      });

    const hls = new Hls();

    const cleanup = () => {
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

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout loading video metadata'));
    }, 8000); // 增加 Safari 浏览器超时时间

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };

    let actualLoadSpeed = '未知';
    let hasSpeedCalculated = false;
    let fragmentStartTime = 0; // 用于手动计时

    const checkAndResolve = () => {
      const width = video.videoWidth;
      cleanup();

      if (width && width > 0) {
        const quality =
          width >= 3840 ? '4K' :
          width >= 2560 ? '2K' :
          width >= 1920 ? '1080P' :
          width >= 1280 ? '720P' :
          width >= 854 ? '480P' : 'SD';
        resolve({ quality, loadSpeed: actualLoadSpeed, pingTime: Math.round(pingTime) });
      } else {
        resolve({ quality: '未知', loadSpeed: actualLoadSpeed, pingTime: Math.round(pingTime) });
      }
    };

    hls.on(Hls.Events.FRAG_LOADING, () => {
        fragmentStartTime = performance.now();
    });

    hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
      if (!hasSpeedCalculated && data.payload.byteLength && fragmentStartTime > 0) {
        const loadTime = performance.now() - fragmentStartTime;
        const size = data.payload.byteLength;
        if (loadTime > 0 && size > 0) {
          const speedKBps = size / 1024 / (loadTime / 1000);
          actualLoadSpeed = speedKBps >= 1024 ? `${(speedKBps / 1024).toFixed(1)} MB/s` : `${speedKBps.toFixed(1)} KB/s`;
          hasSpeedCalculated = true;
        }
      }
    });

    video.onloadedmetadata = checkAndResolve;

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        cleanup();
        reject(new Error(`HLS playback failed: ${data.type} - ${data.details}`));
      }
    });

    hls.loadSource(m3u8Url);
    hls.attachMedia(video);
  });
}

async function _getVideoResolutionFromManifest(m3u8Url: string): Promise<{
  quality: string;
  loadSpeed: string;
  pingTime: number;
}> {
  const pingStart = performance.now();
  const response = await fetch(m3u8Url);
  const pingTime = performance.now() - pingStart;

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const content = await response.text();
  const size = new TextEncoder().encode(content).length;
  const loadTime = pingTime;

  let loadSpeed = '未知';
  if (loadTime > 0 && size > 0) {
    const speedKBps = size / 1024 / (loadTime / 1000);
    loadSpeed = speedKBps >= 1024 ? `${(speedKBps / 1024).toFixed(1)} MB/s` : `${speedKBps.toFixed(1)} KB/s`;
  }

  const resolutionRegex = /RESOLUTION=(\d+)x(\d+)/g;
  let match;
  let maxResolution = 0;

  while ((match = resolutionRegex.exec(content)) !== null) {
    const width = parseInt(match[1], 10);
    if (width > maxResolution) {
      maxResolution = width;
    }
  }

  let quality = '未知';
  if (maxResolution > 0) {
    quality =
      maxResolution >= 3840 ? '4K' :
      maxResolution >= 2560 ? '2K' :
      maxResolution >= 1920 ? '1080P' :
      maxResolution >= 1280 ? '720P' :
      maxResolution >= 854 ? '480P' : 'SD';
  }

  return { quality, loadSpeed, pingTime: Math.round(pingTime) };
}

export async function getVideoResolutionFromM3u8(m3u8Url: string): Promise<{
  quality: string;
  loadSpeed: string;
  pingTime: number;
}> {
  try {
    const primaryResult = await _getVideoResolutionFromM3u8(m3u8Url);
    if (primaryResult.quality !== '未知') {
      return primaryResult; // 主要方法成功
    }
    // 主要方法未能确定质量，尝试回退
    console.warn('Primary method failed for quality, trying manifest parsing as fallback.');
    return await _getVideoResolutionFromManifest(m3u8Url);
  } catch (error) {
    console.error('Primary method failed with error, trying manifest parsing as fallback:', error);
    // 主要方法失败并出现错误，尝试回退
    return await _getVideoResolutionFromManifest(m3u8Url);
  }
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
