import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  MapPin,
  DollarSign,
  Home,
  Utensils,
  Bus,
  Zap,
  Film,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Award,
  X,
  Plus,
  Briefcase,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getCityCostComparison } from '@/api/industry-trend';
import type { CityCostItem } from '@shared/api.interface';

const CHART_THEME = 'ud';

const JOB_OPTIONS = [
  { value: 'data_analyst', label: '数据分析师' },
  { value: 'data_engineer', label: '数据工程师' },
  { value: 'data_scientist', label: '数据科学家' },
  { value: 'backend_engineer', label: '后端工程师' },
  { value: 'frontend_engineer', label: '前端工程师' },
  { value: 'product_manager', label: '产品经理' },
];

const CITY_OPTIONS = [
  { value: 'beijing', label: '北京' },
  { value: 'shanghai', label: '上海' },
  { value: 'shenzhen', label: '深圳' },
  { value: 'hangzhou', label: '杭州' },
  { value: 'guangzhou', label: '广州' },
  { value: 'chengdu', label: '成都' },
  { value: 'nanjing', label: '南京' },
  { value: 'wuhan', label: '武汉' },
  { value: 'xian', label: '西安' },
  { value: 'suzhou', label: '苏州' },
];

const CITY_LABEL_MAP: Record<string, string> = CITY_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);

const formatMoney = (v: number): string => {
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
  return v.toLocaleString();
};

const MAX_CITIES = 5;

const CityCostPage = () => {
  const [jobType, setJobType] = useState('data_engineer');
  const [selectedCities, setSelectedCities] = useState<string[]>([
    'beijing',
    'shanghai',
    'shenzhen',
    'hangzhou',
  ]);
  const [addingCity, setAddingCity] = useState('');
  const [data, setData] = useState<CityCostItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCityCostComparison(
        jobType,
        selectedCities.length > 0 ? selectedCities : undefined,
      );
      setData(res || []);
    } catch (err) {
      logger.error('fetch city cost comparison failed', err);
      toast.error('加载城市生活成本数据失败');
    } finally {
      setLoading(false);
    }
  }, [jobType, selectedCities]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleAddCity = () => {
    if (!addingCity) return;
    if (selectedCities.includes(addingCity)) {
      toast.warning('该城市已添加');
      return;
    }
    if (selectedCities.length >= MAX_CITIES) {
      toast.warning(`最多对比 ${MAX_CITIES} 个城市`);
      return;
    }
    setSelectedCities((prev) => [...prev, addingCity]);
    setAddingCity('');
  };

  const handleRemoveCity = (city: string) => {
    setSelectedCities((prev) => prev.filter((c) => c !== city));
  };

  // Sort data by disposable income descending
  const sortedByDisposable = useMemo(
    () => [...data].sort((a, b) => b.disposableIncome - a.disposableIncome),
    [data],
  );

  const barOption: EChartsOption = useMemo(() => {
    const cities = data.map((d) => CITY_LABEL_MAP[d.city] || d.city);
    return {
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
      grid: { left: 60, right: 30, top: 30, bottom: '18%' },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: '#94a3b8' },
      },
      xAxis: {
        type: 'category',
        data: cities,
        axisLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.3)' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
        },
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
          type: 'bar',
          data: data.map((d) => d.avgSalary),
          barWidth: 16,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#60a5fa' },
              ],
            },
          },
        },
        {
          name: '生活成本',
          type: 'bar',
          data: data.map((d) => d.avgTotal),
          barWidth: 16,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#f59e0b' },
                { offset: 1, color: '#fbbf24' },
              ],
            },
          },
        },
        {
          name: '可支配收入',
          type: 'bar',
          data: data.map((d) => d.disposableIncome),
          barWidth: 16,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#10b981' },
                { offset: 1, color: '#34d399' },
              ],
            },
          },
        },
      ],
    };
  }, [data]);

  const availableCities = CITY_OPTIONS.filter(
    (o) => !selectedCities.includes(o.value),
  );

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">城市生活成本对比</h1>
        <p className="text-sm text-muted-foreground">
          对比不同城市的薪资水平与生活成本，找到最适合你的城市
        </p>
      </div>

      {/* Filters */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground">岗位类型</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择岗位" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm text-muted-foreground">对比城市：</Label>
            {selectedCities.map((city) => (
              <Badge
                key={city}
                variant="outline"
                className="flex items-center gap-1 border-primary/30 bg-primary/5 text-primary"
              >
                <MapPin className="h-3 w-3" />
                {CITY_LABEL_MAP[city] || city}
                <button
                  onClick={() => handleRemoveCity(city)}
                  className="ml-1 rounded-full hover:bg-primary/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedCities.length < MAX_CITIES && (
              <div className="flex items-center gap-1">
                <Select
                  value={addingCity}
                  onValueChange={(v) => {
                    setAddingCity(v);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="添加城市" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCity}
                  disabled={!addingCity}
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加
                </Button>
              </div>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              最多选择 {MAX_CITIES} 个城市 · 已选 {selectedCities.length}/{MAX_CITIES}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" />
            薪资与生活成本对比
          </CardTitle>
          <CardDescription className="text-xs">
            月均收入与支出对比（单位：元）
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <Skeleton className="h-[360px] w-full" />
          ) : data.length === 0 ? (
            <div className="flex h-[360px] flex-col items-center justify-center text-center">
              <MapPin className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-base font-medium">暂无数据</p>
              <p className="mt-1 text-sm text-muted-foreground">
                请选择要对比的城市
              </p>
            </div>
          ) : (
            <ReactECharts
              option={barOption}
              theme={CHART_THEME}
              style={{ height: 360, width: '100%' }}
              notMerge
              lazyUpdate
            />
          )}
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            详细对比表
          </CardTitle>
          <CardDescription className="text-xs">
            各维度生活成本明细对比（元/月）
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : data.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>项目</TableHead>
                    {data.map((item) => (
                      <TableHead key={item.city} className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {CITY_LABEL_MAP[item.city] || item.city}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-blue-500" />
                        平均薪资
                      </div>
                    </TableCell>
                    {data.map((item) => (
                      <TableCell key={item.city} className="text-center font-semibold text-blue-600">
                        ¥{item.avgSalary.toLocaleString()}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <Home className="h-3.5 w-3.5 text-rose-500" />
                        房租
                      </div>
                    </TableCell>
                    {data.map((item) => (
                      <TableCell key={item.city} className="text-center">
                        ¥{item.avgRent.toLocaleString()}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <Utensils className="h-3.5 w-3.5 text-amber-500" />
                        餐饮
                      </div>
                    </TableCell>
                    {data.map((item) => (
                      <TableCell key={item.city} className="text-center">
                        ¥{item.avgFood.toLocaleString()}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <Bus className="h-3.5 w-3.5 text-cyan-500" />
                        交通
                      </div>
                    </TableCell>
                    {data.map((item) => (
                      <TableCell key={item.city} className="text-center">
                        ¥{item.avgTransport.toLocaleString()}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-yellow-500" />
                        水电网
                      </div>
                    </TableCell>
                    {data.map((item) => (
                      <TableCell key={item.city} className="text-center">
                        ¥{item.avgUtilities.toLocaleString()}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <Film className="h-3.5 w-3.5 text-violet-500" />
                        娱乐
                      </div>
                    </TableCell>
                    {data.map((item) => (
                      <TableCell key={item.city} className="text-center">
                        ¥{item.avgEntertainment.toLocaleString()}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">
                      总生活成本
                    </TableCell>
                    {data.map((item) => (
                      <TableCell key={item.city} className="text-center font-semibold">
                        ¥{item.avgTotal.toLocaleString()}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">成本指数</TableCell>
                    {data.map((item) => (
                      <TableCell key={item.city} className="text-center">
                        <Badge variant="outline" className="bg-muted/50">
                          {item.costIndex.toFixed(1)}
                        </Badge>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="bg-emerald-50/50">
                    <TableCell className="font-semibold text-emerald-700">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        可支配收入
                      </div>
                    </TableCell>
                    {data.map((item) => (
                      <TableCell key={item.city} className="text-center font-bold text-emerald-600">
                        ¥{item.disposableIncome.toLocaleString()}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disposable Income Ranking */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Award className="h-4 w-4 text-amber-500" />
            可支配收入排名
          </CardTitle>
          <CardDescription className="text-xs">
            可支配收入越高，生活压力越小
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i: number) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedByDisposable.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <div className="space-y-2">
              {sortedByDisposable.map((item, idx: number) => {
                const maxVal = sortedByDisposable[0]?.disposableIncome || 1;
                const pct = (item.disposableIncome / maxVal) * 100;
                return (
                  <div
                    key={item.city}
                    className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-700'
                          : idx === 1
                            ? 'bg-slate-100 text-slate-600'
                            : idx === 2
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {CITY_LABEL_MAP[item.city] || item.city}
                        </span>
                        <span className="font-semibold text-emerald-600">
                          ¥{item.disposableIncome.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CityCostPage;
