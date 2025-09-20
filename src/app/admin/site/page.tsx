/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion */

'use client';

import {
  Check,
  ChevronDown,
} from 'lucide-react';
import { Suspense, useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';

import { AdminConfig, AdminConfigResult } from '@/lib/admin.types';
import PageLayout from '@/components/PageLayout';

// 统一弹窗方法
const MySwal = Swal.mixin({
  customClass: {
    popup:
      'w-full max-w-md transform overflow-hidden rounded-2xl !bg-white p-6 text-left align-middle shadow-xl transition-all backdrop-blur-xl',
    title: 'text-lg font-semibold leading-6 text-neutral-900 dark:text-neutral-100',
    htmlContainer: 'mt-2 text-sm text-neutral-600 dark:text-neutral-300',
    confirmButton:
      'inline-flex justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors',
    cancelButton:
      'inline-flex justify-center rounded-md border border-transparent bg-neutral-100 dark:bg-neutral-600 px-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors',
    actions: 'mt-6 grid grid-cols-2 gap-3',
  },
  buttonsStyling: false,
  background: 'rgba(255, 255, 255, 0.8)',
});

const showError = (message: string, customPopupClass?: string) =>
  MySwal.fire({
    icon: 'error',
    title: '错误',
    text: message,
    customClass: customPopupClass ? { popup: customPopupClass } : undefined,
  });

const showSuccess = (message: string, customPopupClass?: string) =>
  MySwal.fire({
    icon: 'success',
    title: '成功',
    text: message,
    timer: 4000,
    showConfirmButton: false,
    customClass: customPopupClass ? { popup: customPopupClass } : undefined,
  });

// 站点配置类型
interface SiteConfig {
  SiteName: string;
  Announcement: string;
  SearchDownstreamMaxPage: number;
  SiteInterfaceCacheTime: number;
  DoubanProxyType: string;
  DoubanProxy: string;
  DoubanImageProxyType: string;
  DoubanImageProxy: string;
  DisableYellowFilter: boolean;
}

// 站点配置组件
const SiteConfigComponent = ({ config }: { config: AdminConfig | null }) => {
  const [siteSettings, setSiteSettings] = useState<SiteConfig>({
    SiteName: '',
    Announcement: '',
    SearchDownstreamMaxPage: 1,
    SiteInterfaceCacheTime: 7200,
    DoubanProxyType: 'direct',
    DoubanProxy: '',
    DoubanImageProxyType: 'direct',
    DoubanImageProxy: '',
    DisableYellowFilter: false,
  });
  const [saving, setSaving] = useState(false);
  const [isDoubanDropdownOpen, setIsDoubanDropdownOpen] = useState(false);
  const [isDoubanImageProxyDropdownOpen, setIsDoubanImageProxyDropdownOpen] =
    useState(false);

  const doubanDataSourceOptions = [
    { value: 'direct', label: '直连（服务器直接请求豆瓣）' },
    { value: 'cors-proxy-zwei', label: '豆瓣 CDN' },
    {
      value: 'cmliussss-cdn-tencent',
      label: '豆瓣 CDN（腾讯云）',
    },
    { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN（阿里云）' },
    { value: 'custom', label: '自定义代理' },
  ];

  const doubanImageProxyTypeOptions = [
    { value: 'direct', label: '直连（浏览器直接请求豆瓣）' },
    { value: 'server', label: '服务器代理（由服务器代理请求豆瓣）' },
    { value: 'img3', label: '豆瓣精品 CDN（官方）' },
    {
      value: 'cmliussss-cdn-tencent',
      label: '豆瓣 CDN（腾讯云）',
    },
    { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN（阿里云）' },
    { value: 'custom', label: '自定义代理' },
  ];

  const isUpstashStorage =
    typeof window !== 'undefined' &&
    (window as any).RUNTIME_CONFIG?.STORAGE_TYPE === 'upstash';

  useEffect(() => {
    if (config?.SiteConfig) {
      setSiteSettings({
        ...config.SiteConfig,
        DoubanProxyType: config.SiteConfig.DoubanProxyType || 'direct',
        DoubanProxy: config.SiteConfig.DoubanProxy || '',
        DoubanImageProxyType:
          config.SiteConfig.DoubanImageProxyType || 'direct',
        DoubanImageProxy: config.SiteConfig.DoubanImageProxy || '',
        DisableYellowFilter: config.SiteConfig.DisableYellowFilter || false,
      });
    }
  }, [config]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDoubanDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="douban-datasource"]')) {
          setIsDoubanDropdownOpen(false);
        }
      }
    };

    if (isDoubanDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDoubanDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDoubanImageProxyDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="douban-image-proxy"]')) {
          setIsDoubanImageProxyDropdownOpen(false);
        }
      }
    };

    if (isDoubanImageProxyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDoubanImageProxyDropdownOpen]);

  const handleDoubanDataSourceChange = (value: string) => {
    if (!isUpstashStorage) {
      setSiteSettings((prev) => ({
        ...prev,
        DoubanProxyType: value,
      }));
    }
  };

  const handleDoubanImageProxyChange = (value: string) => {
    if (!isUpstashStorage) {
      setSiteSettings((prev) => ({
        ...prev,
        DoubanImageProxyType: value,
      }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const resp = await fetch('/api/admin/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...siteSettings }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `保存失败: ${resp.status}`);
      }

      showSuccess('保存成功, 请刷新页面');
    } catch (err) {
      showError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div className='text-center text-gray-500 dark:text-gray-400'>
        加载中...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 站点名称 */}
      <div>
        <label
          className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${isUpstashStorage ? 'opacity-50' : ''
            }`}
        >
          站点名称
          {isUpstashStorage && (
            <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
              (请通过环境变量修改)
            </span>
          )}
        </label>
        <input
          type='text'
          value={siteSettings.SiteName}
          onChange={(e) =>
            !isUpstashStorage &&
            setSiteSettings((prev) => ({ ...prev, SiteName: e.target.value }))
          }
          disabled={isUpstashStorage}
          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent ${isUpstashStorage
              ? 'opacity-50 cursor-not-allowed'
              : ''
            }`}
        />
      </div>

      {/* 站点公告 */}
      <div>
        <label
          className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${isUpstashStorage ? 'opacity-50' : ''
            }`}
        >
          站点公告
          {isUpstashStorage && (
            <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
              (请通过环境变量修改)
            </span>
          )}
        </label>
        <textarea
          value={siteSettings.Announcement}
          onChange={(e) =>
            !isUpstashStorage &&
            setSiteSettings((prev) => ({
              ...prev,
              Announcement: e.target.value,
            }))
          }
          disabled={isUpstashStorage}
          rows={3}
          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent ${isUpstashStorage
              ? 'opacity-50 cursor-not-allowed'
              : ''
            }`}
        />
      </div>

      {/* 豆瓣数据源设置 */}
      <div className='space-y-3'>
        <div>
          <label
            className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${
              isUpstashStorage ? 'opacity-50' : ''
            }`}
          >
            豆瓣数据代理
            {isUpstashStorage && (
              <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
                (请通过环境变量修改)
              </span>
            )}
          </label>
          <div className='relative' data-dropdown='douban-datasource'>
            <button
              type='button'
              onClick={() => setIsDoubanDropdownOpen(!isDoubanDropdownOpen)}
              disabled={isUpstashStorage}
              className={`w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm hover:border-gray-400 dark:hover:border-gray-500 text-left ${
                isUpstashStorage
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {
                doubanDataSourceOptions.find(
                  (option) => option.value === siteSettings.DoubanProxyType
                )?.label
              }
            </button>

            <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                  isDoubanDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>

            {isDoubanDropdownOpen && !isUpstashStorage && (
              <div className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto'>
                {doubanDataSourceOptions.map((option) => (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => {
                      handleDoubanDataSourceChange(option.value);
                      setIsDoubanDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-sm transition-colors duration-150 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      siteSettings.DoubanProxyType === option.value
                        ? 'bg-blue-50 dark:bg-blue-800/20 text-blue-500 dark:text-blue-300'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <span className='truncate'>{option.label}</span>
                    {siteSettings.DoubanProxyType === option.value && (
                      <Check className='w-4 h-4 text-blue-500 dark:text-blue-300 flex-shrink-0 ml-2' />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
            选择获取豆瓣数据的方式
          </p>
        </div>

        {siteSettings.DoubanProxyType === 'custom' && (
          <div>
            <label
              className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${
                isUpstashStorage ? 'opacity-50' : ''
              }`}
            >
              豆瓣代理地址
            </label>
            <input
              type='text'
              placeholder='例如: https://proxy.example.com/fetch?url='
              value={siteSettings.DoubanProxy}
              onChange={(e) =>
                !isUpstashStorage &&
                setSiteSettings((prev) => ({
                  ...prev,
                  DoubanProxy: e.target.value,
                }))
              }
              disabled={isUpstashStorage}
              className={`w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm hover:border-gray-400 dark:hover:border-gray-500 ${
                isUpstashStorage
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              自定义代理服务器地址
            </p>
          </div>
        )}
      </div>

      {/* 豆瓣图片代理设置 */}
      <div className='space-y-3'>
        <div>
          <label
            className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${
              isUpstashStorage ? 'opacity-50' : ''
            }`}
          >
            豆瓣图片代理
            {isUpstashStorage && (
              <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
                (请通过环境变量修改)
              </span>
            )}
          </label>
          <div className='relative' data-dropdown='douban-image-proxy'>
            <button
              type='button'
              onClick={() =>
                setIsDoubanImageProxyDropdownOpen(
                  !isDoubanImageProxyDropdownOpen
                )
              }
              disabled={isUpstashStorage}
              className={`w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm hover:border-gray-400 dark:hover:border-gray-500 text-left ${
                isUpstashStorage
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {
                doubanImageProxyTypeOptions.find(
                  (option) => option.value === siteSettings.DoubanImageProxyType
                )?.label
              }
            </button>

            <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                  isDoubanImageProxyDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>

            {isDoubanImageProxyDropdownOpen &&
              !isUpstashStorage && (
                <div className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto'>
                  {doubanImageProxyTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => {
                        handleDoubanImageProxyChange(option.value);
                        setIsDoubanImageProxyDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors duration-150 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        siteSettings.DoubanImageProxyType === option.value
                          ? 'bg-blue-50 dark:bg-blue-800/20 text-blue-500 dark:text-blue-300'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <span className='truncate'>{option.label}</span>
                      {siteSettings.DoubanImageProxyType === option.value && (
                        <Check className='w-4 h-4 text-blue-500 dark:text-blue-300 flex-shrink-0 ml-2' />
                      )}
                    </button>
                  ))}
                </div>
              )}
          </div>
          <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
            选择获取豆瓣图片的方式
          </p>
        </div>

        {siteSettings.DoubanImageProxyType === 'custom' && (
          <div>
            <label
              className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${
                isUpstashStorage ? 'opacity-50' : ''
              }`}
            >
              豆瓣图片代理地址
            </label>
            <input
              type='text'
              placeholder='例如: https://proxy.example.com/fetch?url='
              value={siteSettings.DoubanImageProxy}
              onChange={(e) =>
                !isUpstashStorage &&
                setSiteSettings((prev) => ({
                  ...prev,
                  DoubanImageProxy: e.target.value,
                }))
              }
              disabled={isUpstashStorage}
              className={`w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm hover:border-gray-400 dark:hover:border-gray-500 ${
                isUpstashStorage
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              自定义图片代理服务器地址
            </p>
          </div>
        )}
      </div>

      {/* 搜索接口可拉取最大页数 */}
      <div>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
          搜索接口可拉取最大页数
        </label>
        <input
          type='number'
          min={1}
          value={siteSettings.SearchDownstreamMaxPage}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              SearchDownstreamMaxPage: Number(e.target.value),
            }))
          }
          className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent'
        />
      </div>

      {/* 站点接口缓存时间 */}
      <div>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
          站点接口缓存时间（秒）
        </label>
        <input
          type='number'
          min={1}
          value={siteSettings.SiteInterfaceCacheTime}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              SiteInterfaceCacheTime: Number(e.target.value),
            }))
          }
          className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent'
        />
      </div>

      {/* 禁用黄色过滤器 */}
      <div>
        <div className='flex items-center justify-between'>
          <label
            className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${isUpstashStorage ? 'opacity-50' : ''
              }`}
          >
            禁用黄色过滤器
            {isUpstashStorage && (
              <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
                (请通过环境变量修改)
              </span>
            )}
          </label>
          <button
            type='button'
            onClick={() =>
              !isUpstashStorage &&
              setSiteSettings((prev) => ({
                ...prev,
                DisableYellowFilter: !prev.DisableYellowFilter,
              }))
            }
            disabled={isUpstashStorage}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${siteSettings.DisableYellowFilter
                ? 'bg-blue-400'
                : 'bg-gray-200 dark:bg-gray-700'
              } ${isUpstashStorage
                ? 'opacity-50 cursor-not-allowed'
                : ''
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${siteSettings.DisableYellowFilter
                  ? 'translate-x-6'
                  : 'translate-x-1'
                }`}
            />
          </button>
        </div>
        <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
          禁用黄色内容的过滤功能，允许显示所有内容。
        </p>
      </div>

      {/* 操作按钮 */}
      <div className='flex justify-end'>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 ${saving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-400 hover:bg-blue-500'
            } text-white rounded-lg transition-colors`}
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
};

function SiteConfigPageClient() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await fetch(`/api/admin/config`);

      if (!response.ok) {
        const data = (await response.json()) as any;
        throw new Error(`获取配置失败: ${data.error}`);
      }

      const data = (await response.json()) as AdminConfigResult;
      setConfig(data.Config);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取配置失败';
      showError(msg);
      setError(msg);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchConfig(true);
  }, [fetchConfig]);

  if (loading) {
    return (
      <PageLayout>
        <div className='p-4 sm:p-6 sm:mt-8'>
          <div className=''>
            <div className='mb-8'>
              
              <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                站点配置
              </h1>
            </div>
            <div className='bg-white/70 dark:bg-gray-800/50 rounded-2xl shadow-lg backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 p-6'>
              <div className='space-y-6'>
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={index}
                    className='h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse'
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return null;
  }

  return (
    <PageLayout>
      <div className='p-4 sm:p-6 sm:mt-8'>
        <div className=''>
          <div className='mb-8'>
            
            <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
              站点配置
            </h1>
          </div>
          <div className='bg-white/70 dark:bg-gray-800/50 rounded-2xl shadow-lg backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 p-6'>
            <SiteConfigComponent config={config} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default function SiteConfigPage() {
  return (
    <Suspense>
      <SiteConfigPageClient />
    </Suspense>
  );
}