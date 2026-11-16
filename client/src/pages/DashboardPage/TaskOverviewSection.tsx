import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Layers,
  ListChecks,
  Gauge,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { taskGroup } from '@/api';
import type { TaskOverviewStats, TaskGroupSummary } from '@shared/api.interface';

interface MiniStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  progress?: number;
  gradientFrom: string;
  gradientTo: string;
  delay?: number;
}

const MiniStatCard = ({
  title,
  value,
  icon,
  subtitle,
  progress,
  gradientFrom,
  gradientTo,
  delay = 0,
}: MiniStatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Card className="group relative overflow-hidden border-border/60 bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground/80">{subtitle}</p>
            )}
            {progress !== undefined && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
                  }}
                />
              </div>
            )}
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-md"
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
              boxShadow: `0 4px 14px ${gradientFrom}40`,
            }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: `radial-gradient(circle, ${gradientFrom}, transparent 70%)` }}
      />
    </Card>
  </motion.div>
);

const TaskOverviewSection: React.FC = () => {
  const [taskStats, setTaskStats] = useState<TaskOverviewStats | null>(null);
  const [topGroups, setTopGroups] = useState<TaskGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTaskData = async (): Promise<void> => {
      setLoading(true);
      try {
        const [overview, groups] = await Promise.all([
          taskGroup.getOverviewStats(),
          taskGroup.listGroups(),
        ]);
        setTaskStats(overview);
        setTopGroups(groups.slice(0, 5));
      } catch (error) {
        logger.error('加载任务概览数据失败', error as Error);
      } finally {
        setLoading(false);
      }
    };
    void fetchTaskData();
  }, []);

  // ---- 总任务进度水平条形图 ----
  const barOption: EChartsOption = {
    animation: true,
    animationDuration: 1000,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        return list
          .map((p) => `${p.name}<br/>完成进度: <b>${p.value}%</b>`)
          .join('<br/>');
      },
    },
    grid: { left: 90, right: 40, top: 10, bottom: 20, containLabel: true },
    xAxis: {
      type: 'value' as const,
      max: 100,
      axisLabel: {
        formatter: '{value}%',
        color: '#64748b',
        fontSize: 10,
      },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.15)' } },
    },
    yAxis: {
      type: 'category' as const,
      data: topGroups.map((g: TaskGroupSummary) => g.title),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        formatter: (value: string) =>
          value.length > 10 ? `${value.slice(0, 10)}…` : value,
      },
    },
    series: [
      {
        type: 'bar' as const,
        data: topGroups.map((g: TaskGroupSummary) => g.progress),
        barWidth: 14,
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#a78bfa' },
              { offset: 1, color: '#22d3ee' },
            ],
          },
        },
        label: {
          show: true,
          position: 'right' as const,
          formatter: (params) => `${params.value}%`,
          fontSize: 10,
        },
      },
    ],
  };

  const totalGroups = taskStats?.totalGroups ?? 0;
  const activeGroups = taskStats?.activeGroups ?? 0;
  const completedGroups = taskStats?.completedGroups ?? 0;
  const totalSubTasks = taskStats?.totalSubTasks ?? 0;
  const completedSubTasks = taskStats?.completedSubTasks ?? 0;
  const overallProgress = taskStats?.overallProgress ?? 0;

  // 简单任务统计（保留原有统计维度）
  const simpleTotal = taskStats ? Math.max(totalSubTasks - totalGroups, 0) : 0;
  const simpleCompleted = taskStats
    ? Math.max(completedSubTasks - completedGroups, 0)
    : 0;
  const simpleRate =
    simpleTotal > 0 ? Math.round((simpleCompleted / simpleTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">任务拆解概览</h3>
        <span className="text-xs text-muted-foreground">
          层级任务与简单任务总览
        </span>
      </div>

      {/* 4 Stat Cards */}
      <div
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        data-ai-section-type="card-stat"
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i: number) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-7 w-14" />
                <Skeleton className="mt-2 h-3 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <MiniStatCard
              title="总任务数"
              value={totalGroups}
              icon={<Layers className="h-4 w-4" />}
              subtitle={`进行中 ${activeGroups} / 已完成 ${completedGroups}`}
              gradientFrom="#22d3ee"
              gradientTo="#0ea5e9"
              delay={0}
            />
            <MiniStatCard
              title="子任务总数"
              value={totalSubTasks}
              icon={<ListChecks className="h-4 w-4" />}
              subtitle={`已完成 ${completedSubTasks}`}
              gradientFrom="#a78bfa"
              gradientTo="#7c3aed"
              delay={0.05}
            />
            <MiniStatCard
              title="整体完成度"
              value={`${overallProgress}%`}
              icon={<Gauge className="h-4 w-4" />}
              progress={overallProgress}
              subtitle="全部任务综合进度"
              gradientFrom="#10b981"
              gradientTo="#059669"
              delay={0.1}
            />
            <MiniStatCard
              title="简单任务"
              value={`${simpleRate}%`}
              icon={<CheckCircle2 className="h-4 w-4" />}
              subtitle={`${simpleCompleted} / ${simpleTotal} 已完成`}
              gradientFrom="#fb923c"
              gradientTo="#ea580c"
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* 总任务进度条形图 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-border/60 bg-card/80 backdrop-blur transition-all duration-300 hover:border-border hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              总任务进度
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              前 5 个总任务的完成进度
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : topGroups.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                暂无层级任务数据
              </div>
            ) : (
              <ReactECharts
                option={barOption}
                style={{ height: 300, width: '100%' }}
                notMerge
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default TaskOverviewSection;
