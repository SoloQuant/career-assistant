import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Calculator,
  MapPin,
  DollarSign,
  Landmark,
  FileText,
  History,
  ChevronLeft,
  ChevronRight,
  Wallet,
  PiggyBank,
  Receipt,
  TrendingUp,
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
  calculateSalary,
  getCityList,
  getHistory,
} from '@/api/salary-calc';
import type {
  SalaryCalcResult,
  SalaryCalcHistoryResponse,
} from '@shared/api.interface';

interface CityOption {
  city: string;
  socialBase: number;
  fundBase: number;
  fundRatio: number;
}

const CHART_THEME = 'ud';

const SalaryCalcPage = () => {
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  const [selectedCity, setSelectedCity] = useState('');
  const [grossSalary, setGrossSalary] = useState('');
  const [fundRatio, setFundRatio] = useState('0.12');
  const [bonusMonth, setBonusMonth] = useState('0');
  const [specialDeduction, setSpecialDeduction] = useState('1500');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<SalaryCalcResult | null>(null);

  const [history, setHistory] = useState<SalaryCalcResult[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(5);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch city list
  useEffect(() => {
    let cancelled = false;
    const fetchCities = async (): Promise<void> => {
      try {
        const data = await getCityList();
        if (!cancelled) {
          setCityOptions(data || []);
          if (data && data.length > 0) {
            setSelectedCity(data[0].city);
          }
        }
      } catch (err) {
        logger.error('fetch city list failed', err);
        toast.error('加载城市列表失败');
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    };
    void fetchCities();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const res: SalaryCalcHistoryResponse = await getHistory({
        page,
        pageSize: historyPageSize,
      });
      setHistory(res.items || []);
      setHistoryTotal(res.total || 0);
    } catch (err) {
      logger.error('fetch salary history failed', err);
      toast.error('加载历史记录失败');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPageSize]);

  useEffect(() => {
    void fetchHistory(1);
  }, [fetchHistory]);

  const handleCalculate = async () => {
    if (!selectedCity) {
      toast.error('请选择城市');
      return;
    }
    const grossNum = Number(grossSalary);
    if (!grossSalary || isNaN(grossNum) || grossNum <= 0) {
      toast.error('请输入有效的税前月薪');
      return;
    }
    const fundRatioNum = Number(fundRatio);
    const bonusNum = Number(bonusMonth);
    const deductionNum = Number(specialDeduction);

    setCalculating(true);
    try {
      const res = await calculateSalary({
        city: selectedCity,
        grossSalary: grossNum,
        fundRatio: isNaN(fundRatioNum) ? 0.12 : fundRatioNum,
        bonusMonth: isNaN(bonusNum) ? 0 : bonusNum,
        specialDeduction: isNaN(deductionNum) ? 0 : deductionNum,
      });
      setResult(res);
      toast.success('计算成功');
      void fetchHistory(1);
    } catch (err) {
      logger.error('calculate salary failed', err);
      toast.error('薪资计算失败');
    } finally {
      setCalculating(false);
    }
  };

  const formatMoney = (v: number): string => {
    if (v === undefined || v === null || isNaN(v)) return '0.00';
    return v.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const pieOption: EChartsOption = useMemo(() => {
    if (!result) return {};
    const { netSalary, socialInsurance, housingFund, incomeTax } = result;
    return {
      animation: true,
      animationDuration: 1000,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        valueFormatter: (v) => `¥${Number(v).toLocaleString()}`,
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
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: 'rgba(15, 23, 42, 0.9)',
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#e2e8f0',
            },
          },
          data: [
            { value: netSalary, name: '到手工资', itemStyle: { color: '#22d3ee' } },
            { value: socialInsurance, name: '五险一金', itemStyle: { color: '#818cf8' } },
            { value: housingFund, name: '公积金', itemStyle: { color: '#f472b6' } },
            { value: incomeTax, name: '个人所得税', itemStyle: { color: '#fbbf24' } },
          ],
        },
      ],
    };
  }, [result]);

  const totalHistoryPages = Math.max(1, Math.ceil(historyTotal / historyPageSize));

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">薪资计算器</h1>
          <p className="text-sm text-muted-foreground">
            计算税后到手收入及五险一金明细
          </p>
        </div>
      </div>

      {/* 主体：左表单 + 右结果 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 左侧表单 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">计算参数</CardTitle>
            <CardDescription>填写信息后点击计算</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">城市</Label>
              {citiesLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger id="city" className="w-full">
                    <SelectValue placeholder="选择城市" />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.map((c) => (
                      <SelectItem key={c.city} value={c.city}>
                        {c.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gross">税前月薪（元）</Label>
              <Input
                id="gross"
                type="number"
                placeholder="请输入税前月薪"
                value={grossSalary}
                onChange={(e) => setGrossSalary(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fund-ratio">公积金比例</Label>
                <Input
                  id="fund-ratio"
                  type="number"
                  step="0.01"
                  value={fundRatio}
                  onChange={(e) => setFundRatio(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">默认 0.12</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bonus">年终奖月数</Label>
                <Input
                  id="bonus"
                  type="number"
                  step="0.5"
                  value={bonusMonth}
                  onChange={(e) => setBonusMonth(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">0 表示无年终奖</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deduction">专项附加扣除（元/月）</Label>
              <Input
                id="deduction"
                type="number"
                value={specialDeduction}
                onChange={(e) => setSpecialDeduction(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">默认 1500 元</p>
            </div>

            <Button
              className="w-full"
              onClick={handleCalculate}
              disabled={calculating}
            >
              <Calculator className="h-4 w-4" />
              {calculating ? '计算中...' : '立即计算'}
            </Button>
          </CardContent>
        </Card>

        {/* 右侧结果 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">计算结果</CardTitle>
            <CardDescription>
              {result ? `城市：${result.city}` : '请填写参数后计算'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {calculating ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : result ? (
              <>
                {/* 大字展示税后到手 */}
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center">
                  <p className="text-sm text-muted-foreground">税后到手月薪</p>
                  <p className="mt-2 text-4xl font-bold text-primary">
                    ¥{formatMoney(result.netSalary)}
                  </p>
                  {result.annualNetIncome !== undefined && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      年薪税后：<span className="font-medium text-foreground">¥{formatMoney(result.annualNetIncome)}</span>
                    </p>
                  )}
                </div>

                {/* 薪资构成饼图 */}
                <div className="h-64">
                  <ReactECharts
                    option={pieOption}
                    theme={CHART_THEME}
                    style={{ height: '100%', width: '100%' }}
                  />
                </div>

                {/* 明细卡片 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Landmark className="h-4 w-4" />
                      <span>养老保险</span>
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      ¥{formatMoney(result.details.pension)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Receipt className="h-4 w-4" />
                      <span>医疗保险</span>
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      ¥{formatMoney(result.details.medical)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      <span>失业保险</span>
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      ¥{formatMoney(result.details.unemployment)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <PiggyBank className="h-4 w-4" />
                      <span>公积金</span>
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      ¥{formatMoney(result.housingFund)}
                    </p>
                  </div>
                </div>

                {/* 个税 & 税率级次 */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">个人所得税</span>
                    </div>
                    <span className="text-lg font-semibold text-primary">
                      ¥{formatMoney(result.incomeTax)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">税率级次</span>
                    <Badge variant="secondary">{result.details.taxBracket}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">专项附加扣除</span>
                    <span>¥{formatMoney(result.details.specialDeduction)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <Calculator className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  填写左侧参数后点击计算查看结果
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 历史记录 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                历史计算记录
              </CardTitle>
              <CardDescription>共 {historyTotal} 条记录</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : history.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>城市</TableHead>
                    <TableHead>税前月薪</TableHead>
                    <TableHead>五险一金</TableHead>
                    <TableHead>个税</TableHead>
                    <TableHead>税后到手</TableHead>
                    <TableHead>税率级次</TableHead>
                    <TableHead>计算时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id || item.createdAt}>
                      <TableCell>
                        <Badge variant="outline">{item.city}</Badge>
                      </TableCell>
                      <TableCell>¥{formatMoney(item.grossSalary)}</TableCell>
                      <TableCell>¥{formatMoney(item.socialInsurance + item.housingFund)}</TableCell>
                      <TableCell>¥{formatMoney(item.incomeTax)}</TableCell>
                      <TableCell className="font-medium text-primary">
                        ¥{formatMoney(item.netSalary)}
                      </TableCell>
                      <TableCell>{item.details.taxBracket}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString('zh-CN')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* 分页 */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  第 {historyPage} / {totalHistoryPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage <= 1}
                    onClick={() => {
                      const next = historyPage - 1;
                      setHistoryPage(next);
                      void fetchHistory(next);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage >= totalHistoryPages}
                    onClick={() => {
                      const next = historyPage + 1;
                      setHistoryPage(next);
                      void fetchHistory(next);
                    }}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">暂无历史记录</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryCalcPage;
