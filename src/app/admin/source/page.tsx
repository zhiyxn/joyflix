/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion */

'use client';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { GripVertical } from 'lucide-react';
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

// 视频源数据类型
interface DataSource {
  name: string;
  key: string;
  api: string;
  detail?: string;
  disabled?: boolean;
  from: 'config' | 'custom';
}

// 视频源配置组件
const VideoSourceConfig = ({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [newSource, setNewSource] = useState<DataSource>({
    name: '',
    key: '',
    api: '',
    detail: '',
    disabled: false,
    from: 'config',
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'failure' | null>>({});
  const [speeds, setSpeeds] = useState<Record<string, number | null>>({});
  const [testErrorMessages, setTestErrorMessages] = useState<Record<string, string | null>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    if (config?.SourceConfig) {
      setSources(config.SourceConfig);
      setOrderChanged(false);
    }
  }, [config]);

  const callSourceApi = async (body: Record<string, any>) => {
    try {
      const resp = await fetch('/api/admin/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${resp.status}`);
      }

      await refreshConfig();
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败');
      throw err;
    }
  };

  const handleToggleEnable = (key: string) => {
    const target = sources.find((s) => s.key === key);
    if (!target) return;
    const action = target.disabled ? 'enable' : 'disable';
    callSourceApi({ action, key }).catch(() => {
      console.error('操作失败', action, key);
    });
  };

  const handleDelete = (key: string) => {
    callSourceApi({ action: 'delete', key }).catch(() => {
      console.error('操作失败', 'delete', key);
    });
  };

  const handleAddSource = () => {
    if (!newSource.name || !newSource.key || !newSource.api) return;
    callSourceApi({
      action: 'add',
      key: newSource.key,
      name: newSource.name,
      api: newSource.api,
      detail: newSource.detail,
    })
      .then(() => {
        setNewSource({
          name: '',
          key: '',
          api: '',
          detail: '',
          disabled: false,
          from: 'custom',
        });
        setShowAddForm(false);
      })
      .catch(() => {
        console.error('操作失败', 'add', newSource);
      });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sources.findIndex((s) => s.key === active.id);
    const newIndex = sources.findIndex((s) => s.key === over.id);
    setSources((prev) => arrayMove(prev, oldIndex, newIndex));
    setOrderChanged(true);
  };

  const handleSaveOrder = () => {
    const order = sources.map((s) => s.key);
    callSourceApi({ action: 'sort', order })
      .then(() => {
        setOrderChanged(false);
        showSuccess('排序已保存！');
      })
      .catch(() => {
        console.error('操作失败', 'sort', order);
      });
  };

  const testSingleSource = async (source: DataSource) => {
    setTestResults(prev => ({ ...prev, [source.key]: 'testing' }));
    setSpeeds(prev => ({ ...prev, [source.key]: null }));
    setTestErrorMessages(prev => ({ ...prev, [source.key]: null }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const startTime = performance.now();

    try {
      const response = await fetch('/api/admin/test-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: `${source.api}?wd=test` }),
      });

      const result = await response.json();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (!result.success) { // 现在只需检查代理返回的 result.success
        let errorMessage = result.error || `请求失败: ${result.status} ${result.statusText}`;
        setTestResults(prev => ({ ...prev, [source.key]: 'failure' }));
        setTestErrorMessages(prev => ({ ...prev, [source.key]: errorMessage }));
        setSpeeds(prev => ({ ...prev, [source.key]: Infinity }));
      } else {
        setTestResults(prev => ({ ...prev, [source.key]: 'success' }));
        setSpeeds(prev => ({ ...prev, [source.key]: duration }));
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [source.key]: 'failure' }));
      setTestErrorMessages(prev => ({ ...prev, [source.key]: `测试请求失败: ${(error as Error).message}` }));
      setSpeeds(prev => ({ ...prev, [source.key]: Infinity }));
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleTestAllSources = async () => {
    setIsTesting(true);
    setTestResults({});
    setSpeeds({});
    setTestErrorMessages({});
    const enabledSources = sources.filter(s => !s.disabled);
    for (const source of enabledSources) {
      await testSingleSource(source);
      await new Promise(resolve => setTimeout(resolve, 200)); // 在请求之间添加 200 毫秒的延迟
    }
    setIsTesting(false);

    const sortedSources = [...sources].sort((a, b) => {
      const statusA = testResults[a.key];
      const statusB = testResults[b.key];

      // Failures always go to the end
      if (statusA === 'failure' && statusB !== 'failure') {
        return 1; // a is failure, b is not, so a comes after b
      }
      if (statusA !== 'failure' && statusB === 'failure') {
        return -1; // a is not failure, b is, so a comes before b
      }

      // If both are failures or both are not failures, sort by speed
      const speedA = speeds[a.key] ?? Infinity;
      const speedB = speeds[b.key] ?? Infinity;
      return speedA - speedB;
    });
    setSources(sortedSources);
    setOrderChanged(true);

    const order = sortedSources.map((s) => s.key);
    callSourceApi({ action: 'sort', order })
      .then(() => {
        setOrderChanged(false);
        showSuccess('测速完成，已按速度排序并保存！', 'swal2-speed-test-white-bg');
      })
      .catch(() => {
        console.error('操作失败', 'sort', order);
        showError('测速完成，但自动保存排序失败！', 'swal2-speed-test-white-bg');
        setOrderChanged(true);
      });
  };

  const DraggableRow = ({ source, testStatus, testErrorMessage }: { source: DataSource, testStatus: 'testing' | 'success' | 'failure' | null, testErrorMessage: string | null }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: source.key });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    } as React.CSSProperties;

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors select-none'
      >
        <td
          className='px-2 py-4 cursor-grab text-gray-400'
          style={{ touchAction: 'none' }}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
          {source.name}
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
          {source.key}
        </td>
        <td
          className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-[9rem] truncate'
          title={source.api}
        >
          {source.api}
        </td>
        <td
          className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-[8rem] truncate'
          title={source.detail || '-'}
        >
          {source.detail || '-'}
        </td>
        <td className='px-6 py-4 whitespace-nowrap max-w-[1rem]'>
          <span
            className={`px-2 py-1 text-xs rounded-full ${!source.disabled
                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-200'
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
              }`}
          >
            {!source.disabled ? '启用中' : '已禁用'}
          </span>
        </td>
        <td className='px-6 py-4 whitespace-nowrap'>
          <div className="flex justify-center" title={testErrorMessage || ''}>
            {testStatus === 'testing' && <Loader2 size={16} className="animate-spin text-gray-500" />}
            {testStatus === 'success' && <CheckCircle2 size={16} className="text-green-500" />}
            {testStatus === 'failure' && <XCircle size={16} className="text-red-500" />}
            {!testStatus && <span className="text-gray-400">-</span>}
          </div>
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
          <button
            onClick={() => handleToggleEnable(source.key)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${!source.disabled
                ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60'
                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/60'
              } transition-colors`}
          >
            {!source.disabled ? '禁用' : '启用'}
          </button>
          {source.from !== 'config' && (
            <button
              onClick={() => handleDelete(source.key)}
              className='inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 dark:text-gray-200 transition-colors'
            >
              删除
            </button>
          )}
        </td>
      </tr>
    );
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
      <div className='flex items-center justify-between'>
        <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
          视频源列表
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestAllSources}
            disabled={isTesting}
            className='px-3 py-1 bg-blue-400 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors disabled:bg-gray-400'
          >
            {isTesting ? '测试中...' : '批量测试源'}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className='px-3 py-1 bg-blue-400 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors'
          >
            {showAddForm ? '取消' : '添加视频源'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className='p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <input
              type='text'
              placeholder='名称'
              value={newSource.name}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, name: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <input
              type='text'
              placeholder='Key'
              value={newSource.key}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, key: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <input
              type='text'
              placeholder='API 地址'
              value={newSource.api}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, api: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
            <input
              type='text'
              placeholder='Detail 地址（选填）'
              value={newSource.detail}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, detail: e.target.value }))
              }
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
          </div>
          <div className='flex justify-end'>
            <button
              onClick={handleAddSource}
              disabled={!newSource.name || !newSource.key || !newSource.api}
              className='w-full sm:w-auto px-4 py-2 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-400 text-white rounded-lg transition-colors'
            >
              添加
            </button>
          </div>
        </div>
      )}

      <div className='border border-gray-200 dark:border-gray-700 rounded-lg max-h-[42rem] overflow-y-auto overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
          <thead className='bg-gray-50 dark:bg-gray-900'>
            <tr>
              <th className='w-8' />
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                名称
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                Key
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                API 地址
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                Detail 地址
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                状态
              </th>
              <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                连通性
              </th>
              <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                操作
              </th>
            </tr>
          </thead>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            autoScroll={false}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={sources.map((s) => s.key)}
              strategy={verticalListSortingStrategy}
            >
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {sources.map((source) => (
                  <DraggableRow key={source.key} source={source} testStatus={testResults[source.key]} testErrorMessage={testErrorMessages[source.key]} />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      {orderChanged && (
        <div className='flex justify-end'>
          <button
            onClick={handleSaveOrder}
            className='px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
          >
            保存排序
          </button>
        </div>
      )}
    </div>
  );
};

function SourceConfigPageClient() {
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
                接口配置
              </h1>
            </div>
            <div className='bg-white/70 dark:bg-gray-800/50 rounded-2xl shadow-lg backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 p-6'>
                <div className='h-[42rem] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse' />
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
              接口配置
            </h1>
          </div>
          <div className='bg-white/70 dark:bg-gray-800/50 rounded-2xl shadow-lg backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 p-6'>
            <VideoSourceConfig config={config} refreshConfig={fetchConfig} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default function SourceConfigPage() {
  return (
    <Suspense>
      <SourceConfigPageClient />
    </Suspense>
  );
}