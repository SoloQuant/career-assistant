import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Briefcase,
  DollarSign,
  Target,
  Sparkles,
  BarChart3,
  LineChart,
  Flame,
  History,
  CheckCircle2,
  AlertTriangle,
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
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  getSalaryTrend,
  getCityComparison,
  getTopSkills,
  getJobDemand,
  predictSalary,
  getPredictionHistory,
  getSkillJobHeatmap,
  type TopSkillItem,
  type JobDemandItem,
} from '@/api/industry-trend';
import type {
  IndustryTrendItem,
  SalaryPredictionResult,
  SalaryPredictionRequest,
  SkillJobHeatmapItem,
} from '@shared/api.interface';

// ---------- Constants ----------
const JOB_TYPE_OPTIONS = [
  { value: 'all', label: '全部岗位' },
  { value: 'data_analyst', label: '数据分析师' },
  { value: 'data_engineer', label: '数据工程师' },
  { value: 'data_scientist', label: '数据科学家' },
  { value: 'backend_engineer', label: '后端工程师' },
  { value: 'frontend_engineer', label: '前端工程师' },
  { value: 'product_manager', label: '产品经理' },
  { value: 'finance_analyst', label: '金融分析师' },
];

const CITY_OPTIONS = [
  { value: 'all', label: '全部城市' },
  { value: 'beijing', label: '北京' },
  { value: 'shanghai', label: '上海' },
  { value: 'shenzhen', label: '深圳' },
  { value: 'hangzhou', label: '杭州' },
  { value: 'guangzhou', label: '广州' },
  { value: 'chengdu', label: '成都' },
  { value: 'nanjing', label: '南京' },
  { value: 'wuhan', label: '武汉' },
];

const CITY_LABEL_MAP: Record<string, string> = CITY_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);

const JOB_LABEL_MAP: Record<string, string> = JOB_TYPE_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);

const DEFAULT_SKILLS = [
  'Python',
  'SQL',
  'Excel',
  'Tableau',
  'Spark',
  'Hadoop',
  'Java',
  'JavaScript',
  'React',
  '机器学习',
  '深度学习',
  '统计学',
  '数据挖掘',
  'Hive',
  'Flink',
  'Redis',
  'MySQL',
  'MongoDB',
];

const CHART_THEME = 'ud';

// ---------- Helpers ----------
const formatSalary = (v: number): string => {
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
};

const getTrendIcon = (direction: string) => {
  if (direction === 'rising') return <TrendingUp className="h-3.5 w-3.5" />;
  if (direction === 'declining')
    return <TrendingDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
};

const getTrendColor = (direction: string): string => {
  if (direction === 'rising') return 'text-emerald-500';
  if (direction === 'declining') return 'text-rose-500';
  return 'text-muted-foreground';
};

const getTrendLabel = (direction: string): string => {
  if (direction === 'rising') return '上升';
  if (direction === 'declining') return '下降';
  return '持平';
};

// ---------- Tab 1: Salary Trend ----------
const SalaryTrendTab = () => {
  const [jobType, setJobType] = useState('data_engineer');
  const [city, setCity] = useState('北京');
  const [trendData, setTrendData] = useState<IndustryTrendItem[]>([]);
  const [demandData, setDemandData] = useState<JobDemandItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [trendRes, demandRes] = await Promise.all([
        getSalaryTrend(jobType === 'all' ? undefined : jobType, city === 'all' ? undefined : city),
        getJobDemand(city === 'all' ? undefined : city),
      ]);
      setTrendData(trendRes || []);
      setDemandData(demandRes || []);
    } catch (err) {
      logger.error('fetch salary trend failed', err);
      toast.error('加载薪资趋势数据失败');
    } finally {
      setLoading(false);
    }
  }, [jobType, city]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const periods = useMemo(
    () => Array.from(new Set(trendData.map((d) => d.period))).sort(),
    [trendData],
  );

  const salaryByPeriod = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of periods) {
      const items = trendData.filter((d) => d.period === p);
      if (items.length === 0) continue;
      const avg = items.reduce((s, it) => s + it.avgSalary, 0) / items.length;
      map.set(p, Math.round(avg));
    }
    return map;
  }, [trendData, periods]);

  const trendStats = useMemo(() => {
    const vals = Array.from(salaryByPeriod.values());
    if (vals.length < 2) return { direction: 'stable', percentage: 0 };
    const first = vals[0];
    const last = vals[vals.length - 1];
    const diff = last - first;
    const pct = first > 0 ? (diff / first) * 100 : 0;
    return {
      direction: diff > 0 ? 'rising' : diff < 0 ? 'declining' : 'stable',
      percentage: Math.abs(pct),
    };
  }, [salaryByPeriod]);

  const lineOption: EChartsOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 1200,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        valueFormatter: (v) => `¥${Number(v).toLocaleString()}`,
      },
      grid: { left: 60, right: 30, top: 30, bottom: '20%' },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: '#94a3b8' },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: periods,
        axisLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.3)' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v) => `${Number(v) / 1000}k`,
          color: '#64748b',
          fontSize: 11,
        },
        splitLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.15)' } },
      },
      series: [
        {
          name: '平均薪资',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: periods.map((p) => salaryByPeriod.get(p) ?? 0),
          lineStyle: { color: '#22d3ee', width: 2.5 },
          itemStyle: {
            color: '#ffffff',
            borderColor: '#22d3ee',
            borderWidth: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
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
    }),
    [periods, salaryByPeriod],
  );

  const demandOption: EChartsOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 1000,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      grid: { left: 60, right: 30, top: 30, bottom: '20%' },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: '#94a3b8' },
      },
      xAxis: {
        type: 'category',
        data: demandData.map((d) => JOB_LABEL_MAP[d.jobType] || d.jobType),
        axisLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.3)' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          interval: 0,
          rotate: 30,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.15)' } },
      },
      series: [
        {
          name: '岗位需求量',
          type: 'bar',
          data: demandData.map((d) => d.demandCount),
          barWidth: 20,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#a78bfa' },
                { offset: 1, color: '#7c3aed' },
              ],
            },
          },
        },
      ],
    }),
    [demandData],
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground">岗位类型</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择岗位" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground">城市</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择城市" />
                </SelectTrigger>
                <SelectContent>
                  {CITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <LineChart className="h-4 w-4 text-primary" />
              平均薪资趋势
            </CardTitle>
            <CardDescription className="text-xs">
              最近 {periods.length} 期数据变化
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <>
                <ReactECharts
                  option={lineOption}
                  theme={CHART_THEME}
                  style={{ height: 300, width: '100%' }}
                  notMerge
                  lazyUpdate
                />
                <div className="mt-2 flex items-center gap-2 border-t border-border/50 pt-3 text-sm">
                  <span className="text-muted-foreground">薪资趋势：</span>
                  <span
                    className={`flex items-center gap-1 font-medium ${getTrendColor(
                      trendStats.direction,
                    )}`}
                  >
                    {getTrendIcon(trendStats.direction)}
                    {getTrendLabel(trendStats.direction)}{' '}
                    {trendStats.percentage.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-4 w-4 text-violet-500" />
              岗位需求量分布
            </CardTitle>
            <CardDescription className="text-xs">
              各岗位类型招聘需求数量
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ReactECharts
                option={demandOption}
                theme={CHART_THEME}
                style={{ height: 300, width: '100%' }}
                notMerge
                lazyUpdate
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ---------- Tab 2: City Comparison ----------
const CityComparisonTab = () => {
  const [jobType, setJobType] = useState('data_analyst');
  const [data, setData] = useState<IndustryTrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCityComparison(jobType);
      setData(res || []);
    } catch (err) {
      logger.error('fetch city comparison failed', err);
      toast.error('加载城市对比数据失败');
    } finally {
      setLoading(false);
    }
  }, [jobType]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const sortedData = useMemo(
    () => [...data].sort((a, b) => b.avgSalary - a.avgSalary),
    [data],
  );

  const barOption: EChartsOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 1000,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        valueFormatter: (v) => `¥${Number(v).toLocaleString()}`,
      },
      grid: { left: 80, right: 50, top: 20, bottom: '20%' },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: '#94a3b8' },
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v) => `${Number(v) / 1000}k`,
          color: '#64748b',
          fontSize: 10,
        },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.15)' } },
      },
      yAxis: {
        type: 'category',
        data: sortedData.map((d) => CITY_LABEL_MAP[d.city] || d.city),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: '平均薪资',
          type: 'bar',
          data: sortedData.map((d) => d.avgSalary),
          barWidth: 14,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: {
              type: 'linear',
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
            formatter: (params: unknown) =>
              formatSalary(Number((params as { value: number | string }).value)),
            fontSize: 10,
            color: '#94a3b8',
          },
        },
      ],
    }),
    [sortedData],
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground">岗位类型</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择岗位" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPE_OPTIONS.filter((o) => o.value !== 'all').map(
                    (opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="border-border/60 bg-card/80 backdrop-blur lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <MapPin className="h-4 w-4 text-primary" />
              各城市平均薪资对比
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <ReactECharts
                option={barOption}
                theme={CHART_THEME}
                style={{ height: 400, width: '100%' }}
                notMerge
                lazyUpdate
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-4 w-4 text-violet-500" />
              城市数据详情
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>城市</TableHead>
                      <TableHead>平均薪资</TableHead>
                      <TableHead>需求数</TableHead>
                      <TableHead>趋势</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((item) => (
                      <TableRow key={item.city}>
                        <TableCell className="font-medium">
                          {CITY_LABEL_MAP[item.city] || item.city}
                        </TableCell>
                        <TableCell className="font-mono">
                          ¥{item.avgSalary.toLocaleString()}
                        </TableCell>
                        <TableCell>{item.demandCount}</TableCell>
                        <TableCell>
                          <span
                            className={`flex items-center gap-1 text-xs ${getTrendColor(
                              item.trendDirection,
                            )}`}
                          >
                            {getTrendIcon(item.trendDirection)}
                            {getTrendLabel(item.trendDirection)}{' '}
                            {Math.abs(item.trendPercentage).toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ---------- Tab 3: Top Skills ----------
const TopSkillsTab = () => {
  const [jobType, setJobType] = useState('all');
  const [skills, setSkills] = useState<TopSkillItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTopSkills(
        jobType === 'all' ? undefined : jobType,
      );
      setSkills(res || []);
    } catch (err) {
      logger.error('fetch top skills failed', err);
      toast.error('加载热门技能数据失败');
    } finally {
      setLoading(false);
    }
  }, [jobType]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const sortedSkills = useMemo(
    () => [...skills].sort((a, b) => b.count - a.count),
    [skills],
  );

  const barOption: EChartsOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 1000,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as { name: string; value: number }[];
          return `${arr[0].name}<br/>出现频次: <b>${arr[0].value}</b>`;
        },
      },
      grid: { left: 100, right: 50, top: 20, bottom: '20%' },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: '#94a3b8' },
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.15)' } },
      },
      yAxis: {
        type: 'category',
        data: sortedSkills.map((s) => s.skillName),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: '出现频次',
          type: 'bar',
          data: sortedSkills.map((s, idx) => ({
            value: s.count,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: idx < 3 ? '#f59e0b' : '#0ea5e9' },
                  { offset: 1, color: idx < 3 ? '#f97316' : '#22d3ee' },
                ],
              },
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 14,
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            color: '#94a3b8',
          },
        },
      ],
    }),
    [sortedSkills],
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground">岗位类型</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择岗位" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="border-border/60 bg-card/80 backdrop-blur lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Flame className="h-4 w-4 text-amber-500" />
              热门技能排行
            </CardTitle>
            <CardDescription className="text-xs">
              按岗位需求中出现频次排序
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <ReactECharts
                option={barOption}
                theme={CHART_THEME}
                style={{ height: 400, width: '100%' }}
                notMerge
                lazyUpdate
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              技能趋势状态
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <div className="space-y-2">
                {sortedSkills.map((skill) => (
                  <div
                    key={skill.skillName}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          skill.trend === 'rising'
                            ? 'default'
                            : skill.trend === 'declining'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="text-[10px]"
                      >
                        {skill.count}次
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        {skill.skillName}
                      </span>
                    </div>
                    <span
                      className={`flex items-center gap-1 text-xs ${getTrendColor(
                        skill.trend,
                      )}`}
                    >
                      {getTrendIcon(skill.trend)}
                      {getTrendLabel(skill.trend)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ---------- Tab 4: Salary Prediction ----------
const SalaryPredictionTab = () => {
  const [city, setCity] = useState('beijing');
  const [jobType, setJobType] = useState('data_analyst');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Python', 'SQL']);
  const [skillInput, setSkillInput] = useState('');
  const [experienceYears, setExperienceYears] = useState('2');
  const [result, setResult] = useState<SalaryPredictionResult | null>(null);
  const [history, setHistory] = useState<SalaryPredictionResult[]>([]);
  const [predicting, setPredicting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const loadHistory = async (): Promise<void> => {
      try {
        const res = await getPredictionHistory();
        setHistory(res.items || []);
      } catch (err) {
        logger.error('fetch prediction history failed', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    void loadHistory();
  }, []);

  const addSkill = useCallback(() => {
    const s = skillInput.trim();
    if (!s) return;
    if (selectedSkills.includes(s)) {
      toast.info('该技能已添加');
      return;
    }
    setSelectedSkills([...selectedSkills, s]);
    setSkillInput('');
  }, [skillInput, selectedSkills]);

  const removeSkill = useCallback(
    (skill: string) => {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    },
    [selectedSkills],
  );

  const handlePredict = useCallback(async () => {
    if (!city || !jobType) {
      toast.warning('请选择城市和岗位类型');
      return;
    }
    const years = Number(experienceYears);
    if (isNaN(years) || years < 0 || years > 50) {
      toast.warning('请输入有效的工作年限');
      return;
    }
    setPredicting(true);
    try {
      const req: SalaryPredictionRequest = {
        city,
        jobType,
        skills: selectedSkills,
        experienceYears: years,
      };
      const res = await predictSalary(req);
      setResult(res);
      setHistory((prev) => [res, ...prev].slice(0, 10));
      toast.success('薪资预测完成');
    } catch (err) {
      logger.error('predict salary failed', err);
      toast.error('薪资预测失败，请重试');
    } finally {
      setPredicting(false);
    }
  }, [city, jobType, selectedSkills, experienceYears]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Form */}
        <Card className="border-border/60 bg-card/80 backdrop-blur lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Target className="h-4 w-4 text-primary" />
              薪资预测
            </CardTitle>
            <CardDescription className="text-xs">
              填写信息获取个性化薪资预测
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                <MapPin className="mr-1 inline h-3 w-3" />
                所在城市
              </Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder="选择城市" />
                </SelectTrigger>
                <SelectContent>
                  {CITY_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                <Briefcase className="mr-1 inline h-3 w-3" />
                岗位类型
              </Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择岗位" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPE_OPTIONS.filter((o) => o.value !== 'all').map(
                    (opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                <Sparkles className="mr-1 inline h-3 w-3" />
                已有技能
              </Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="输入技能名称回车添加"
                  className="flex-1"
                />
                <Button onClick={addSkill} variant="secondary" size="sm">
                  添加
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {DEFAULT_SKILLS.filter(
                  (s) => !selectedSkills.includes(s),
                ).slice(0, 8)
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setSelectedSkills([...selectedSkills, s])
                      }
                      className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      + {s}
                    </button>
                  ))}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {selectedSkills.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => removeSkill(s)}
                  >
                    {s}
                    <span className="text-[10px] opacity-70">×</span>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                工作年限（年）
              </Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>

            <Button
              onClick={handlePredict}
              disabled={predicting}
              className="w-full"
            >
              {predicting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  预测中...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  预测薪资
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        <Card className="border-border/60 bg-card/80 backdrop-blur lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-amber-500" />
              预测结果
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {!result && !predicting && (
              <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
                <Target className="mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm">填写左侧信息并点击"预测薪资"</p>
              </div>
            )}
            {predicting && (
              <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">正在分析数据，生成薪资预测...</p>
              </div>
            )}
            {result && !predicting && (
              <div className="space-y-4">
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-violet-500/10 p-5">
                  <p className="text-sm text-muted-foreground">预测薪资范围</p>
                  <p className="mt-1 font-mono text-3xl font-bold text-foreground">
                    ¥{result.predictedMin.toLocaleString()} -{' '}
                    ¥{result.predictedMax.toLocaleString()}
                  </p>
                  <div className="mt-3 flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">平均薪资：</span>
                      <span className="font-semibold text-foreground">
                        ¥{result.predictedAvg.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">置信度：</span>
                      <span className="font-semibold text-emerald-500">
                        {result.confidence.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      优势技能
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.factors.topPositive.length > 0 ? (
                        result.factors.topPositive.map((s) => (
                          <Badge
                            key={s}
                            className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          >
                            {s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          暂无
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                    <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-4 w-4" />
                      提升建议
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.factors.topNegative.length > 0 ? (
                        result.factors.topNegative.map((s) => (
                          <Badge
                            key={s}
                            variant="destructive"
                            className="bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          >
                            {s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          暂无
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <History className="h-4 w-4 text-violet-500" />
            历史预测记录
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingHistory ? (
            <Skeleton className="h-[200px] w-full" />
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              暂无预测记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>城市</TableHead>
                    <TableHead>岗位</TableHead>
                    <TableHead>工作年限</TableHead>
                    <TableHead>技能数</TableHead>
                    <TableHead>薪资范围</TableHead>
                    <TableHead>平均薪资</TableHead>
                    <TableHead>置信度</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {CITY_LABEL_MAP[h.city] || h.city}
                      </TableCell>
                      <TableCell>
                        {JOB_LABEL_MAP[h.jobType] || h.jobType}
                      </TableCell>
                      <TableCell>{h.experienceYears} 年</TableCell>
                      <TableCell>{h.skills.length}</TableCell>
                      <TableCell className="font-mono text-xs">
                        ¥{h.predictedMin.toLocaleString()} -{' '}
                        ¥{h.predictedMax.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        ¥{h.predictedAvg.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-emerald-500">
                        {h.confidence.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ---------- Tab 5: Skill-Job Heatmap ----------
const SkillJobHeatmapTab = () => {
  const [data, setData] = useState<SkillJobHeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        const res = await getSkillJobHeatmap();
        setData(res || []);
      } catch (err) {
        logger.error('fetch heatmap failed', err);
        toast.error('加载热力图数据失败');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  const { xData, yData, heatData, salaryData } = useMemo(() => {
    const xSet = new Set<string>();
    const ySet = new Set<string>();
    for (const item of data) {
      ySet.add(item.skillName);
      for (const j of item.jobTypes) {
        xSet.add(j.jobType);
      }
    }
    const xArr = Array.from(xSet);
    const yArr = Array.from(ySet);
    const matchArr: [number, number, number][] = [];
    const salaryArr: [number, number, number][] = [];
    for (let yi = 0; yi < yArr.length; yi++) {
      const item = data.find((d) => d.skillName === yArr[yi]);
      if (!item) continue;
      for (let xi = 0; xi < xArr.length; xi++) {
        const jt = item.jobTypes.find((j) => j.jobType === xArr[xi]);
        if (jt) {
          matchArr.push([xi, yi, jt.matchRate]);
          salaryArr.push([xi, yi, jt.avgSalary]);
        } else {
          matchArr.push([xi, yi, 0]);
          salaryArr.push([xi, yi, 0]);
        }
      }
    }
    return {
      xData: xArr.map((k) => JOB_LABEL_MAP[k] || k),
      yData: yArr,
      heatData: matchArr,
      salaryData: salaryArr,
    };
  }, [data]);

  const heatmapOption: EChartsOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 1000,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as { value?: number[]; data?: number[] };
          const v = p.value || p.data;
          if (!v || v.length < 3) return '';
          const job = xData[v[0]];
          const skill = yData[v[1]];
          const matchRate = v[2];
          const salItem = salaryData.find(
            (s) => s[0] === v[0] && s[1] === v[1],
          );
          const salary = salItem ? salItem[2] : 0;
          return `
            <div style="font-weight:600;margin-bottom:4px">${skill} × ${job}</div>
            <div>匹配度: <b>${matchRate}%</b></div>
            <div>平均薪资: <b>¥${salary.toLocaleString()}</b></div>
          `;
        },
      },
      grid: { left: 100, right: 40, top: 30, bottom: '20%' },
      legend: {
        bottom: 0,
        icon: 'rect',
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { fontSize: 11, color: '#94a3b8' },
        data: ['技能-岗位匹配度'],
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.3)' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          interval: 0,
          rotate: 30,
        },
        axisTick: { show: false },
        splitArea: { show: false },
      },
      yAxis: {
        type: 'category',
        data: yData,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        splitArea: { show: false },
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 10 },
        inRange: {
          color: [
            '#0f172a',
            '#0c4a6e',
            '#0369a1',
            '#0284c7',
            '#0ea5e9',
            '#22d3ee',
            '#67e8f9',
          ],
        },
      },
      series: [
        {
          name: '技能-岗位匹配度',
          type: 'heatmap',
          data: heatData,
          label: {
            show: true,
            formatter: (p: unknown) => {
              const { value } = p as { value: number[] };
              return `${value[2]}%`;
            },
            fontSize: 10,
            color: '#fff',
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          itemStyle: {
            borderRadius: 3,
            borderColor: 'rgba(15, 23, 42, 0.6)',
            borderWidth: 1,
          },
        },
      ],
    }),
    [xData, yData, heatData, salaryData],
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Flame className="h-4 w-4 text-primary" />
            技能-岗位热力图
          </CardTitle>
          <CardDescription className="text-xs">
            颜色深浅代表技能与岗位的匹配度，悬浮查看详细薪资
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <Skeleton className="h-[500px] w-full" />
          ) : (
            <ReactECharts
              option={heatmapOption}
              theme={CHART_THEME}
              style={{ height: 500, width: '100%' }}
              notMerge
              lazyUpdate
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ---------- Main Page ----------
const IndustryTrendPage = () => {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          行业趋势与薪资预测
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          洞察行业趋势、对比城市薪资、预测个人薪酬、探索技能与岗位匹配
        </p>
      </div>

      <Tabs defaultValue="salary-trend" className="w-full">
        <TabsList className="grid w-full grid-cols-5 gap-1 md:w-auto md:inline-flex">
          <TabsTrigger value="salary-trend" className="text-xs md:text-sm">
            <LineChart className="mr-1 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">薪资趋势</span>
            <span className="sm:hidden">趋势</span>
          </TabsTrigger>
          <TabsTrigger value="city-compare" className="text-xs md:text-sm">
            <MapPin className="mr-1 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">城市对比</span>
            <span className="sm:hidden">城市</span>
          </TabsTrigger>
          <TabsTrigger value="top-skills" className="text-xs md:text-sm">
            <Flame className="mr-1 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">热门技能</span>
            <span className="sm:hidden">技能</span>
          </TabsTrigger>
          <TabsTrigger value="salary-prediction" className="text-xs md:text-sm">
            <Target className="mr-1 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">薪资预测</span>
            <span className="sm:hidden">预测</span>
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="text-xs md:text-sm">
            <BarChart3 className="mr-1 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">热力图</span>
            <span className="sm:hidden">热力</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="salary-trend">
            <SalaryTrendTab />
          </TabsContent>
          <TabsContent value="city-compare">
            <CityComparisonTab />
          </TabsContent>
          <TabsContent value="top-skills">
            <TopSkillsTab />
          </TabsContent>
          <TabsContent value="salary-prediction">
            <SalaryPredictionTab />
          </TabsContent>
          <TabsContent value="heatmap">
            <SkillJobHeatmapTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default IndustryTrendPage;
