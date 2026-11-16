import { useState, useCallback, useEffect, useRef } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getNewsStats, refreshNews } from '@/api/finance-news';
import type { NewsRefreshStatus } from '@shared/api.interface';

const defaultStatus: NewsRefreshStatus = {
  lastRefreshAt: '',
  isRefreshing: false,
  todayImportantCount: 0,
  todayTotalCount: 0,
};

const POLL_INTERVAL = 60000; // 60 seconds

export function useNewsRefresh() {
  const [status, setStatus] = useState<NewsRefreshStatus>(defaultStatus);
  const [loading, setLoading] = useState(false);
  const [newCount, setNewCount] = useState<number>(0);
  const [lastResultMsg, setLastResultMsg] = useState<string>('');
  const [hasNewUpdate, setHasNewUpdate] = useState<boolean>(false);

  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeenRef = useRef<string>('');

  const clearMsgTimer = () => {
    if (msgTimerRef.current) {
      clearTimeout(msgTimerRef.current);
      msgTimerRef.current = null;
    }
  };

  const showResultMsg = (msg: string) => {
    clearMsgTimer();
    setLastResultMsg(msg);
    msgTimerRef.current = setTimeout(() => {
      setLastResultMsg('');
      msgTimerRef.current = null;
    }, 3000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const data = await getNewsStats();
      const prev = lastSeenRef.current;
      setStatus(data);
      if (prev && data.lastRefreshAt && data.lastRefreshAt !== prev) {
        setHasNewUpdate(true);
      }
      if (data.lastRefreshAt && !prev) {
        lastSeenRef.current = data.lastRefreshAt;
      }
    } catch (e) {
      logger.warn('获取新闻统计失败', e as Error);
    }
  }, []);

  const doRefresh = useCallback(async () => {
    if (loading) return null;
    setLoading(true);
    setStatus((prev) => ({ ...prev, isRefreshing: true }));
    try {
      const data = await refreshNews();
      setNewCount(data.newCount);
      setStatus((prev) => ({
        ...prev,
        isRefreshing: false,
        lastRefreshAt: data.lastRefreshAt,
      }));
      lastSeenRef.current = data.lastRefreshAt;
      setHasNewUpdate(false);
      if (data.newCount > 0) {
        showResultMsg(`更新完成，新增 ${data.newCount} 条`);
      } else {
        showResultMsg('已是最新，暂无新消息');
      }
      // re-fetch stats to sync today counts
      void fetchStats();
      return data;
    } catch (e) {
      logger.warn('刷新新闻失败', e as Error);
      setStatus((prev) => ({ ...prev, isRefreshing: false }));
      showResultMsg('更新失败，请稍后重试');
      throw new Error('refresh failed');
    } finally {
      setLoading(false);
    }
  }, [loading, fetchStats]);

  const acknowledgeUpdate = useCallback(() => {
    setHasNewUpdate(false);
    if (status.lastRefreshAt) {
      lastSeenRef.current = status.lastRefreshAt;
    }
  }, [status.lastRefreshAt]);

  // visibility-aware auto polling
  const autoRefresh = useCallback(() => {
    // initial fetch
    void fetchStats();

    const tick = () => {
      if (document.visibilityState === 'visible') {
        void fetchStats();
      }
    };

    pollTimerRef.current = setInterval(tick, POLL_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // when page becomes visible, fetch immediately
        void fetchStats();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchStats]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      clearMsgTimer();
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  return {
    status,
    setStatus,
    loading,
    newCount,
    lastResultMsg,
    hasNewUpdate,
    acknowledgeUpdate,
    fetchStats,
    refresh: doRefresh,
    autoRefresh,
  };
}
