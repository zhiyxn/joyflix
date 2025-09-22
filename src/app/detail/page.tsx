
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { Heart, PlayCircle, Star, Video } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

import PageLayout from '@/components/PageLayout';
import RecommendationSection from '@/components/RecommendationSection';
import CelebritiesSection from '@/components/CelebritiesSection';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import {
  deleteFavorite,
  isFavorited as checkIfFavorited,
  saveFavorite,
  subscribeToDataUpdates,
  deleteFavoriteByTitle,
} from '@/lib/db.client';
import { Favorite, SearchResult } from '@/lib/types';
import { processImageUrl } from '@/lib/utils';
import { useIsTablet } from '@/lib/useIsTablet';


function DetailPageClient() {
  const [instanceId] = useState(() => Date.now().toString());
  const [isMobile, setIsMobile] = useState(false); // New state for mobile detection

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    };

    checkMobile(); // Check on mount
    window.addEventListener('resize', checkMobile); // Update on resize

    return () => {
      window.removeEventListener('resize', checkMobile); // Cleanup
    };
  }, []); // Run once on mount
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isTablet = useIsTablet();

  const doubanId = searchParams.get('doubanId');
  const rate = searchParams.get('rate');

  const fetchDoubanMovieData = async (id: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

      const response = await fetch(`/api/douban/movie/${id}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Douban movie API error for doubanId ${id}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`Douban movie API request timed out for doubanId ${id}`);
      } else {
        console.error(`Error fetching from Douban movie API for doubanId ${id}:`, error);
      }
      return null;
    }
  };

  const fetchWMDBData = async (id: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

      const response = await fetch(`/api/wmdb?id=${id}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`WMDB API proxy error for doubanId ${id}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`WMDB API proxy request timed out for doubanId ${id}`);
      } else {
        console.error(`Error fetching from WMDB API proxy for doubanId ${id}:`, error);
      }
      return null;
    }
  };

  const fetchCelebritiesData = async (id: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

      const response = await fetch(`/api/douban/movie/${id}/celebrities`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Douban celebrities API error for doubanId ${id}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`Douban celebrities API request timed out for doubanId ${id}`);
      } else {
        console.error(`Error fetching from Douban celebrities API for doubanId ${id}:`, error);
      }
      return null;
    }
  };

  const source = searchParams.get('source');
  const id = searchParams.get('id');
  const title = searchParams.get('title');
  const year = searchParams.get('year');
  const initialPoster = searchParams.get('poster');
  const initialClass = searchParams.get('class');
  const initialDesc = searchParams.get('desc');

  // Initialize detail with whatever is available from searchParams
  const [detail, setDetail] = useState<SearchResult | null>(() => {
    // Prioritize initialPoster if available, and initialize other fields
    if (source || id || title) { // Check if any basic param is present to initialize detail
      return {
        id: id || '',
        source: source || '',
        title: title || '',
        year: year || undefined,
        poster: initialPoster || '', // Always use initialPoster if present, otherwise empty
        class: initialClass || undefined,
        desc: initialDesc || undefined,
        episodes: [],
        episodes_titles: [],
        source_name: '',
      } as SearchResult;
    }
    return null;
  });

  const [isLoadingApi, setIsLoadingApi] = useState(false); // Indicates if an API call is in progress
  const [error, setError] = useState<string | null>(null);

  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false); // Keep this for disabling the button during the async operation
  const [allFavorites, setAllFavorites] = useState<Record<string, Favorite>>({});
  const [showTrailerConfirmDialog, setShowTrailerConfirmDialog] = useState(false);
  const [showNoTrailerDialog, setShowNoTrailerDialog] = useState(false);

  const handleConfirmTrailer = () => {
    if (detail?.trailerUrl) {
      window.open(detail.trailerUrl, '_blank');
    }
    setShowTrailerConfirmDialog(false);
  };

  // Check favorite status on mount and when detail changes
  useEffect(() => {
    if (!detail?.title) return;

    const fetchFavoriteStatus = async () => {
      try {
        // Fetch the entire favorites list
        const response = await fetch('/api/favorites');
        if (!response.ok) {
          throw new Error('Failed to fetch favorites');
        }
        const favorites: Record<string, Favorite> = await response.json();
        setAllFavorites(favorites); // Store all favorites in state

        // Check if any favorite has the same title
        const isAlreadyFavoritedByTitle = Object.values(favorites).some(
          (fav) => fav.title === detail.title
        );

        setIsFavorited(isAlreadyFavoritedByTitle);
      } catch (err) {
        console.error('Failed to check favorite status', err);
      }
    };

    fetchFavoriteStatus();

    // We still subscribe to updates to reflect changes made on this page immediately
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        setAllFavorites(newFavorites); // Update all favorites in state on update
        const isNowFavoritedByTitle = Object.values(newFavorites).some(
          (fav) => fav.title === detail.title
        );
        setIsFavorited(isNowFavoritedByTitle);
      }
    );

    return () => unsubscribe(); // Cleanup subscription
  }, [detail]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingApi(true);
      setError(null);

      try {
        let videoDetailToSet: SearchResult | null = null;
        let doubanDataFetched = false;
        let wmdbDataFetched = false;

        if (doubanId) {
          const doubanData = await fetchDoubanMovieData(doubanId);
          if (doubanData) {
            videoDetailToSet = {
              id: id || '',
              source: source || '',
              title: title || doubanData.title || '',
              year: doubanData.year || year || undefined,
              poster: initialPoster || (doubanData.recommendations && doubanData.recommendations[0] && doubanData.recommendations[0].likeposter) || '',
              class: doubanData.genre || initialClass || undefined,
              desc: doubanData.description || initialDesc || undefined,
              country: doubanData.country || undefined,
              recommendations: doubanData.recommendations || [],
              trailerUrl: doubanData.trailerUrl || undefined,
              episodes: [],
              episodes_titles: [],
              source_name: '',
            } as SearchResult;
            doubanDataFetched = true;
          }
        }

        if (!doubanDataFetched && doubanId) {
          const wmdbData = await fetchWMDBData(doubanId);
          
          if (wmdbData && wmdbData.data && wmdbData.data.length > 0) {
            const movieData = wmdbData.data[0]; // Assuming the first item is the relevant one
            
            
            videoDetailToSet = {
              id: id || '', // Keep existing id or empty
              source: source || '', // Keep existing source or empty
              title: title || movieData.name || '', // Prioritize existing title, then WMDB name
              year: wmdbData.year || year || undefined, // Prioritize WMDB year, then existing year
              poster: initialPoster || movieData.poster || '', // Prioritize existing poster, then WMDB poster
              class: movieData.genre
                ? Array.isArray(movieData.genre)
                  ? movieData.genre.join(', ')
                  : String(movieData.genre)
                : initialClass || undefined, // WMDB genre, then existing class
              desc: movieData.description || initialDesc || undefined, // WMDB description, then existing desc
              country: movieData.country || undefined, // WMDB country
              episodes: [], // Not provided by WMDB, keep empty
              episodes_titles: [], // Not provided by WMDB, keep empty
              source_name: '', // Not provided by WMDB, keep empty
            } as SearchResult;
            wmdbDataFetched = true;
          }
        }

        // Fallback to existing logic if WMDB data was not fetched or doubanId was not present
        if (!doubanDataFetched && !wmdbDataFetched) {
          // Scenario 1: We have source and id. Fetch full details.
          if (source && id) {
            const detailResponse = await fetch(
              `/api/detail?source=${source}&id=${id}`
            );
            if (!detailResponse.ok) {
              throw new Error(`获取视频详情失败: ${detailResponse.statusText}`);
            }
            const fetchedDetail = await detailResponse.json();
            videoDetailToSet = fetchedDetail ? { ...fetchedDetail } : null;

            // Preserve initial poster if provided
            if (initialPoster && videoDetailToSet) {
              videoDetailToSet.poster = initialPoster;
            }
          }
          // If we don't have source/id, but we already have a description,
          // then we consider the data sufficient and don't need to hit the stream API.
          else if (detail?.desc) {
            videoDetailToSet = detail;
          }
          // Scenario 2: We only have a title. Search for it.
          else if (title) {
            const searchResponse = await fetch(
              `/api/search/stream?q=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`
            );
            if (!searchResponse.ok) {
              throw new Error(`搜索视频源失败: ${searchResponse.statusText}`);
            }
            const foundVideoDetail = await searchResponse.json();

            if (!foundVideoDetail) {
              throw new Error('未找到任何相关的视频源');
            }

            videoDetailToSet = foundVideoDetail ? { ...foundVideoDetail } : null;

            // Preserve initial poster if provided
            if (initialPoster && videoDetailToSet) {
              videoDetailToSet.poster = initialPoster;
            }
          }
          else {
            // No source/id and no title.
            // The component already handles the case where detail is null.
            return;
          }
        }

        // Fetch celebrities data if doubanId is available and videoDetailToSet exists
        if (doubanId && videoDetailToSet) {
          const celebritiesData = await fetchCelebritiesData(doubanId);
          if (celebritiesData && celebritiesData.length > 0) {
            videoDetailToSet.celebrities = celebritiesData;
          }
        }

        if (!videoDetailToSet) {
          throw new Error('无法获取视频详情');
        }

        setDetail(prevDetail => {
          if (!videoDetailToSet) {
            return prevDetail; // Should not happen due to earlier check, but for safety
          }

          // Initialize newDetail based on prevDetail or a default SearchResult structure
          const newDetail: SearchResult = prevDetail
            ? { ...prevDetail }
            : { // Default SearchResult structure if prevDetail is null
                id: '',
                source: '',
                title: '',
                year: '',
                poster: '',
                class: '',
                desc: '',
                episodes: [],
                episodes_titles: [],
                source_name: '',
              };

          // Always update core identifiers from videoDetailToSet, ensuring they are strings
          // Use videoDetailToSet.field if it exists and is truthy, otherwise keep newDetail.field
          newDetail.id = videoDetailToSet.id || newDetail.id;
          newDetail.source = videoDetailToSet.source || newDetail.source;
          newDetail.title = videoDetailToSet.title || newDetail.title;
          newDetail.source_name = videoDetailToSet.source_name || newDetail.source_name;

          // Conditionally update optional fields only if they are "missing" in prevDetail
          // "Missing" for strings means null, undefined, or empty string
          if (!newDetail.year && videoDetailToSet.year) newDetail.year = videoDetailToSet.year;
          if (!newDetail.poster && videoDetailToSet.poster) newDetail.poster = videoDetailToSet.poster;
          if (!newDetail.class && videoDetailToSet.class) newDetail.class = videoDetailToSet.class;
          if (!newDetail.desc && videoDetailToSet.desc) newDetail.desc = videoDetailToSet.desc;
          if (!newDetail.country && videoDetailToSet.country) newDetail.country = videoDetailToSet.country;
          if ((!newDetail.recommendations || newDetail.recommendations.length === 0) && videoDetailToSet.recommendations && videoDetailToSet.recommendations.length > 0) {
            newDetail.recommendations = videoDetailToSet.recommendations;
          }
          // Add this block
          if ((!newDetail.celebrities || newDetail.celebrities.length === 0) && videoDetailToSet.celebrities && videoDetailToSet.celebrities.length > 0) {
            newDetail.celebrities = videoDetailToSet.celebrities;
          }
          if (!newDetail.trailerUrl && videoDetailToSet.trailerUrl) {
            newDetail.trailerUrl = videoDetailToSet.trailerUrl;
          }

          // "Missing" for arrays means null, undefined, or empty array
          if ((!newDetail.episodes || newDetail.episodes.length === 0) && videoDetailToSet.episodes && videoDetailToSet.episodes.length > 0) {
            newDetail.episodes = videoDetailToSet.episodes;
          }
          if ((!newDetail.episodes_titles || newDetail.episodes_titles.length === 0) && videoDetailToSet.episodes_titles && videoDetailToSet.episodes_titles.length > 0) {
            newDetail.episodes_titles = videoDetailToSet.episodes_titles;
          }

          return newDetail;
        });
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setIsLoadingApi(false);
      }
    };

    fetchData();
  }, [source, id, title, year, initialPoster, doubanId]);

  

  

  const handlePlay = () => {
    if (!detail) return;

    const playParams = new URLSearchParams();
    const hasOriginalSource = searchParams.get('source');

    if (hasOriginalSource) {
      playParams.set('source', detail.source);
      playParams.set('id', detail.id);
      playParams.set('title', detail.title);
      if (detail.year) {
        playParams.set('year', detail.year);
      }
      
      const stitle = searchParams.get('stitle');
      if (stitle) {
        playParams.set('stitle', stitle);
      }
    } else {
      const originalTitle = searchParams.get('title');
      const originalYear = searchParams.get('year');
      if (originalTitle) {
        playParams.set('title', originalTitle);
      }
      if (originalYear) {
        playParams.set('year', originalYear);
      }
    }

    router.push(`/play?${playParams.toString()}`);
  };

  const handleFavorite = useCallback(async () => {
    if (!detail?.title) return;

    setIsFavoriting(true);
    setError(null);

    try {
      if (isFavorited) {
        // Item is already favorited, so unfavorite it
        // Find the exact favorite entry by title and then delete using its key
        const favoritedEntryKey = Object.keys(allFavorites).find(key => allFavorites[key].title === detail.title);

        if (favoritedEntryKey) {
          // The key is in the format "source+id"
          const [sourceToDelete, idToDelete] = favoritedEntryKey.split('+');
          await deleteFavorite(sourceToDelete, idToDelete); // Use the more general deleteFavorite
        } else {
          // Fallback: if for some reason the key wasn't found, try deleting by title
          // This might happen if the favorite was added by another mechanism not using source+id
          // or if the allFavorites state is not perfectly in sync.
          await deleteFavoriteByTitle(detail.title);
        }
      } else {
        // Item is not favorited, so favorite it
        const favoriteData = {
          title: detail.title,
          source_name: '收藏',
          year: detail.year || '',
          cover: detail.poster || '',
          total_episodes: 1,
          save_time: Date.now(),
          doubanId: doubanId || undefined, // Add doubanId here
        };
        // When saving, we still use 'title_based' and detail.title as source and id
        // to maintain consistency for favorites initiated from this page.
        await saveFavorite('title_based', detail.title, favoriteData);
      }
    } catch (err: any) {
      console.error('收藏/取消收藏操作失败', err);
      setError(err.message || '收藏/取消收藏操作失败');
    } finally {
      setIsFavoriting(false);
    }
  }, [detail, isFavorited, allFavorites]);

  

  if (error) {
    return (
      <PageLayout activePath={pathname}>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-8'>

          <div className='flex items-center justify-center min-h-[calc(100vh-200px)]'>
            <div className='text-center text-red-500'>
              <h2 className='text-2xl font-bold mb-2'>加载失败</h2>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // If detail is null and we are not loading, it means we couldn't even initialize with basic params
  if (!detail && !isLoadingApi) {
    return (
      <PageLayout activePath={pathname}>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-8'>

          <div className='flex items-center justify-center min-h-[calc(100vh-200px)]'>
            <div className='text-center text-gray-500 dark:text-gray-400'>
              <h2 className='text-2xl font-bold mb-2'>未找到视频详情</h2>
              <p>请检查您的查询参数。</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePath={pathname}>
      <div className={`max-w-[96%] mx-auto px-4 sm:px-10 lg:px-8 pb-8 relative ${isTablet ? 'pt-14' : ''} ${isMobile ? 'pt-4' : 'pt-8'}`}>
        
        <div className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 ${!isMobile ? 'pt-10' : 'pt-0'}`}>
          <div className='md:col-span-1 lg:col-span-1'>
            <div className='relative aspect-[2/3] w-full rounded-lg overflow-hidden shadow-2xl'>
              {initialPoster || detail?.poster ? (
                <>
                  <Image
                    src={processImageUrl(initialPoster || detail?.poster || '')}
                    alt={detail?.title || 'Video Poster'}
                    fill
                    className='object-cover'
                    referrerPolicy='no-referrer'
                  />
                  
                </>
              ) : (isLoadingApi ? <div className='w-full h-full bg-gray-500 dark:bg-gray-400 animate-pulse'></div> : null)}
            </div>
          </div>

          <div className='md:col-span-2 lg:col-span-3 flex flex-col'>
            <div className='flex items-center gap-2 mb-3'>
              <h1 className='text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100'>
                {detail?.title ? detail.title : (isLoadingApi ? <div className='h-10 bg-gray-500 dark:bg-gray-400 rounded w-3/4 mb-3 animate-pulse'></div> : null)}
              </h1>
              {isMobile && (
                <button
                  onClick={handleFavorite}
                  className={`
                    flex items-center justify-center
                    w-10 h-10 rounded-full bg-transparent p-0
                  `}
                  disabled={isFavoriting}
                >
                  <Heart
                    size={24}
                    className={`transition-all duration-300 ease-out ${
                      isFavorited ? 'fill-red-500 stroke-red-500' : 'fill-transparent stroke-gray-600 dark:stroke-gray-300'
                    }`}
                  />
                </button>
              )}
            </div>

            <div className='flex flex-row flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6'>
              {/* Douban Rate - First */}
              {rate && (
                <span className='px-2 py-1 border border-gray-400/60 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1'>
                  <Star size={14} className='fill-current text-yellow-400' />
                  {rate}
                </span>
              )}

              {/* Year - Second */}
              {detail?.year ? (
                <span className='px-2 py-1 border border-gray-400/60 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300'>
                  {detail.year}
                </span>
              ) : (isLoadingApi ? <div className='h-6 bg-gray-500 dark:bg-gray-400 rounded w-16 animate-pulse'></div> : null)}

              {/* Class - Third */}
              {detail?.class ? (
                <span className='px-2 py-1 border border-gray-400/60 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300'>
                  {detail.class}
                </span>
              ) : (isLoadingApi ? <div className='h-6 bg-gray-500 dark:bg-gray-400 rounded w-24 animate-pulse'></div> : null)}

              {/* Country - Fourth */}
              {detail?.country ? (
                <span className='px-2 py-1 border border-gray-400/60 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300'>
                  {detail.country}
                </span>
              ) : (isLoadingApi ? <div className='h-6 bg-gray-500 dark:bg-gray-400 rounded w-24 animate-pulse'></div> : null)}
              
            </div>

            <div className='mb-6 flex flex-row items-center gap-4'>
              <button
                onClick={handlePlay}
                className='w-1/2 sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-blue-350 bg-opacity-80 text-white font-bold rounded-lg shadow-lg hover:bg-blue-400 active:bg-blue-400 transition-all duration-300 transform hover:scale-105'
                disabled={!detail?.title || !detail?.year} // 只要有title和year值即可点击
              >
                <PlayCircle size={24} />
                <span className='whitespace-nowrap'>{isMobile ? '播放' : '立即播放'}</span>
              </button>
              {/* New Trailer Button */}
              <button
                onClick={() => {
                  if (isLoadingApi) return; // Do nothing if still loading
                  if (detail?.trailerUrl && detail.trailerUrl.length > 0) {
                    setShowTrailerConfirmDialog(true);
                  } else {
                    setShowNoTrailerDialog(true);
                  }
                }}
                className='w-1/2 sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-blue-350 bg-opacity-80 text-white font-bold rounded-lg shadow-lg hover:bg-blue-400 active:bg-blue-400 transition-all duration-300 transform hover:scale-105'
                disabled={isLoadingApi}
              >
                <Video size={24} />
                <span className='whitespace-nowrap'>预告</span>
              </button>
              
            {!isMobile && (
                <button
                  onClick={handleFavorite}
                  className={`w-1/2 flex items-center justify-center gap-2 px-8 py-4 bg-gray-400 sm:${isFavorited ? 'bg-gray-300' : 'bg-gray-400'} bg-opacity-80 text-white font-bold rounded-lg shadow-lg active:bg-gray-300 transition-all duration-300 transform sm:w-14 sm:h-14 sm:rounded-full sm:px-0 sm:py-0 md:hover:bg-gray-400 md:hover:scale-105`}
                  disabled={isFavoriting}
                >
                  <Heart
                    size={24}
                    className={`transition-all duration-300 ease-out ${
                      isFavorited ? 'fill-red-500 stroke-red-500' : 'fill-transparent stroke-white'
                    }`}
                  />
                  <span className='sm:hidden whitespace-nowrap'>{isFavorited ? '已收藏' : '收藏'}</span>
                </button>
              )}
            </div>
            <div className='flex-grow mb-6'>
              {detail?.desc ? (
                <p className='text-gray-700 dark:text-gray-300 leading-relaxed'>
                  {detail.desc}
                </p>
              ) : (isLoadingApi ? <div className='space-y-2'>
                  <div className='h-4 bg-gray-500 dark:bg-gray-400 rounded animate-pulse'></div>
                  <div className='h-4 bg-gray-500 dark:bg-gray-400 rounded w-5/6 animate-pulse'></div>
                  <div className='h-4 bg-gray-500 dark:bg-gray-400 rounded w-4/6 animate-pulse'></div>
                </div> : null)}
            </div>
          </div>
        </div>
        {/* Celebrities Section */}
        {isLoadingApi && doubanId && (!detail?.celebrities || detail.celebrities.length === 0) ? (
          <div className='mt-8'>
            <div className='h-8 w-48 mb-4 bg-gray-500 dark:bg-gray-400 rounded animate-pulse'></div> {/* Title placeholder */}
            <div className="flex overflow-x-auto space-x-4 pb-4 hide-scrollbar">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="flex-none w-32 sm:w-44 flex flex-col items-center text-center">
                  <div className="relative w-full aspect-[2/3] rounded-lg bg-gray-500 dark:bg-gray-400 animate-pulse mb-2"></div>
                  <div className="h-5 bg-gray-500 dark:bg-gray-400 rounded w-3/4 mb-1 animate-pulse"></div> {/* Changed h-4 to h-5 */}
                  <div className="h-4 bg-gray-500 dark:bg-gray-400 rounded w-1/2 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          detail?.celebrities && detail.celebrities.length > 0 && (
            <CelebritiesSection celebrities={detail.celebrities} />
          )
        )}

        {/* Recommendations Section */}
        {isLoadingApi && doubanId && (!detail?.recommendations || detail.recommendations.length === 0) ? (
          <div className='mt-8'>
            <div className='h-8 w-48 mb-4 bg-gray-500 dark:bg-gray-400 rounded animate-pulse'></div> {/* Title placeholder */}
            <div className="flex overflow-x-auto space-x-4 pb-4 hide-scrollbar">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="flex-none w-32 sm:w-44 flex flex-col items-center text-center">
                  <div className="relative w-full aspect-[2/3] rounded-lg bg-gray-500 dark:bg-gray-400 animate-pulse mb-2"></div>
                  <div className="h-5 bg-gray-500 dark:bg-gray-400 rounded w-3/4 mb-1 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          detail?.recommendations && detail.recommendations.length > 0 && (
            <RecommendationSection recommendations={detail.recommendations} />
          )
        )}
        {/* Confirmation Dialog for Trailer */}
        <ConfirmationDialog
          isOpen={showTrailerConfirmDialog}
          onClose={() => setShowTrailerConfirmDialog(false)}
          onConfirm={handleConfirmTrailer}
          title="提示"
          message="是否转跳到豆瓣观看预告片？"
        />

        {/* No Trailer Dialog */}
        <ConfirmationDialog
          isOpen={showNoTrailerDialog}
          onClose={() => setShowNoTrailerDialog(false)}
          onConfirm={() => setShowNoTrailerDialog(false)} // No action needed, just close
          title="提示"
          message="暂无预告～"
          showCancelButton={false}
        />
      </div>
    </PageLayout>
  );
}

export default function DetailPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const key = JSON.stringify(searchParams);
  return (
    <Suspense>
      <DetailPageClient key={key} />
    </Suspense>
  );
}
