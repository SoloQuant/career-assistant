import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Briefcase,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Search,
  ArrowUpDown,
  Award,
  Target,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

import { getJobCompetition } from '@/api/industry-trend';
import type { JobCompetitionItem } from '@shared/api.interface';

const CHART_THEME = 'ud';

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

const JOB_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'data_analyst', label: '数据分析师' },
  { value: 'data_engineer', label: '数据工程师' },
  { value: 'data_scientist', label: '数据科学家' },
  { value: 'backend_engineer', label: '后端工程师' },
  { value: 'frontend_engineer', label: '前端工程师' },
  { value: 'product_manager', label: '产品经理' },
  { value: 'ui_designer', label: 'UI 设计师' },
];

const SORT_OPTIONS = [
  { value: 'hot', label: '热度最高' },
  { value: 'salary', label: '薪资最高' },
  { value: 'acceptance', label: '录取率最高' },
];

const HOT_LEVEL_LABEL: Record<string, string> = {
  cold: '冷门',
  medium: '一般',
  hot: '热门',
  very_hot: '极热门',
};

const HOT_LEVEL_COLOR: Record<string, string> = {
  cold: 'bg-sky-100 text-sky-700 border-sky-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  hot: 'bg-orange-100 text-orange-700 border-orange-200',
  very_hot: 'bg-rose-100 text-rose-700 border-rose-200',
};

const CITY_LABEL_MAP: Record<string, string> = CITY_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);

const getTrendIcon = (direction?: string) => {
  if (direction === 'rising') return <TrendingUp className="h-3.5 w-3.5" />;
  if (direction === 'declining') return <TrendingDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
};

const getTrendColor = (direction?: string): string => {
  if (direction === 'rising') return 'text-emerald-500';
  if (direction === 'declining') return 'text-rose-500';
  return 'text-muted-foreground';
};

const getTrendLabel = (direction?: string): string => {
  if (direction === 'rising') return '上升';
  if (direction === 'declining') return '下降';
  return '持平';
};

const formatSalary = (v?: number): string => {
  if (!v) return '—';
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
  return v.toLocaleString();
};

const JobCompetitionPage = () => {
  const [city, setCity] = useState('all');
  const [jobType, setJobType] = useState('all');
  const [sortBy, setSortBy] = useState('hot');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<JobCompetitionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        city?: string;
        jobType?: string;
        sortBy?: string;
        page: number;
        pageSize: number;
      } = { page: 1, pageSize: 20 };
      if (city !== 'all') params.city = city;
      if (jobType !== 'all') params.jobType = jobType;
      if (sortBy) params.sortBy = sortBy;

      const res = await getJobCompetition(params);
      setItems(res?.items || []);
      setTotal(res?.total || 0);
    } catch (err) {
      logger.error('fetch job competition failed', err);
      toast.error('加载岗位竞争数据失败');
    } finally {
      setLoading(false);
    }
  }, [city, jobType, sortBy]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.jobTitle.toLowerCase().includes(q) ||
        (item.city && CITY_LABEL_MAP[item.city]?.toLowerCase().includes(q)),
    );
  }, [items, search]);

  // Top 10 by hot score for sidebar chart
  const top10 = useMemo(
    () => [...items].sort((a, b) => b.hotScore - a.hotScore).slice(0, 10),
    [items],
  );

  const topBarOption: EChartsOption = useMemo(() => {
    const data = top10;
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
      grid: { left: 100, right: 30, top: 10, bottom: 10 },
      xAxis: {
        type: 'value',
        axisLabel: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: data.map((d) => d.jobTitle).reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10, width: 90, overflow: 'truncate' },
        inverse: false,
      },
      series: [
        {
          type: 'bar',
          data: data.map((d) => d.hotScore).reverse(),
          barWidth: 14,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#f97316' },
                { offset: 1, color: '#ef4444' },
              ],
            },
          },
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            color: '#64748b',
            formatter: '{c}',
          },
        },
      ],
    };
  }, [top10]);

  // Similar jobs for expanded card
  const getSimilarJobs = (item: JobCompetitionItem): JobCompetitionItem[] => {
    return items
      .filter((i) => i.id !== item.id && i.jobType === item.jobType)
      .slice(0, 3);
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">岗位竞争度</h1>
        <p className="text-sm text-muted-foreground">
          了解各岗位的竞争激烈程度，助你精准投递
        </p>
      </div>

      {/* Filters */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-60">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索岗位..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="w-36">
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

            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="岗位类型" />
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
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              共 {total} 个岗位
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content: List + Sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Left: Job list */}
        <div className="space-y-3 lg:col-span-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i: number) => (
              <Card key={i} className="border-border/60 bg-card/80">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="mt-3 h-4 w-64" />
                      <Skeleton className="mt-4 h-6 w-40" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredItems.length === 0 ? (
            <Card className="border-border/60 bg-card/80 backdrop-blur">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Briefcase className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-base font-medium">暂无岗位</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  没有找到符合条件的岗位
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredItems.map((item: JobCompetitionItem) => (
              <Card
                key={item.id}
                className="border-border/60 bg-card/80 backdrop-blur transition-all hover:shadow-md"
              >
                <CardContent className="p-5">
                  <div
                    className="flex cursor-pointer items-start justify-between gap-4"
                    onClick={() =>
                      setExpandedId(expandedId === item.id ? null : item.id)
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">
                          {item.jobTitle}
                        </h3>
                        <Badge
                          variant="outline"
                          className={HOT_LEVEL_COLOR[item.hotLevel] || ''}
                        >
                          <Flame className="mr-1 h-3 w-3" />
                          {HOT_LEVEL_LABEL[item.hotLevel] || item.hotLevel}
                        </Badge>
                        {item.city && (
                          <Badge variant="outline" className="bg-muted/50">
                            <MapPin className="mr-1 h-3 w-3" />
                            {CITY_LABEL_MAP[item.city] || item.city}
                          </Badge>
                        )}
                      </div>

                      {/* Key metrics */}
                      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            投递人数
                          </div>
                          <div className="mt-0.5 text-base font-bold">
                            {item.totalApplicants.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            岗位数
                          </div>
                          <div className="mt-0.5 text-base font-bold">
                            {item.totalPositions.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Target className="h-3 w-3" />
                            录取率
                          </div>
                          <div className="mt-0.5 text-base font-bold text-emerald-600">
                            {item.acceptanceRate.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            平均薪资
                          </div>
                          <div className="mt-0.5 text-base font-bold text-blue-600">
                            {formatSalary(item.avgSalary)}
                          </div>
                        </div>
                      </div>

                      {/* Trend + hot score */}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          热度分数：
                          <span className="font-semibold text-orange-500">
                            {item.hotScore}
                          </span>
                        </span>
                        <span
                          className={`flex items-center gap-1 font-medium ${getTrendColor(
                            item.trendDirection,
                          )}`}
                        >
                          {getTrendIcon(item.trendDirection)}
                          {getTrendLabel(item.trendDirection)}{' '}
                          {item.trendPercentage !== undefined
                            ? `${item.trendPercentage.toFixed(1)}%`
                            : ''}
                        </span>
                      </div>

                      {/* Required skills */}
                      {item.requiredSkills &&
                        item.requiredSkills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.requiredSkills
                              .slice(0, expandedId === item.id ? undefined : 5)
                              .map((skill: string) => (
                                <Badge
                                  key={skill}
                                  variant="outline"
                                  className="border-transparent bg-muted/60 px-1.5 py-0 text-[11px] font-normal"
                                >
                                  {skill}
                                </Badge>
                              ))}
                          </div>
                        )}
                    </div>

                    <Button variant="ghost" size="sm" className="shrink-0">
                      {expandedId === item.id ? (
                        <>
                          收起 <ChevronUp className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          详情 <ChevronDown className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Expanded detail */}
                  {expandedId === item.id && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-4">
                        {/* Competition analysis */}
                        <div>
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            竞争分析
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg bg-blue-50 p-3">
                              <div className="text-xs text-blue-600">
                                竞争程度
                              </div>
                              <div className="mt-1 text-lg font-bold text-blue-700">
                                {item.hotScore >= 80
                                  ? '非常激烈'
                                  : item.hotScore >= 60
                                    ? '比较激烈'
                                    : item.hotScore >= 40
                                      ? '一般'
                                      : '较小'}
                              </div>
                            </div>
                            <div className="rounded-lg bg-amber-50 p-3">
                              <div className="text-xs text-amber-600">
                                供需比
                              </div>
                              <div className="mt-1 text-lg font-bold text-amber-700">
                                {item.totalPositions > 0
                                  ? (item.totalApplicants / item.totalPositions).toFixed(1)
                                  : '—'}
                                :1
                              </div>
                            </div>
                            <div className="rounded-lg bg-emerald-50 p-3">
                              <div className="text-xs text-emerald-600">
                                录用机会
                              </div>
                              <div className="mt-1 text-lg font-bold text-emerald-700">
                                {item.acceptanceRate >= 20
                                  ? '较高'
                                  : item.acceptanceRate >= 10
                                    ? '中等'
                                    : '较低'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Similar jobs */}
                        {getSimilarJobs(item).length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                              <Award className="h-4 w-4 text-amber-500" />
                              相似岗位推荐
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              {getSimilarJobs(item).map((sim) => (
                                <div
                                  key={sim.id}
                                  className="rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                                >
                                  <div className="text-sm font-medium">
                                    {sim.jobTitle}
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>
                                      {sim.city
                                        ? CITY_LABEL_MAP[sim.city] || sim.city
                                        : '多城市'}
                                    </span>
                                    <span className="text-blue-600">
                                      {formatSalary(sim.avgSalary)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right: Top 10 ranking */}
        <div className="lg:col-span-1">
          <Card className="border-border/60 bg-card/80 backdrop-blur sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Flame className="h-4 w-4 text-orange-500" />
                热门岗位 Top 10
              </CardTitle>
              <CardDescription className="text-xs">
                按热度分数排名
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : top10.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  暂无数据
                </div>
              ) : (
                <>
                  <ReactECharts
                    option={topBarOption}
                    theme={CHART_THEME}
                    style={{ height: 360, width: '100%' }}
                    notMerge
                    lazyUpdate
                  />
                  <div className="mt-3 space-y-1.5">
                    {top10.slice(0, 5).map((item, idx: number) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                              idx === 0
                                ? 'bg-amber-500 text-white'
                                : idx === 1
                                  ? 'bg-slate-400 text-white'
                                  : idx === 2
                                    ? 'bg-orange-400 text-white'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="max-w-[120px] truncate font-medium">
                            {item.jobTitle}
                          </span>
                        </div>
                        <span className="font-semibold text-orange-500">
                          {item.hotScore}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JobCompetitionPage;
