import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  RefreshCw,
  CheckCheck,
  Clock,
  CheckCircle2,
  ArrowUpCircle,
  Zap,
  Gavel,
  TrendingUp,
  Building2,
  Briefcase,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';
import { useNewsRefresh } from '@/hooks/useNewsRefresh';
import { getImportantNews, markAsRead, markAllRead } from '@/api/finance-news';
import { ImportantCard, ImportantSkeleton } from './ImportantCard';
import {
  formatShortDateTime,
  formatRelativeTime,
  isJustUpdated,
} from '@/utils/news-time';
import { IMPORTANT_NEWS_CATEGORIES, type FinanceNewsItem } from '@shared/api.interface';

const ImportantNewsPage = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [items, setItems] = useState<FinanceNewsItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [newCount, setNewCount] = useState<number>(0);

  const pageSize = 10;
  const {
    status,
    loading: refreshLoading,
    lastResultMsg,
    hasNewUpdate,
    acknowledgeUpdate,
    refresh,
    autoRefresh,
  } = useNewsRefresh();
  const justUpdated = isJustUpdated(status.lastRefreshAt);
  const listTopRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(
    async (cat: string, unread: boolean, pg: number, isLoadMore = false) => {
      const setLoad = isLoadMore ? setLoadingMore : setLoading;
      if (!isLoadMore) setError(null);
      setLoad(true);
      try {
        const data = await getImportantNews({
          importantCategory: cat === 'all' ? undefined : cat,
          page: pg,
          pageSize,
          unreadOnly: unread || undefined,
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

  useEffect(() => {
    void loadList(activeCategory, unreadOnly, 1);
    const cleanup = autoRefresh();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, unreadOnly, loadList]);

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
      await loadList(activeCategory, unreadOnly, 1);
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

  const handleCategoryChange = (val: string) => {
    setActiveCategory(val);
    setPage(1);
    setHasMore(true);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    void loadList(activeCategory, unreadOnly, page + 1, true);
  };

  const handleMarkAsRead = async (id: string) => {
    if (readIds.has(id)) return;
    setReadIds((prev) => new Set(prev).add(id));
    try {
      await markAsRead(id);
    } catch {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markAllRead();
      const allIds = new Set(items.map((it) => it.id));
      setReadIds((prev) => new Set([...prev, ...allIds]));
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = status.todayImportantCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* top banner / stats */}
      <Card className="bg-gradient-to-r from-card via-card to-primary/5 border-primary/20">
        <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Bell className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                重要消息
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                精选当日最具影响力的财经资讯
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-primary">
                {unreadCount}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                今日重要
              </div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-foreground">
                {status.todayTotalCount}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                今日总数
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll || items.length === 0}
              data-ai-section-type="button"
            >
              <CheckCheck className="size-4" />
              全部标为已读
            </Button>
            <div className="flex items-center gap-2">
              <Switch
                id="unread-only"
                checked={unreadOnly}
                onCheckedChange={setUnreadOnly}
              />
              <label
                htmlFor="unread-only"
                className="text-sm cursor-pointer select-none"
              >
                只看未读
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

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
        {status.todayImportantCount > 0 && (
          <Badge variant="outline" className="text-[11px] bg-red-500/10 text-red-400 border-red-500/30">
            今日重要 {status.todayImportantCount} 条
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
          新增 {newCount} 条消息，点击回到顶部
        </button>
      )}

      {/* category tabs */}
      <div ref={listTopRef} />
      <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
        <TabsList className="flex-wrap h-auto w-full justify-start bg-muted/50 p-1">
          {IMPORTANT_NEWS_CATEGORIES.map((cat) => {
            const iconName = (cat as { icon: string }).icon;
            const IconComp = getCategoryIcon(iconName);
            return (
              <TabsTrigger
                key={cat.key}
                value={cat.key}
                className="px-3 gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary"
              >
                <IconComp className="size-3.5" />
                {cat.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {IMPORTANT_NEWS_CATEGORIES.map((cat) => (
          <TabsContent key={cat.key} value={cat.key} className="mt-4">
            {/* loading skeleton */}
            {loading && (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ImportantSkeleton key={i} />
                ))}
              </div>
            )}

            {/* error */}
            {!loading && error && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {error}
                </CardContent>
              </Card>
            )}

            {/* empty */}
            {!loading && !error && items.length === 0 && (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Bell className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>暂无重要消息</EmptyTitle>
                  <EmptyDescription>
                    {unreadOnly
                      ? '当前分类下没有未读的重要消息，试试关闭「只看未读」'
                      : '当前分类下还没有重要消息，稍后再来看看吧'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {/* list */}
            {!loading && !error && items.length > 0 && (
              <div className="space-y-4">
                {items.map((item) => (
                  <ImportantCard
                    key={item.id}
                    item={item}
                    isRead={readIds.has(item.id)}
                    onRead={handleMarkAsRead}
                  />
                ))}

                {/* load more */}
                <div className="flex justify-center pt-2">
                  {loadingMore ? (
                    <div className="space-y-4 w-full">
                      <ImportantSkeleton />
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
          </TabsContent>
        ))}
      </Tabs>
    </motion.div>
  );
};

// helper to get icon component by name
const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Gavel,
  TrendingUp,
  Building2,
  Briefcase,
  BarChart3,
};

function getCategoryIcon(name: string) {
  return ICON_COMPONENTS[name] ?? Bell;
}

export default ImportantNewsPage;
