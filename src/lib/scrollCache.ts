
import { DoubanItem } from './types';

// 定义缓存数据的结构
export interface ScrollCacheData {
  scrollPosition: number; // 滚动位置
  items: DoubanItem[]; // 已加载的视频数据
  hasNextPage: boolean; // 是否还有下一页
  timestamp: number; // 时间戳
  // 筛选条件状态
  primarySelection: string;
  secondarySelection: string;
  multiLevelValues: Record<string, string>;
  selectedWeekday: string;
}

const CACHE_PREFIX = 'joyflix-scroll-cache-';

/**
 * 生成缓存键
 * @param key - 通常是页面的路径名，如 '/douban'
 */
const getCacheKey = (key: string): string => `${CACHE_PREFIX}${key}`;

/**
 * 从 sessionStorage 中读取缓存
 * @param key - 页面唯一标识
 */
export const getScrollCache = (key: string): ScrollCacheData | null => {
  try {
    const cacheKey = getCacheKey(key);
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData) as ScrollCacheData;
    }
  } catch (error) {
  }
  return null;
};

/**
 * 将状态写入 sessionStorage
 * @param key - 页面唯一标识
 * @param data - 要缓存的数据
 */
export const setScrollCache = (key: string, data: ScrollCacheData): void => {
  try {
    const cacheKey = getCacheKey(key);
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
  }
};

/**
 * 清除指定页面的缓存
 * @param key - 页面唯一标识
 */
export const clearScrollCache = (key: string): void => {
  try {
    const cacheKey = getCacheKey(key);
    sessionStorage.removeItem(cacheKey);
  } catch (error) {
  }
};

/**
 * 清除所有页面的滚动缓存（例如，在用户登出时）
 */
export const clearAllScrollCaches = (): void => {
  try {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
  }
}
