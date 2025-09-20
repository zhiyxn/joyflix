'use client';

import { useEffect, useState } from 'react';

interface ErrorInfo {
  id: string;
  message: string;
  timestamp: number;
}

export function GlobalErrorIndicator() {
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  const handleClose = () => {
    setIsVisible(false);
    // 动画结束后再清除错误内容，避免闪烁
    setTimeout(() => {
      setCurrentError(null);
      setIsReplacing(false);
    }, 300);
  };

  useEffect(() => {
    const handleError = (event: CustomEvent) => {
      const { message } = event.detail;
      const newError: ErrorInfo = {
        id: Date.now().toString(),
        message,
        timestamp: Date.now(),
      };

      if (currentError) {
        setCurrentError(newError);
        setIsReplacing(true);
        setTimeout(() => {
          setIsReplacing(false);
        }, 200);
      } else {
        setCurrentError(newError);
      }

      setIsVisible(true);
    };

    window.addEventListener('globalError', handleError as EventListener);

    return () => {
      window.removeEventListener('globalError', handleError as EventListener);
    };
  }, [currentError]);

  useEffect(() => {
    if (isVisible && currentError) {
          const timer = setTimeout(() => {
        handleClose();
      }, 6000); // 6秒后自动关闭

      return () => clearTimeout(timer);
    }
  }, [isVisible, currentError]);

  if (!currentError) {
    return null;
  }

  return (
    <div className='fixed top-4 right-4 z-[2000]'>
      {/* 错误卡片 */}
      <div
        className={`bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-center transition-all duration-300 ${
          isReplacing ? 'scale-105 bg-red-400' : 'scale-100 bg-red-500'
        } ${
          isVisible ? 'animate-fade-in' : 'animate-fade-out'
        }`}
      >
        <span className='text-sm font-medium text-center'>
          {currentError.message}
        </span>
      </div>
    </div>
  );
}

// 全局错误触发函数
export function triggerGlobalError(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('globalError', {
        detail: { message },
      })
    );
  }
}
