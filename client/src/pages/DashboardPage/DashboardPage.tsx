import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import {
  Zap,
  Target,
  Send,
  Clock,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  Circle,
  Flame,
  Briefcase,
  MapPin,
  DollarSign,
  Newspaper,
  ChevronRight,
  Calendar,
  Award,
  ArrowRight,
  Trophy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import * as competitionApi from '@/api/competition';
import type { DashboardRemindersResponse } from '@/api/competition';
import TaskOverviewSection from './TaskOverviewSection';
import {
  getOverviewStats,
  getRadarData,
  getSkillDistribution,
  getGrowthData,
  getJobMatchData,
} from '@/api/stats';
import type {
  OverviewStats,
  SkillDistributionItem,
  JobMatchItem,
} from '@/api/stats';
import type {
  RadarChartData,
  SkillGrowthDataPoint,
  CompetitionReminderItem,
} from '@shared/api.interface';
import { APPLICATION_STATUS_LABELS } from '@shared/api.interface';
import PersonalizedRecommendation from '@/components/PersonalizedRecommendation';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  gradientFrom: string;
  gradientTo: string;
  delay?: number;
}

const StatCard = ({
  title,
  value,
  icon,
  trend,
  trendUp = true,
  gradientFrom,
  gradientTo,
  delay = 0,
}: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Card className="group relative overflow-hidden border-border/60 bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-3xl font-bold font-mono text-foreground tracking-tight">
              {value}
            </p>
            {trend && (
              <p
                className={`flex items-center gap-1 text-xs font-medium ${
                  trendUp ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {trendUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend}
                <span className="text-muted-foreground/70 ml-1">较上周</span>
              </p>
            )}
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
              boxShadow: `0 4px 14px ${gradientFrom}40`,
            }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-20" style={{ background: `radial-gradient(circle, ${gradientFrom}, transparent 70%)` }} />
    </Card>
  </motion.div>
);

const ChartCard = ({
  title,
  subtitle,
  loading,
  children,
  colSpan = 1,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  loading: boolean;
  children: React.ReactNode;
  colSpan?: 1 | 2;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className={colSpan === 2 ? 'lg:col-span-2' : ''}
  >
    <Card className="h-full border-border/60 bg-card/80 backdrop-blur transition-all duration-300 hover:border-border hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">
          {title}
        </CardTitle>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? <Skeleton className="h-[300px] w-full" /> : children}
      </CardContent>
    </Card>
  </motion.div>
);

const APPLICATION_STATUS_ORDER: Array<
  keyof typeof APPLICATION_STATUS_LABELS
> = ['submitted', 'written_test', 'interview', 'offer', 'rejection'];

// ---- Mock data for dashboard overview ----
interface MockTodoItem {
  id: string;
  title: string;
  groupTitle: string;
  priority: 'high' | 'medium' | 'low';
  dueTime: string;
  completed: boolean;
}

interface MockJobItem {
  id: string;
  title: string;
  company: string;
  city: string;
  salary: string;
  matchScore: number;
  tags: string[];
}

interface MockNewsItem {
  id: string;
  title: string;
  source: string;
  publishTime: string;
}

const MOCK_TODOS: MockTodoItem[] = [
  {
    id: 'todo-1',
    title: '完成 Spark SQL 进阶练习题',
    groupTitle: '大数据技能提升计划',
    priority: 'high',
    dueTime: '今天 18:00',
    completed: false,
  },
  {
    id: 'todo-2',
    title: '复习 Hadoop MapReduce 核心原理',
    groupTitle: '大数据基础巩固',
    priority: 'medium',
    dueTime: '今天 21:00',
    completed: false,
  },
  {
    id: 'todo-3',
    title: '投递字节跳动大数据开发岗',
    groupTitle: '秋招冲刺计划',
    priority: 'high',
    dueTime: '今天 23:59',
    completed: false,
  },
];

const MOCK_JOBS: MockJobItem[] = [
  {
    id: 'job-1',
    title: '大数据开发岗',
    company: '字节跳动',
    city: '北京',
    salary: '25-40K·15薪',
    matchScore: 92,
    tags: ['Spark', 'Hadoop', 'Flink'],
  },
  {
    id: 'job-2',
    title: '数据分析师',
    company: '美团',
    city: '北京',
    salary: '20-35K·14薪',
    matchScore: 88,
    tags: ['SQL', 'Python', 'Tableau'],
  },
  {
    id: 'job-3',
    title: '算法工程师',
    company: '阿里巴巴',
    city: '杭州',
    salary: '30-50K·16薪',
    matchScore: 85,
    tags: ['机器学习', 'Python', 'TensorFlow'],
  },
];

const MOCK_NEWS: MockNewsItem[] = [
  {
    id: 'news-1',
    title: '2026届秋招大数据岗位需求同比增长35%，AI+数据人才最抢手',
    source: '新浪科技',
    publishTime: '2小时前',
  },
  {
    id: 'news-2',
    title: '工信部发布数据要素市场化新政，相关岗位迎来利好',
    source: '中新网财经',
    publishTime: '5小时前',
  },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [radarData, setRadarData] = useState<RadarChartData[]>([]);
  const [distribution, setDistribution] = useState<SkillDistributionItem[]>(
    [],
  );
  const [growth, setGrowth] = useState<SkillGrowthDataPoint[]>([]);
  const [jobMatch, setJobMatch] = useState<JobMatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Overview state (mock) ----
  const [todos, setTodos] = useState<MockTodoItem[]>(MOCK_TODOS);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const currentStreak = 7;

  const toggleTodo = (id: string): void => {
    setTodos((prev: MockTodoItem[]) =>
      prev.map((t: MockTodoItem) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      ),
    );
  };

  const handleCheckin = (): void => {
    setCheckedInToday(true);
    navigate('/checkin');
  };

  // ---- Today's date ----
  const today = new Date();
  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 星期${weekdayLabels[today.getDay()]}`;

  // ---- Top 3 skills for progress overview ----
  const topSkills = [...distribution]
    .sort(
      (a: SkillDistributionItem, b: SkillDistributionItem) =>
        b.masteryLevel - a.masteryLevel,
    )
    .slice(0, 3);

  useEffect(() => {
    const fetchAll = async (): Promise<void> => {
      setLoading(true);
      try {
        const [
          overviewRes,
          radarRes,
          distRes,
          growthRes,
          jobRes,
        ] = await Promise.all([
          getOverviewStats(),
          getRadarData(),
          getSkillDistribution(),
          getGrowthData(),
          getJobMatchData(),
        ]);
        setOverview(overviewRes);
        setRadarData(radarRes);
        setDistribution(distRes);
        setGrowth(growthRes);
        setJobMatch(jobRes);
      } catch (err) {
        // API not fully implemented – graceful fallback
      } finally {
        setLoading(false);
      }
    };
    void fetchAll();
  }, []);

  // ---- Radar chart option (dark theme, cyan fill) ----
  const radarOption = {
    animation: true,
    animationDuration: 1200,
    animationEasing: 'cubicOut' as const,
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    radar: {
      indicator: radarData.map((item: RadarChartData) => ({
        name: item.category,
        max: 100,
      })),
      shape: 'polygon' as const,
      splitNumber: 4,
      center: ['50%', '52%'],
      radius: '65%',
      axisName: {
        color: '#94a3b8',
        fontSize: 11,
      },
      splitLine: {
        lineStyle: { color: 'rgba(100, 116, 139, 0.25)', type: 'dashed' as const },
      },
      splitArea: {
        show: false,
      },
      axisLine: {
        lineStyle: { color: 'rgba(100, 116, 139, 0.3)' },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: radarData.map((item: RadarChartData) => item.value),
            name: '掌握度',
            symbol: 'circle' as const,
            symbolSize: 5,
            areaStyle: {
              color: {
                type: 'radial' as const,
                x: 0.5,
                y: 0.5,
                r: 0.5,
                colorStops: [
                  { offset: 0, color: 'rgba(34, 211, 238, 0.05)' },
                  { offset: 1, color: 'rgba(34, 211, 238, 0.25)' },
                ],
              },
            },
            lineStyle: { color: '#22d3ee', width: 2 },
            itemStyle: {
              color: '#ffffff',
              borderColor: '#22d3ee',
              borderWidth: 2,
            },
          },
        ],
      },
    ],
  };

  // ---- Bar chart option (skill mastery ranking, dark theme) ----
  const sortedDist = [...distribution].sort(
    (a: SkillDistributionItem, b: SkillDistributionItem) =>
      b.masteryLevel - a.masteryLevel,
  );

  const barOption = {
    animation: true,
    animationDuration: 1000,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: { name: string; value: number }[]) =>
        `${params[0].name}<br/>掌握度: <b>${params[0].value}%</b>`,
    },
    grid: { left: 80, right: 30, top: 10, bottom: 20 },
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
      data: sortedDist.map((d: SkillDistributionItem) => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: sortedDist.map((d: SkillDistributionItem) => d.masteryLevel),
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
              { offset: 0, color: '#0ea5e9' },
              { offset: 1, color: '#22d3ee' },
            ],
          },
        },
        label: {
          show: true,
          position: 'right' as const,
          formatter: '{c}%',
          fontSize: 10,
          color: '#94a3b8',
        },
      },
    ],
  };

  // ---- Line chart option (skill growth, dark theme) ----
  const lineOption = {
    animation: true,
    animationDuration: 1500,
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: { name: string; value: number }[]) =>
        `${params[0].name}<br/>综合掌握度: <b>${params[0].value}%</b>`,
    },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category' as const,
      boundaryGap: false,
      data: growth.map((g: SkillGrowthDataPoint) => g.date),
      axisLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.3)' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      max: 100,
      axisLabel: { formatter: '{value}%', color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.15)' } },
    },
    series: [
      {
        name: '综合掌握度',
        type: 'line' as const,
        smooth: true,
        symbol: 'circle' as const,
        symbolSize: 6,
        data: growth.map((g: SkillGrowthDataPoint) => g.totalMastery),
        lineStyle: { color: '#22d3ee', width: 2.5 },
        itemStyle: {
          color: '#ffffff',
          borderColor: '#22d3ee',
          borderWidth: 2,
        },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34, 211, 238, 0.35)' },
              { offset: 1, color: 'rgba(34, 211, 238, 0.02)' },
            ],
          },
        },
      },
    ],
  };

  // ---- Application status pie/donut chart ----
  const appStats = overview?.applicationStats;
  const totalApplications = overview?.totalApplications ?? 0;

  const PIE_COLORS = [
    { from: '#22d3ee', to: '#0ea5e9' },
    { from: '#a78bfa', to: '#7c3aed' },
    { from: '#4ade80', to: '#16a34a' },
    { from: '#fb923c', to: '#ea580c' },
    { from: '#f87171', to: '#dc2626' },
  ];

  const pieData = appStats
    ? APPLICATION_STATUS_ORDER.map((status, idx) => {
        const statsMap: Record<string, number> = {
          submitted: appStats.submitted,
          written_test: appStats.writtenTest,
          interview: appStats.interview,
          offer: appStats.offer,
          rejection: appStats.rejection,
        };
        return {
        value: statsMap[status] ?? 0,
        name: APPLICATION_STATUS_LABELS[status] || status,
        itemStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [
              { offset: 0, color: PIE_COLORS[idx].from },
              { offset: 1, color: PIE_COLORS[idx].to },
            ],
          },
         },
       };
      })
    : [];

  const pieOption = {
    animation: true,
    animationDuration: 1200,
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 11, color: '#94a3b8' },
      itemGap: 12,
    },
    series: [
      {
        name: '投递状态',
        type: 'pie' as const,
        radius: ['50%', '72%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: 'hsl(222 47% 11%)',
          borderWidth: 3,
        },
        label: {
          show: true,
          position: 'center' as const,
          formatter: () =>
            totalApplications > 0
              ? `{total|${totalApplications}}\n{label|投递总数}`
              : '',
          rich: {
            total: {
              fontSize: 28,
              fontWeight: 'bold' as const,
              color: '#f1f5f9',
              fontFamily: 'monospace',
            },
            label: {
              fontSize: 12,
              color: '#64748b',
              padding: [6, 0, 0, 0],
            },
          },
        },
        labelLine: { show: false },
        data: pieData,
      },
    ],
  };

  // ---- Job funnel (horizontal progress bars) ----
  const funnelData = APPLICATION_STATUS_ORDER.map((status) => {
    const item = jobMatch.find((j: JobMatchItem) => j.status === status);
    return {
      status,
      label: APPLICATION_STATUS_LABELS[status] || status,
      count: item?.count ?? 0,
    };
  });
  const maxCount = Math.max(...funnelData.map((d) => d.count), 1);
  const funnelColors = ['#22d3ee', '#a78bfa', '#ec4899', '#4ade80', '#f87171'];

  const avgMastery = overview?.taskCompletionRate ?? 0;
  const pendingTasks = overview?.taskStats?.pending ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ====== Dashboard Overview ====== */}

      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-purple-500/10 p-6 shadow-sm"
      >
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">
                求职冲刺阶段
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              <span className="bg-gradient-to-r from-primary via-cyan-400 to-purple-500 bg-clip-text text-transparent">
                你好，求职者 👋
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {dateStr}
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                当前阶段：秋招攻坚期 · 已投递 {overview?.totalApplications ?? 0} 家
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1 px-3 py-1 text-xs">
              <Award className="h-3 w-3" />
              连续学习 {currentStreak} 天
            </Badge>
            <Button onClick={() => navigate('/jobs')} className="gap-1">
              查看岗位 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Row: Today's Todos (2/3) + Check-in (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today's Todos */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="lg:col-span-2"
        >
          <Card className="h-full border-border/60 bg-card/80 backdrop-blur transition-all duration-300 hover:border-border/80 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  今日待办
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {todos.filter((t: MockTodoItem) => t.completed).length} /{' '}
                  {todos.length} 项已完成
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => navigate('/tasks')}
              >
                查看全部 <ChevronRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {todos.map((todo: MockTodoItem) => (
                  <button
                    key={todo.id}
                    onClick={() => toggleTodo(todo.id)}
                    className="flex w-full items-start gap-3 rounded-lg border border-transparent p-3 text-left transition-all duration-200 hover:border-border/60 hover:bg-muted/40"
                  >
                    <div className="mt-0.5 shrink-0">
                      {todo.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/60" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-medium ${
                          todo.completed
                            ? 'text-muted-foreground/60 line-through'
                            : 'text-foreground'
                        }`}
                      >
                        {todo.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{todo.groupTitle}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {todo.dueTime}
                        </span>
                        <Badge
                          variant={
                            todo.priority === 'high'
                              ? 'destructive'
                              : todo.priority === 'medium'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-[10px]"
                        >
                          {todo.priority === 'high'
                            ? '高优先级'
                            : todo.priority === 'medium'
                              ? '中优先级'
                              : '低优先级'}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Check-in Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="h-full border-border/60 bg-gradient-to-br from-orange-500/10 via-card/80 to-red-500/10 backdrop-blur transition-all duration-300 hover:border-border/80 hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Flame className="h-5 w-5 text-orange-500" />
                学习打卡
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                坚持每天学习，见证成长
              </p>
            </CardHeader>
            <CardContent className="flex flex-col justify-between pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-end gap-4 pt-1">
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-500">
                      {currentStreak}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      连续打卡天数
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <span className="text-sm text-foreground">今日状态</span>
                  <Badge
                    variant={checkedInToday ? 'default' : 'outline'}
                    className="gap-1"
                  >
                    {checkedInToday ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> 已打卡
                      </>
                    ) : (
                      '未打卡'
                    )}
                  </Badge>
                </div>
              </div>
              <Button
                className="mt-4 w-full gap-1"
                variant={checkedInToday ? 'secondary' : 'default'}
                onClick={handleCheckin}
              >
                {checkedInToday ? (
                  '查看打卡记录'
                ) : (
                  <>
                    立即打卡 <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row: Skill Progress (full width) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card className="border-border/60 bg-card/80 backdrop-blur transition-all duration-300 hover:border-border/80 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                技能进度概览
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                核心技能掌握度 TOP 3
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => navigate('/skills')}
            >
              查看全部 <ChevronRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {topSkills.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {topSkills.map((skill: SkillDistributionItem) => (
                  <div
                    key={skill.name}
                    className="space-y-2 rounded-lg border border-border/40 bg-background/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {skill.name}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {skill.masteryLevel}%
                      </span>
                    </div>
                    <Progress value={skill.masteryLevel} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {skill.category}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {['Python', 'Spark', 'SQL'].map((name: string) => (
                  <div
                    key={name}
                    className="space-y-2 rounded-lg border border-border/40 bg-background/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {name}
                      </span>
                      <span className="text-sm font-bold text-muted-foreground">
                        --
                      </span>
                    </div>
                    <Skeleton className="h-2 w-full" />
                    <p className="text-xs text-muted-foreground">加载中...</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Row: Recommended Jobs (2/3) + Important News (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recommended Jobs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="h-full border-border/60 bg-card/80 backdrop-blur transition-all duration-300 hover:border-border/80 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Briefcase className="h-5 w-5 text-primary" />
                  推荐岗位
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  基于你的技能画像精选
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => navigate('/jobs')}
              >
                查看全部 <ChevronRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 md:grid-cols-3">
                {MOCK_JOBS.map((job: MockJobItem) => (
                  <div
                    key={job.id}
                    className="group cursor-pointer rounded-xl border border-border/50 bg-background/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                        {job.title}
                      </h3>
                      <Badge variant="secondary" className="text-[10px]">
                        {job.matchScore}%
                      </Badge>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      {job.company}
                    </p>
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.city}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-emerald-500">
                        <DollarSign className="h-3 w-3" />
                        {job.salary}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {job.tags.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Important News */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card className="h-full border-border/60 bg-card/80 backdrop-blur transition-all duration-300 hover:border-border/80 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Newspaper className="h-5 w-5 text-primary" />
                  重要新闻
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  行业动态一手掌握
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => navigate('/news')}
              >
                查看全部 <ChevronRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {MOCK_NEWS.map((news: MockNewsItem) => (
                  <div
                    key={news.id}
                    className="group cursor-pointer space-y-1 rounded-lg p-2 transition-colors hover:bg-muted/50"
                    onClick={() => navigate('/news')}
                  >
                    <h4 className="line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      {news.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{news.source}</span>
                      <span>·</span>
                      <span>{news.publishTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ====== Existing Dashboard Content ====== */}

      {/* Page Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            数据看板
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            技能成长、任务进度与求职概况的全面概览
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        data-ai-section-type="card-stat"
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-3 h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="总技能数"
              value={overview?.totalSkills ?? 0}
              icon={<Zap className="h-5 w-5" />}
              trend="+12%"
              trendUp
              gradientFrom="#22d3ee"
              gradientTo="#0ea5e9"
              delay={0.05}
            />
            <StatCard
              title="平均掌握度"
              value={`${avgMastery}%`}
              icon={<Target className="h-5 w-5" />}
              trend="+5.3%"
              trendUp
              gradientFrom="#a78bfa"
              gradientTo="#7c3aed"
              delay={0.1}
            />
            <StatCard
              title="待办任务"
              value={pendingTasks}
              icon={<Clock className="h-5 w-5" />}
              trend="-8%"
              trendUp={false}
              gradientFrom="#fb923c"
              gradientTo="#ea580c"
              delay={0.15}
            />
            <StatCard
              title="已投递岗位"
              value={overview?.totalApplications ?? 0}
              icon={<Send className="h-5 w-5" />}
              trend="+23%"
              trendUp
              gradientFrom="#4ade80"
              gradientTo="#16a34a"
              delay={0.2}
            />
          </>
        )}
      </div>

      {/* Competition Countdown Card */}
      <CompetitionCountdownCard />

      {/* Task Overview Section */}
      <TaskOverviewSection />

      {/* Row 1: Radar + Pie */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="技能雷达图"
          subtitle="各维度技能掌握度分布"
          loading={loading}
          delay={0.25}
        >
          <ReactECharts
            option={radarOption}
            style={{ height: 300, width: '100%' }}
            notMerge
          />
        </ChartCard>

        <ChartCard
          title="投递状态分布"
          subtitle="各阶段岗位数量统计"
          loading={loading}
          delay={0.3}
        >
          <ReactECharts
            option={pieOption}
            style={{ height: 300, width: '100%' }}
            notMerge
          />
        </ChartCard>
      </div>

      {/* Row 2: Growth area chart (full width) */}
      <ChartCard
        title="技能增长曲线"
        subtitle="综合掌握度随时间变化趋势"
        loading={loading}
        colSpan={2}
        delay={0.35}
      >
        <ReactECharts
          option={lineOption}
          style={{ height: 320, width: '100%' }}
          notMerge
        />
      </ChartCard>

      {/* Row 3: Skill mastery ranking bar */}
      <ChartCard
        title="技能掌握度排行"
        subtitle="单项技能掌握度排序"
        loading={loading}
        colSpan={2}
        delay={0.4}
      >
        <ReactECharts
          option={barOption}
          style={{ height: 320, width: '100%' }}
          notMerge
        />
      </ChartCard>

      {/* Row 4: Job Funnel */}
      <ChartCard
        title="求职进度漏斗"
        subtitle="从投递到 Offer 的流转分布"
        loading={loading}
        colSpan={2}
        delay={0.45}
      >
        <div className="space-y-4 py-2">
          {funnelData.map((item, idx) => (
            <div key={item.status} className="flex items-center gap-4">
              <div className="w-20 shrink-0 text-sm font-medium text-muted-foreground">
                {item.label}
              </div>
              <div className="relative h-8 flex-1 overflow-hidden rounded-md bg-muted/50">
                <div
                  className="absolute inset-y-0 left-0 rounded-md transition-all duration-700 ease-out"
                  style={{
                    width: `${(item.count / maxCount) * 100}%`,
                    backgroundColor: funnelColors[idx % funnelColors.length],
                    opacity: 0.85,
                  }}
                />
                <div className="absolute inset-0 flex items-center px-3 text-xs font-semibold font-mono text-foreground">
                  {item.count}
                </div>
              </div>
              <div className="w-16 shrink-0 text-right text-sm text-muted-foreground font-mono">
                {maxCount > 0
                  ? `${((item.count / maxCount) * 100).toFixed(0)}%`
                  : '0%'}
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Personalized Recommendation */}
      <PersonalizedRecommendation />
    </motion.div>
  );
};

const CompetitionCountdownCard: React.FC = () => {
  const navigate = useNavigate();
  const [reminders, setReminders] = React.useState<CompetitionReminderItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    competitionApi.getDashboardReminders()
      .then((data: DashboardRemindersResponse) => {
        if (mounted) {
          setReminders(data.reminders || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const nearest = reminders[0];
  const daysLeft = nearest?.daysLeft ?? 0;
  const isUrgent = daysLeft <= 7 && daysLeft >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Card className="overflow-hidden border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur transition-all duration-300 hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${isUrgent ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  传智杯竞赛倒计时
                </h3>
                {loading ? null : nearest && (
                  <Badge variant={isUrgent ? 'destructive' : 'secondary'} className="text-xs">
                    {nearest.title}
                  </Badge>
                )}
              </div>
              {loading ? (
                <div className="mt-1 flex items-center gap-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : nearest ? (
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${isUrgent ? 'text-destructive' : 'text-primary'}`}>
                    {daysLeft >= 0 ? `${daysLeft} 天` : '已结束'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {nearest.date}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">暂无比赛提醒</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading && reminders.length > 1 && (
              <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                {reminders.slice(1, 3).map((r: CompetitionReminderItem) => (
                  <div key={r.id} className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{r.title}: {r.daysLeft >= 0 ? `${r.daysLeft}天` : '已结束'}</span>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={() => navigate('/competition')} className="gap-1">
              查看详情 <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DashboardPage;
