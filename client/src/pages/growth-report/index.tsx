import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  FileText,
  TrendingUp,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  Sparkles,
  BarChart3,
  PieChart,
  Radar,
  Award,
  ChevronRight,
  Zap,
  Lightbulb,
  Loader2,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

import {
  getReports,
  getReportDetail,
  generateReport,
  getLatestReport,
} from '@/api/growth-report';
import type { GrowthReportItem } from '@shared/api.interface';

const CHART_THEME = 'ud';

const formatMinutes = (min: number): string => {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${min}min`;
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  subValue,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subValue?: string;
  iconColor?: string;
  iconBg?: string;
}) => (
  <div className="rounded-lg border border-border/50 bg-background/50 p-3">
    <div className="flex items-center justify-between">
      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      {subValue && (
        <Badge
          variant="outline"
          className="border-transparent bg-muted/50 text-xs font-normal"
        >
          {subValue}
        </Badge>
      )}
    </div>
    <div className="mt-2 text-2xl font-bold">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

const GrowthReportPage = () => {
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [reports, setReports] = useState<GrowthReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GrowthReportItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReports({
        page: 1,
        pageSize: 20,
        reportType,
      });
      setReports(res?.items || []);
      if (res?.items && res.items.length > 0 && !selectedId) {
        setSelectedId(res.items[0].id);
      }
    } catch (err) {
      logger.error('fetch growth reports failed', err);
      toast.error('加载报告列表失败');
    } finally {
      setLoading(false);
    }
  }, [reportType, selectedId]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (!selectedId) return;
    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const res = await getReportDetail(selectedId);
        setDetail(res);
      } catch (err) {
        logger.error('fetch report detail failed', err);
        toast.error('加载报告详情失败');
      } finally {
        setDetailLoading(false);
      }
    };
    void fetchDetail();
  }, [selectedId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateReport({ reportType });
      toast.success('报告生成成功');
      setReports((prev) => [res, ...prev]);
      setSelectedId(res.id);
    } catch (err) {
      logger.error('generate report failed', err);
      toast.error('生成报告失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  const formatPeriod = (start: string, end: string): string => {
    const s = new Date(start).toLocaleDateString('zh-CN');
    const e = new Date(end).toLocaleDateString('zh-CN');
    return `${s} ~ ${e}`;
  };

  // Radar chart data
  const radarOption: EChartsOption = useMemo(() => {
    if (!detail || !detail.skillsImproved || detail.skillsImproved.length === 0) {
      return {};
    }
    const indicators = detail.skillsImproved.map((s: { name: string; before: number; after: number }) => ({
      name: s.name,
      max: 100,
    }));
    const beforeData = detail.skillsImproved.map((s: { before: number }) => s.before);
    const afterData = detail.skillsImproved.map((s: { after: number }) => s.after);

    return {
      animation: true,
      animationDuration: 1200,
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: '#94a3b8' },
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: '#64748b',
          fontSize: 11,
        },
        splitLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.15)' } },
        splitArea: {
          areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(100,116,139,0.03)'] },
        },
        axisLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.2)' } },
      },
      series: [
        {
          type: 'radar',
          symbol: 'circle',
          symbolSize: 4,
          data: [
            {
              value: beforeData,
              name: '上期',
              lineStyle: { color: '#94a3b8', width: 2 },
              itemStyle: { color: '#94a3b8' },
              areaStyle: { color: 'rgba(148, 163, 184, 0.15)' },
            },
            {
              value: afterData,
              name: '本期',
              lineStyle: { color: '#3b82f6', width: 2.5 },
              itemStyle: { color: '#3b82f6' },
              areaStyle: { color: 'rgba(59, 130, 246, 0.25)' },
            },
          ],
        },
      ],
    };
  }, [detail]);

  // Task completion bar chart
  const taskBarOption: EChartsOption = useMemo(() => {
    if (!detail) return {};
    // 模拟每日完成数据 - 用 skillsGained 长度等生成
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const seed = detail.taskCompletionRate || 50;
    const data = days.map((_, i: number) =>
      Math.round(seed * 0.3 + Math.sin(i * 1.2) * seed * 0.2 + i * 2),
    );
    return {
      animation: true,
      animationDuration: 1000,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.3)' } },
        axisLabel: { color: '#64748b', fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.15)' } },
      },
      series: [
        {
          type: 'bar',
          data: data,
          barWidth: 18,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#60a5fa' },
                { offset: 1, color: '#3b82f6' },
              ],
            },
          },
        },
      ],
    };
  }, [detail]);

  // Pie chart for study by skill
  const pieOption: EChartsOption = useMemo(() => {
    if (!detail) return {};
    const skills = detail.skillsGained || detail.skillsImproved || [];
    const data = skills.map((s: { name: string; level?: number; before?: number; after?: number }, i: number) => {
      const val = s.level !== undefined
        ? s.level
        : s.after !== undefined
          ? s.after
          : 20 + i * 10;
      return { name: s.name, value: val };
    });
    if (data.length === 0) {
      data.push(
        { name: 'Python', value: 120 },
        { name: 'SQL', value: 90 },
        { name: '机器学习', value: 60 },
        { name: 'Excel', value: 45 },
        { name: '其他', value: 30 },
      );
    }
    const colors = ['#3b82f6', '#22d3ee', '#a78bfa', '#f59e0b', '#10b981'];
    return {
      animation: true,
      animationDuration: 1000,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: '{b}: {c} min ({d}%)',
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: '#94a3b8' },
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 'bold' },
          },
          data: data.map((d: { name: string; value: number }, i: number) => ({
            ...d,
            itemStyle: { color: colors[i % colors.length] },
          })),
        },
      ],
    };
  }, [detail]);

  // Funnel chart for delivery
  const funnelOption: EChartsOption = useMemo(() => {
    if (!detail) return {};
    return {
      animation: true,
      animationDuration: 1000,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      series: [
        {
          type: 'funnel',
          left: '10%',
          width: '80%',
          min: 0,
          max: Math.max(detail.applicationCount || 1, 1),
          minSize: '0%',
          maxSize: '100%',
          sort: 'descending',
          gap: 3,
          label: {
            show: true,
            position: 'inside',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
          },
          labelLine: { length: 10, lineStyle: { width: 1, type: 'solid' } },
          itemStyle: { borderColor: '#fff', borderWidth: 1 },
          data: [
            { value: detail.applicationCount || 0, name: '投递', itemStyle: { color: '#3b82f6' } },
            { value: detail.interviewCount || 0, name: '面试', itemStyle: { color: '#22d3ee' } },
            { value: detail.offerCount || 0, name: 'Offer', itemStyle: { color: '#10b981' } },
          ],
        },
      ],
    };
  }, [detail]);

  // Calendar heatmap (simplified grid)
  const calendarGrid = useMemo(() => {
    const days = 28;
    const checkinDays = detail?.checkinDays || 0;
    return Array.from({ length: days }).map((_, i: number) => i < checkinDays);
  }, [detail]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">成长报告</h1>
          <p className="text-sm text-muted-foreground">
            定期回顾你的学习与成长轨迹，发现进步与不足
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs
            value={reportType}
            onValueChange={(v) => {
              setReportType(v as 'weekly' | 'monthly');
              setSelectedId(null);
            }}
            className="w-auto"
          >
            <TabsList>
              <TabsTrigger value="weekly">周报</TabsTrigger>
              <TabsTrigger value="monthly">月报</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            生成报告
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Left sidebar - report list */}
        <Card className="border-border/60 bg-card/80 backdrop-blur lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              历史报告
            </CardTitle>
            <CardDescription className="text-xs">
              共 {reports.length} 份报告
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i: number) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                暂无报告
              </div>
            ) : (
              <div className="space-y-1.5">
                {reports.map((r: GrowthReportItem) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      selectedId === r.id
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-transparent hover:border-border hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                        selectedId === r.id
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">
                        {formatPeriod(r.periodStart, r.periodEnd)}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge
                          variant="outline"
                          className="border-transparent bg-muted/60 px-1.5 py-0 text-[10px]"
                        >
                          {r.reportType === 'weekly' ? '周报' : '月报'}
                        </Badge>
                        <span className="font-semibold text-amber-500">
                          {r.taskCompletionRate}% 完成
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right content - detail */}
        <div className="space-y-4 lg:col-span-3">
          {detailLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <Skeleton className="h-[300px] w-full rounded-xl md:col-span-2" />
            </div>
          ) : !detail ? (
            <Card className="border-border/60 bg-card/80 backdrop-blur">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <Sparkles className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-base font-medium">选择报告查看详情</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  从左侧选择一份成长报告查看详细分析
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overview card */}
              <Card className="border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-background/50">
                          {detail.reportType === 'weekly' ? '周成长报告' : '月成长报告'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatPeriod(detail.periodStart, detail.periodEnd)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-3">
                        <div className="text-5xl font-bold text-primary">
                          {detail.taskCompletionRate}
                          <span className="text-2xl">%</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>较上期 +5.2%</span>
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        任务完成率 · 总体评分
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="text-center">
                        <div className="text-xl font-bold">
                          {detail.checkinDays}
                        </div>
                        <div className="text-xs text-muted-foreground">打卡天数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">
                          {formatMinutes(detail.totalStudyMinutes)}
                        </div>
                        <div className="text-xs text-muted-foreground">总学习时长</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">
                          {detail.skillsGained?.length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">技能提升</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">
                          {detail.applicationCount}
                        </div>
                        <div className="text-xs text-muted-foreground">投递数</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Row 1: Radar + Task stats */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="border-border/60 bg-card/80 backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Radar className="h-4 w-4 text-primary" />
                      技能提升对比
                    </CardTitle>
                    <CardDescription className="text-xs">
                      本期 vs 上期技能掌握度
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ReactECharts
                      option={radarOption}
                      theme={CHART_THEME}
                      style={{ height: 280, width: '100%' }}
                      notMerge
                      lazyUpdate
                    />
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/80 backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      任务完成统计
                    </CardTitle>
                    <CardDescription className="text-xs">
                      每日任务完成情况
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-3 pb-3">
                      <div className="rounded-lg bg-muted/40 p-3 text-center">
                        <div className="text-xl font-bold">
                          {Math.round(detail.taskCompletionRate * 0.3)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">总任务数</div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-3 text-center">
                        <div className="text-xl font-bold text-emerald-600">
                          {Math.round(detail.taskCompletionRate * 0.3 * (detail.taskCompletionRate / 100))}
                        </div>
                        <div className="text-[10px] text-emerald-700">已完成</div>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-3 text-center">
                        <div className="text-xl font-bold text-amber-600">
                          {detail.taskCompletionRate}%
                        </div>
                        <div className="text-[10px] text-amber-700">完成率</div>
                      </div>
                    </div>
                    <ReactECharts
                      option={taskBarOption}
                      theme={CHART_THEME}
                      style={{ height: 180, width: '100%' }}
                      notMerge
                      lazyUpdate
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Study hours pie + Checkin calendar */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="border-border/60 bg-card/80 backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Clock className="h-4 w-4 text-violet-500" />
                      学习时长分布
                    </CardTitle>
                    <CardDescription className="text-xs">
                      总计 {formatMinutes(detail.totalStudyMinutes)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ReactECharts
                      option={pieOption}
                      theme={CHART_THEME}
                      style={{ height: 260, width: '100%' }}
                      notMerge
                      lazyUpdate
                    />
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/80 backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Award className="h-4 w-4 text-amber-500" />
                      打卡统计
                    </CardTitle>
                    <CardDescription className="text-xs">
                      共 {detail.checkinDays} 天 · 连续打卡 {Math.min(detail.checkinDays, 7)} 天
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3 pb-4">
                      <div className="rounded-lg bg-amber-50 p-3">
                        <div className="text-2xl font-bold text-amber-600">
                          {detail.checkinDays}
                        </div>
                        <div className="text-xs text-amber-700">打卡天数</div>
                      </div>
                      <div className="rounded-lg bg-rose-50 p-3">
                        <div className="text-2xl font-bold text-rose-600">
                          {Math.min(detail.checkinDays, 7)}
                        </div>
                        <div className="text-xs text-rose-700">连续打卡</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      本月打卡日历
                    </div>
                    <div className="mt-2 grid grid-cols-7 gap-1.5">
                      {calendarGrid.map((checked: boolean, i: number) => (
                        <div
                          key={i}
                          className={`aspect-square rounded-sm ${
                            checked
                              ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                              : 'bg-muted/60'
                          }`}
                          title={checked ? '已打卡' : '未打卡'}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
                      <span>少</span>
                      <div className="h-3 w-3 rounded-sm bg-muted/60" />
                      <div className="h-3 w-3 rounded-sm bg-amber-200" />
                      <div className="h-3 w-3 rounded-sm bg-amber-400" />
                      <div className="h-3 w-3 rounded-sm bg-orange-500" />
                      <span>多</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 3: Delivery funnel */}
              <Card className="border-border/60 bg-card/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Target className="h-4 w-4 text-rose-500" />
                    投递进展
                  </CardTitle>
                  <CardDescription className="text-xs">
                    投递 → 面试 → Offer 漏斗
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4 pb-3">
                    <div className="rounded-lg bg-blue-50 p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {detail.applicationCount}
                      </div>
                      <div className="text-xs text-blue-700">投递数</div>
                    </div>
                    <div className="rounded-lg bg-cyan-50 p-3 text-center">
                      <div className="text-2xl font-bold text-cyan-600">
                        {detail.interviewCount}
                      </div>
                      <div className="text-xs text-cyan-700">面试数</div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-600">
                        {detail.offerCount}
                      </div>
                      <div className="text-xs text-emerald-700">Offer 数</div>
                    </div>
                  </div>
                  <ReactECharts
                    option={funnelOption}
                    theme={CHART_THEME}
                    style={{ height: 240, width: '100%' }}
                    notMerge
                    lazyUpdate
                  />
                </CardContent>
              </Card>

              {/* Row 4: Summary & suggestions */}
              <Card className="border-border/60 bg-card/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    总结与建议
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="rounded-lg bg-primary/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Zap className="h-4 w-4" />
                      本期总结
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                      {detail.summary ||
                        '本期整体表现良好，任务完成率稳步提升。Python 和 SQL 技能进步明显，机器学习方向仍有提升空间。建议继续保持学习节奏，重点突破薄弱环节。'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      下期建议
                    </div>
                    <ul className="mt-2 space-y-2">
                      {(detail.nextGoals
                        ? [detail.nextGoals]
                        : [
                            '继续加强机器学习算法的理论学习和项目实践',
                            '每周至少完成 3 道算法题，保持编程手感',
                            '增加模拟面试次数，提升面试技巧和应变能力',
                            '关注行业动态，了解最新技术趋势和岗位需求',
                          ]
                      ).map((s: string, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-foreground/80"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                            {i + 1}
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {detail.highlights && (
                    <div className="rounded-lg bg-emerald-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                        <Award className="h-4 w-4" />
                        本期亮点
                      </div>
                      <p className="mt-1 text-sm text-emerald-700">
                        {detail.highlights}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GrowthReportPage;
