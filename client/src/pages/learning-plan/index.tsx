import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { learningPlan } from '@client/src/api';
import type {
  LearningPlanDetail,
  LearningPlanItem,
} from '@shared/api.interface';
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
import { Checkbox } from '@client/src/components/ui/checkbox';
import { Progress } from '@client/src/components/ui/progress';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flame,
  Info,
  Loader2,
  RefreshCcw,
  Target,
} from 'lucide-react';

type TaskFilter = 'all' | 'pending' | 'completed' | 'delayed';

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待完成',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
};

const TASK_TYPE_LABEL_MAP: Record<string, string> = {
  learning: '学习',
  review: '复习',
  practice: '练习',
  job_search: '求职',
  assessment: '测评',
  project: '项目',
};

function getStatusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'delayed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getTypeIcon(taskType: string): React.ReactNode {
  switch (taskType) {
    case 'review':
      return <Clock className="size-4" />;
    case 'practice':
      return <Flame className="size-4" />;
    case 'assessment':
      return <Target className="size-4" />;
    default:
      return <BookOpen className="size-4" />;
  }
}

function formatDate(dateStr: string): string {
  const d: Date = new Date(dateStr);
  const month: number = d.getMonth() + 1;
  const day: number = d.getDate();
  const weekdays: string[] = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${month}月${day}日 ${weekdays[d.getDay()]}`;
}

function isToday(dateStr: string): boolean {
  const today: Date = new Date();
  const d: Date = new Date(dateStr);
  return (
    today.getFullYear() === d.getFullYear() &&
    today.getMonth() === d.getMonth() &&
    today.getDate() === d.getDate()
  );
}

const LearningPlanPage: React.FC = () => {
  const [plan, setPlan] = useState<LearningPlanDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [replanLoading, setReplanLoading] = useState<boolean>(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data: LearningPlanDetail = await learningPlan.getCurrentPlan();
      setPlan(data);
    } catch (error) {
      logger.error('获取学习计划失败', error);
      setErrorMsg('获取学习计划失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  const handleToggleComplete = useCallback(
    async (item: LearningPlanItem) => {
      const newStatus: string =
        item.status === 'completed' ? 'pending' : 'completed';
      setAdjustingId(item.id);
      try {
        await learningPlan.adjustPlanItem(item.id, {
          itemId: item.id,
          newStatus,
        });
        setPlan((prev) => {
          if (!prev) return prev;
          const updateItem = (it: LearningPlanItem): LearningPlanItem =>
            it.id === item.id
              ? {
                  ...it,
                  status: newStatus,
                  completedAt:
                    newStatus === 'completed' ? new Date().toISOString() : undefined,
                }
              : it;
          const updatedItems: LearningPlanItem[] = prev.items.map(updateItem);
          const updatedToday: LearningPlanItem[] = prev.todayTasks.map(updateItem);
          const completedTasks: number = updatedItems.filter(
            (it) => it.status === 'completed',
          ).length;
          const delayedCount: number = updatedItems.filter(
            (it) => it.status === 'delayed',
          ).length;
          const completedToday: number = updatedToday.filter(
            (it) => it.status === 'completed',
          ).length;
          const progress: number =
            updatedItems.length > 0
              ? Math.round((completedTasks / updatedItems.length) * 100)
              : 0;
          return {
            ...prev,
            items: updatedItems,
            todayTasks: updatedToday,
            completedTasks,
            delayedCount,
            completedToday,
            progress,
          };
        });
      } catch (error) {
        logger.error('更新任务状态失败', error);
      } finally {
        setAdjustingId(null);
      }
    },
    [],
  );

  const handleReplan = useCallback(async () => {
    if (!plan) return;
    setReplanLoading(true);
    setErrorMsg('');
    try {
      const data: LearningPlanDetail = await learningPlan.replanLearningPlan(
        plan.id,
      );
      setPlan(data);
    } catch (error) {
      logger.error('重新规划失败', error);
      setErrorMsg('重新规划失败，请稍后重试');
    } finally {
      setReplanLoading(false);
    }
  }, [plan]);

  const groupedItems = useMemo(() => {
    if (!plan) return [] as Array<{ date: string; items: LearningPlanItem[] }>;
    let source: LearningPlanItem[] = plan.items;
    if (filter === 'pending') {
      source = source.filter((it) => it.status === 'pending');
    } else if (filter === 'completed') {
      source = source.filter((it) => it.status === 'completed');
    } else if (filter === 'delayed') {
      source = source.filter((it) => it.status === 'delayed');
    }
    const groups: Record<string, LearningPlanItem[]> = {};
    for (const item of source) {
      const key: string = item.plannedDate.slice(0, 10);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    const sortedDates: string[] = Object.keys(groups).sort();
    return sortedDates.map((date) => ({
      date,
      items: groups[date].sort(
        (a, b) => a.orderIndex - b.orderIndex || a.priority - b.priority,
      ),
    }));
  }, [plan, filter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">学习计划</h2>
            <p className="text-sm text-muted-foreground mt-1">
              自动调整学习进度，未完成任务智能顺延
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 min-h-[500px] flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (errorMsg && !plan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">学习计划</h2>
            <p className="text-sm text-muted-foreground mt-1">
              自动调整学习进度，未完成任务智能顺延
            </p>
          </div>
        </div>
        <Empty className="min-h-[400px]">
          <EmptyContent>
            <EmptyMedia variant="icon">
              <Info />
            </EmptyMedia>
            <EmptyTitle>加载失败</EmptyTitle>
            <EmptyDescription>{errorMsg}</EmptyDescription>
            <Button onClick={fetchPlan} className="mt-2">
              重新加载
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">学习计划</h2>
            <p className="text-sm text-muted-foreground mt-1">
              自动调整学习进度，未完成任务智能顺延
            </p>
          </div>
        </div>
        <Empty className="min-h-[400px]">
          <EmptyContent>
            <EmptyMedia variant="icon">
              <Target />
            </EmptyMedia>
            <EmptyTitle>暂无学习计划</EmptyTitle>
            <EmptyDescription>
              先创建一个学习计划，开启你的学习之旅吧
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">学习计划</h2>
          <p className="text-sm text-muted-foreground mt-1">
            自动调整学习进度，未完成任务智能顺延
          </p>
        </div>
        <Button
          onClick={handleReplan}
          disabled={replanLoading}
          className="gap-2"
        >
          {replanLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCcw className="size-4" />
          )}
          重新规划
        </Button>
      </div>

      {/* 顶部概览卡片 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-xl">{plan.planName}</CardTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <Target className="size-3" />
                  目标：{plan.targetSkill}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <CalendarClock className="size-3" />
                  {plan.startDate.slice(0, 10)} ~ {plan.endDate.slice(0, 10)}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{plan.progress}%</div>
              <div className="text-sm text-muted-foreground">整体进度</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Progress value={plan.progress} className="h-2" />
          <div className="grid grid-cols-3 gap-4 pt-1">
            <div className="text-center">
              <div className="text-2xl font-semibold">{plan.totalTasks}</div>
              <div className="text-xs text-muted-foreground mt-1">总任务</div>
            </div>
            <div className="text-center border-x border-border">
              <div className="text-2xl font-semibold text-primary">
                {plan.completedTasks}
              </div>
              <div className="text-xs text-muted-foreground mt-1">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-destructive">
                {plan.delayedCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1">已延期</div>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <Info className="size-4 mt-0.5 shrink-0 text-primary" />
            <p>
              系统每日凌晨根据当日打卡情况自动调整学习计划，未完成的任务会智能顺延，
              确保学习节奏保持合理。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 今日任务 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">今日任务</CardTitle>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="size-3" />
              {plan.completedToday}/{plan.todayTasks.length} 已完成
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan.todayTasks.length === 0 ? (
            <Empty className="min-h-[120px] py-8">
              <EmptyContent>
                <EmptyTitle className="text-sm">今日无待办任务</EmptyTitle>
                <EmptyDescription className="text-xs">
                  享受空闲时光，或复习一下之前学过的内容吧
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          ) : (
            plan.todayTasks.map((item: LearningPlanItem) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary/40 transition-colors"
              >
                <Checkbox
                  checked={item.status === 'completed'}
                  onCheckedChange={() => handleToggleComplete(item)}
                  disabled={adjustingId === item.id}
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium text-sm ${
                      item.status === 'completed'
                        ? 'text-muted-foreground line-through'
                        : ''
                    }`}
                  >
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className="gap-1 text-[10px] px-1.5 py-0"
                    >
                      {getTypeIcon(item.taskType)}
                      {TASK_TYPE_LABEL_MAP[item.taskType] || item.taskType}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="gap-1 text-[10px] px-1.5 py-0"
                    >
                      <Clock className="size-3" />
                      {item.durationMinutes} 分钟
                    </Badge>
                    <Badge
                      variant={getStatusBadgeVariant(item.status)}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {STATUS_LABEL_MAP[item.status] || item.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 完整计划时间线 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-lg">完整计划时间线</CardTitle>
            <Tabs
              value={filter}
              onValueChange={(v: string) => setFilter(v as TaskFilter)}
            >
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="pending">待完成</TabsTrigger>
                <TabsTrigger value="completed">已完成</TabsTrigger>
                <TabsTrigger value="delayed">已延期</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {groupedItems.length === 0 ? (
            <Empty className="min-h-[200px]">
              <EmptyContent>
                <EmptyTitle className="text-sm">暂无任务</EmptyTitle>
                <EmptyDescription className="text-xs">
                  当前筛选条件下没有任务
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-6">
                {groupedItems.map((group) => (
                  <div key={group.date} className="relative">
                    <div
                      className={`absolute -left-6 top-0.5 size-3.5 rounded-full border-2 ${
                        isToday(group.date)
                          ? 'border-primary bg-primary'
                          : 'border-border bg-background'
                      }`}
                    />
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`font-semibold text-sm ${
                          isToday(group.date) ? 'text-primary' : ''
                        }`}
                      >
                        {formatDate(group.date)}
                      </span>
                      {isToday(group.date) && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          今天
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {group.items.length} 项任务
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((item: LearningPlanItem) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-lg border bg-card/50 p-3 hover:border-primary/40 transition-colors"
                        >
                          <Checkbox
                            checked={item.status === 'completed'}
                            onCheckedChange={() => handleToggleComplete(item)}
                            disabled={adjustingId === item.id}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-medium text-sm ${
                                item.status === 'completed'
                                  ? 'text-muted-foreground line-through'
                                  : ''
                              }`}
                            >
                              {item.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className="gap-1 text-[10px] px-1.5 py-0"
                              >
                                {getTypeIcon(item.taskType)}
                                {TASK_TYPE_LABEL_MAP[item.taskType] ||
                                  item.taskType}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="gap-1 text-[10px] px-1.5 py-0"
                              >
                                <Clock className="size-3" />
                                {item.durationMinutes} 分钟
                              </Badge>
                              <Badge
                                variant={getStatusBadgeVariant(item.status)}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {STATUS_LABEL_MAP[item.status] || item.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LearningPlanPage;
