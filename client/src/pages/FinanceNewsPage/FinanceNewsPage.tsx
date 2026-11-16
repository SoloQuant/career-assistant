import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Search,
  Newspaper,
  Clock,
  ChevronDown,
  CheckCircle2,
  ArrowUpCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';
import { useNewsRefresh } from '@/hooks/useNewsRefresh';
import { getFinanceNewsList } from '@/api/finance-news';
import { NewsCard, NewsSkeleton, getSourceColor } from './NewsCard';
import {
  formatShortDateTime,
  formatRelativeTime,
  isJustUpdated,
} from '@/utils/news-time';
import { FINANCE_NEWS_SOURCES, type FinanceNewsItem } from '@shared/api.interface';

const sortOptions = [
  { key: 'publishDate_desc', label: '最新发布' },
  { key: 'importance_desc', label: '重要程度' },
];

const FinanceNewsPage = () => {
  const [source, setSource] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('publishDate_desc');
  const [sortOpen, setSortOpen] = useState(false);
  const [items, setItems] = useState<FinanceNewsItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newCount, setNewCount] = useState<number>(0);

  const {
    status,
    loading: refreshLoading,
    lastResultMsg,
    hasNewUpdate,
    acknowledgeUpdate,
    fetchStats,
    refresh,
    autoRefresh,
  } = useNewsRefresh();

  const pageSize = 10;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const listTopRef = useRef<HTMLDivElement>(null);
  const justUpdated = isJustUpdated(status.lastRefreshAt);

  // debounce keyword
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [keyword]);

  // close sort dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadList = useCallback(
    async (
      src: string,
      kw: string,
      sort: string,
      pg: number,
      isLoadMore = false,
    ) => {
      const setLoad = isLoadMore ? setLoadingMore : setLoading;
      if (!isLoadMore) setError(null);
      setLoad(true);
      try {
        const [sortField, sortOrder] = sort.split('_');
        const data = await getFinanceNewsList({
          page: pg,
          pageSize,
          source: src === 'all' ? undefined : src,
          keyword: kw || undefined,
          sortBy: sortField,
          sortOrder: sortOrder || 'desc',
        });
        if (isLoadMore) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setHasMore(data.hasMore);
        setPage(data.page);
      } catch {
        if (!isLoadMore) setError('加载失败，请稍后重试');
      } finally {
        setLoad(false);
      }
    },
    [],
  );

  // initial load + auto refresh stats polling
  useEffect(() => {
    void loadList(source, debouncedKeyword, sortBy, 1);
    const cleanup = autoRefresh();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, debouncedKeyword, sortBy, loadList]);

  const handleSourceChange = (src: string) => {
    setSource(src);
    setPage(1);
    setHasMore(true);
  };

  const handleSortChange = (val: string) => {
    setSortBy(val);
    setSortOpen(false);
    setPage(1);
    setHasMore(true);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    void loadList(source, debouncedKeyword, sortBy, page + 1, true);
  };

  const handleRefresh = async () => {
    try {
      const result = await refresh();
      if (result) {
        setNewCount(result.newCount);
        if (result.newCount > 0) {
          setPage(1);
          setHasMore(true);
        }
      }
      await loadList(source, debouncedKeyword, sortBy, 1);
      // scroll to top
      listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      // refresh hook already handles error message
    }
  };

  const handleNewMsgClick = () => {
    acknowledgeUpdate();
    void handleRefresh();
  };

  const handleScrollTop = () => {
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const currentSortLabel =
    sortOptions.find((o) => o.key === sortBy)?.label ?? '最新发布';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Newspaper className="size-5 text-primary" />
            财经新闻
            {status.todayTotalCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-medium">
                {status.todayTotalCount > 99
                  ? '99+'
                  : status.todayTotalCount}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            实时追踪全球财经动态
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshLoading || loading}
            data-ai-section-type="button"
          >
            <RefreshCw
              className={`size-4 ${
                refreshLoading || status.isRefreshing ? 'animate-spin' : ''
              }`}
            />
            {refreshLoading || status.isRefreshing ? '更新中...' : '刷新'}
          </Button>
        </div>
      </div>

      {/* last update bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              justUpdated ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'
            }`}
          />
          <Clock className="size-3.5" />
          <span>
            最后更新：
            {status.lastRefreshAt
              ? `${formatShortDateTime(status.lastRefreshAt)}（北京时间）`
              : '--'}
          </span>
          {status.lastRefreshAt && (
            <span className="text-primary/80">
              · {formatRelativeTime(status.lastRefreshAt)}
            </span>
          )}
          {lastResultMsg && (
            <span className="inline-flex items-center gap-1 text-primary ml-2">
              <CheckCircle2 className="size-3.5" />
              {lastResultMsg}
            </span>
          )}
        </div>
        {status.todayTotalCount > 0 && (
          <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/30">
            今日 {status.todayTotalCount} 条
          </Badge>
        )}
      </div>

      {/* new update notice */}
      {hasNewUpdate && (
        <button
          onClick={handleNewMsgClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/30 rounded-lg text-sm text-primary font-medium hover:from-primary/25 hover:to-primary/25 transition-all cursor-pointer"
        >
          <RefreshCw className="size-4" />
          有新消息，点击刷新
        </button>
      )}

      {/* new count tip after manual refresh */}
      {!hasNewUpdate && newCount > 0 && (
        <button
          onClick={handleScrollTop}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-400 font-medium cursor-pointer hover:bg-emerald-500/15 transition-all"
        >
          <ArrowUpCircle className="size-4" />
          新增 {newCount} 条新闻，点击回到顶部
        </button>
      )}

      {/* source tabs - horizontal scroll */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {FINANCE_NEWS_SOURCES.map((src) => {
            const isActive = source === src.key;
            const isHighlight =
              (src as { highlight?: boolean }).highlight === true;
            const color =
              src.key === 'all'
                ? { bg: 'bg-primary', text: 'text-primary-foreground', border: 'border-primary' }
                : getSourceColor(src.key);
            return (
              <button
                key={src.key}
                onClick={() => handleSourceChange(src.key)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? `${color.bg} ${color.text} border-transparent shadow-sm`
                    : 'bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'
                } ${
                  isHighlight && !isActive
                    ? 'border-red-500/60 hover:border-red-400'
                    : ''
                }`}
              >
                {isHighlight && (
                  <span className="text-[10px] bg-red-500 text-white px-1 py-px rounded-sm font-bold">
                    精选
                  </span>
                )}
                {src.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* search + sort bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="搜索新闻关键词..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative" ref={sortRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOpen((prev) => !prev)}
            className="gap-1"
            data-ai-section-type="button"
          >
            {currentSortLabel}
            <ChevronDown
              className={`size-4 transition-transform ${
                sortOpen ? 'rotate-180' : ''
              }`}
            />
          </Button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 min-w-[120px] bg-card border border-border rounded-md shadow-lg z-20 overflow-hidden">
              {sortOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleSortChange(opt.key)}
                  className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors ${
                    sortBy === opt.key
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50 text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* list */}
      <div ref={listTopRef} />

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <NewsSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Newspaper className="size-6" />
            </EmptyMedia>
            <EmptyTitle>暂无新闻</EmptyTitle>
            <EmptyDescription>
              当前条件下没有找到相关新闻，试试更换来源或搜索关键词
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}

          {/* load more */}
          <div className="flex justify-center pt-2">
            {loadingMore ? (
              <div className="space-y-4 w-full">
                <NewsSkeleton />
              </div>
            ) : hasMore ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                data-ai-section-type="button"
              >
                加载更多
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground py-2">
                没有更多了
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default FinanceNewsPage;
