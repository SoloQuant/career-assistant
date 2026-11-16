import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { jobPush } from '@client/src/api';
import type { JobPushItem, JobPushListResponse } from '@shared/api.interface';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@client/src/components/ui/empty';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import { ProgressRing } from '@client/src/components/ui/progress-ring';
import {
  Building2,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  ThumbsUp,
  XCircle,
} from 'lucide-react';

type JobStatusFilter = 'all' | 'new' | 'viewed' | 'applied' | 'ignored';

function getMatchColor(score: number): string {
  if (score >= 90) return 'hsl(150 70% 45%)';
  if (score >= 75) return 'hsl(190 90% 55%)';
  if (score >= 60) return 'hsl(40 95% 60%)';
  return 'hsl(20 90% 60%)';
}

function formatTimeAgo(dateStr: string): string {
  const now: number = Date.now();
  const then: number = new Date(dateStr).getTime();
  const diffMs: number = now - then;
  const diffHours: number = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return '刚刚';
  if (diffHours < 24) return `${diffHours}小时前`;
  const diffDays: number = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}天前`;
  const diffWeeks: number = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}周前`;
  return dateStr.slice(0, 10);
}

const JobPushPage: React.FC = () => {
  const [items, setItems] = useState<JobPushItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [newCount, setNewCount] = useState<number>(0);
  const [appliedCount, setAppliedCount] = useState<number>(0);
  const [avgMatchScore, setAvgMatchScore] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<JobStatusFilter>('all');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchList = useCallback(async (status: JobStatusFilter) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data: JobPushListResponse = await jobPush.getJobPushList(
        status === 'all' ? undefined : status,
        1,
        50,
      );
      setItems(data.items);
      setTotal(data.total);
      setNewCount(data.newCount);

      // 计算已投递数量和平均匹配度
      const applied: number = data.items.filter((it) => it.isApplied).length;
      setAppliedCount(applied);

      if (data.items.length > 0) {
        const totalScore: number = data.items.reduce(
          (sum: number, it: JobPushItem) => sum + (it.matchScore || 0),
          0,
        );
        setAvgMatchScore(Math.round(totalScore / data.items.length));
      } else {
        setAvgMatchScore(0);
      }
    } catch (error) {
      logger.error('获取岗位推送列表失败', error);
      setErrorMsg('获取岗位推送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList(filter);
  }, [filter, fetchList]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result: { newCount: number } = await jobPush.refreshJobPush();
      setNewCount(result.newCount);
      await fetchList(filter);
    } catch (error) {
      logger.error('刷新岗位推送失败', error);
    } finally {
      setRefreshing(false);
    }
  }, [filter, fetchList]);

  const handleView = useCallback(async (id: string) => {
    try {
      await jobPush.markJobViewed(id);
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, isViewed: true } : it)),
      );
    } catch (error) {
      logger.error('标记已查看失败', error);
    }
  }, []);

  const handleApply = useCallback(async (id: string) => {
    setActionId(id);
    try {
      await jobPush.markJobApplied(id);
      setItems((prev) => {
        const updated = prev.map((it) =>
          it.id === id ? { ...it, isApplied: true, status: 'applied' } : it,
        );
        const applied: number = updated.filter((it) => it.isApplied).length;
        setAppliedCount(applied);
        return updated;
      });
    } catch (error) {
      logger.error('投递失败', error);
    } finally {
      setActionId(null);
    }
  }, []);

  const handleIgnore = useCallback(async (id: string) => {
    setActionId(id);
    try {
      await jobPush.markJobIgnored(id);
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, isIgnored: true, status: 'ignored' } : it,
        ),
      );
    } catch (error) {
      logger.error('忽略失败', error);
    } finally {
      setActionId(null);
    }
  }, []);

  const visibleItems = useMemo(() => items, [items]);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">新岗位推送</h2>
          <p className="text-sm text-muted-foreground mt-1">
            符合你技能和意向的新岗位，按匹配度排序
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          刷新推送
        </Button>
      </div>

      {/* 顶部统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{newCount}</div>
                <div className="text-xs text-muted-foreground">新岗位</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <ThumbsUp className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{appliedCount}</div>
                <div className="text-xs text-muted-foreground">已投递</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Building2 className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{avgMatchScore}</div>
                <div className="text-xs text-muted-foreground">匹配度平均分</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-lg">岗位列表</CardTitle>
            <Tabs
              value={filter}
              onValueChange={(v: string) => setFilter(v as JobStatusFilter)}
            >
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="new">新岗位</TabsTrigger>
                <TabsTrigger value="viewed">已查看</TabsTrigger>
                <TabsTrigger value="applied">已投递</TabsTrigger>
                <TabsTrigger value="ignored">已忽略</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : errorMsg ? (
            <Empty className="min-h-[300px]">
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <XCircle />
                </EmptyMedia>
                <EmptyTitle>加载失败</EmptyTitle>
                <EmptyDescription>{errorMsg}</EmptyDescription>
                <Button onClick={() => fetchList(filter)} className="mt-2">
                  重试
                </Button>
              </EmptyContent>
            </Empty>
          ) : visibleItems.length === 0 ? (
            <Empty className="min-h-[300px]">
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <Building2 />
                </EmptyMedia>
                <EmptyTitle>暂无岗位</EmptyTitle>
                <EmptyDescription>
                  当前筛选条件下没有匹配的岗位，试试其他筛选条件或点击刷新
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-4">
              {visibleItems.map((job: JobPushItem) => (
                <Card
                  key={job.id}
                  className={`overflow-hidden transition-colors ${
                    job.isIgnored ? 'opacity-60' : ''
                  }`}
                  onClick={() => {
                    if (!job.isViewed) {
                      void handleView(job.id);
                    }
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* 左侧：主内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold truncate">
                            {job.jobTitle}
                          </h3>
                          {!job.isViewed && (
                            <Badge
                              variant="default"
                              className="text-[10px] px-1.5 py-0"
                            >
                              新
                            </Badge>
                          )}
                          {job.isApplied && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              已投递
                            </Badge>
                          )}
                          {job.isIgnored && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              已忽略
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3.5" />
                            {job.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {job.city}
                          </span>
                          <span className="font-medium text-primary">
                            {job.salary}
                          </span>
                        </div>

                        {/* 匹配理由标签 */}
                        {job.matchReasons && job.matchReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {job.matchReasons.map((reason: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-[11px] px-2 py-0 bg-primary/5 border-primary/20 text-primary"
                              >
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                          <span className="text-xs text-muted-foreground">
                            发布于 {formatTimeAgo(job.pushedAt)}
                          </span>
                          <div className="flex-1" />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              job.isIgnored ||
                              job.isApplied ||
                              actionId === job.id
                            }
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              void handleIgnore(job.id);
                            }}
                            className="gap-1"
                          >
                            <XCircle className="size-3.5" />
                            忽略
                          </Button>
                          <Button
                            size="sm"
                            disabled={
                              job.isApplied ||
                              job.isIgnored ||
                              actionId === job.id
                            }
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              void handleApply(job.id);
                            }}
                            className="gap-1"
                          >
                            {actionId === job.id && !job.isApplied ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <ThumbsUp className="size-3.5" />
                            )}
                            {job.isApplied ? '已投递' : '一键投递'}
                          </Button>
                        </div>
                      </div>

                      {/* 右侧：匹配度圆环 */}
                      <div className="shrink-0 flex flex-col items-center">
                        <ProgressRing
                          value={job.matchScore || 0}
                          max={100}
                          size={72}
                          strokeWidth={6}
                          color={getMatchColor(job.matchScore || 0)}
                          trackColor="hsl(215 20% 85%)"
                          showValue={false}
                        />
                        <div
                          className="text-xl font-bold mt-1"
                          style={{ color: getMatchColor(job.matchScore || 0) }}
                        >
                          {job.matchScore || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          匹配度
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JobPushPage;
