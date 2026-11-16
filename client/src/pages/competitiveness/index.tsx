import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Target,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Play,
  Award,
  AlertCircle,
  Loader2,
  Radar,
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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

import { getCompetitivenessAnalysis } from '@/api/industry-trend';
import type { CompetitivenessAnalysis } from '@shared/api.interface';

const CHART_THEME = 'ud';

const JOB_OPTIONS = [
  { value: 'data_analyst', label: '数据分析师' },
  { value: 'data_engineer', label: '数据工程师' },
  { value: 'data_scientist', label: '数据科学家' },
  { value: 'backend_engineer', label: '后端工程师' },
  { value: 'frontend_engineer', label: '前端工程师' },
  { value: 'product_manager', label: '产品经理' },
  { value: 'finance_analyst', label: '金融分析师' },
];

const JOB_LABEL_MAP: Record<string, string> = JOB_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);

const getScoreLevel = (score: number): { label: string; color: string; bg: string } => {
  if (score >= 80) return { label: '竞争力很强', color: 'text-emerald-600', bg: 'bg-emerald-500' };
  if (score >= 60) return { label: '竞争力良好', color: 'text-sky-600', bg: 'bg-sky-500' };
  if (score >= 40) return { label: '竞争力一般', color: 'text-amber-600', bg: 'bg-amber-500' };
  return { label: '需要加强', color: 'text-rose-600', bg: 'bg-rose-500' };
};

const CompetitivenessPage = () => {
  const [targetJob, setTargetJob] = useState('data_analyst');
  const [data, setData] = useState<CompetitivenessAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCompetitivenessAnalysis(targetJob);
      setData(res);
      setHasAnalyzed(true);
    } catch (err) {
      logger.error('fetch competitiveness analysis failed', err);
      toast.error('竞争力分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [targetJob]);

  // 初始化时自动分析一次
  useEffect(() => {
    void handleAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const radarOption: EChartsOption = useMemo(() => {
    if (!data?.skillRadarData?.indicators?.length) return {};
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
        indicator: data.skillRadarData.indicators.map((name: string) => ({
          name,
          max: 100,
        })),
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
              value: data.skillRadarData.requiredData || [],
              name: '岗位要求',
              lineStyle: { color: '#f59e0b', width: 2 },
              itemStyle: { color: '#f59e0b' },
              areaStyle: { color: 'rgba(245, 158, 11, 0.15)' },
            },
            {
              value: data.skillRadarData.userData || [],
              name: '我的水平',
              lineStyle: { color: '#3b82f6', width: 2.5 },
              itemStyle: { color: '#3b82f6' },
              areaStyle: { color: 'rgba(59, 130, 246, 0.25)' },
            },
          ],
        },
      ],
    };
  }, [data]);

  const scoreLevel = data ? getScoreLevel(data.overallScore) : null;

  // 圆环进度
  const scorePercent = data?.overallScore || 0;

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">竞争力分析</h1>
        <p className="text-sm text-muted-foreground">
          分析你的技能与目标岗位的匹配度，找到优势和短板
        </p>
      </div>

      {/* Filter bar */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground">目标岗位</Label>
              <Select value={targetJob} onValueChange={setTargetJob}>
                <SelectTrigger className="w-44">
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
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              开始分析
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl lg:col-span-2" />
        </div>
      ) : !hasAnalyzed || !data ? (
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Target className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-base font-medium">选择目标岗位开始分析</p>
            <p className="mt-1 text-sm text-muted-foreground">
              我们将对比你的技能和岗位要求，给出竞争力评估报告
            </p>
            <Button className="mt-4" onClick={handleAnalyze}>
              <Play className="h-4 w-4" />
              开始分析
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Score + Radar Row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Overall score */}
            <Card className="border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Badge variant="outline" className="bg-background/50">
                  <Target className="mr-1 h-3 w-3" />
                  综合竞争力
                </Badge>
                <div className="relative my-5 flex h-40 w-40 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-primary/10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={`${scorePercent * 2.64} 264`}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-primary">
                      {data.overallScore}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / 100 分
                    </span>
                  </div>
                </div>
                <div className={`text-base font-semibold ${scoreLevel?.color}`}>
                  {scoreLevel?.label}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  目标岗位：{JOB_LABEL_MAP[data.targetJob] || data.targetJob}
                </p>
                <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-background/60 p-2">
                    <div className="text-sm font-bold text-emerald-600">
                      {data.strengths?.length || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      优势技能
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/60 p-2">
                    <div className="text-sm font-bold text-amber-600">
                      {data.weaknesses?.length || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      待提升
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/60 p-2">
                    <div className="text-sm font-bold text-rose-600">
                      {data.missingSkills?.length || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      缺失技能
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Radar chart */}
            <Card className="border-border/60 bg-card/80 backdrop-blur lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Radar className="h-4 w-4 text-primary" />
                  技能雷达图
                </CardTitle>
                <CardDescription className="text-xs">
                  对比你的技能水平与岗位要求
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ReactECharts
                  option={radarOption}
                  theme={CHART_THEME}
                  style={{ height: 320, width: '100%' }}
                  notMerge
                  lazyUpdate
                />
              </CardContent>
            </Card>
          </div>

          {/* Strengths + Weaknesses */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Strengths */}
            <Card className="border-border/60 bg-card/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  优势技能
                </CardTitle>
                <CardDescription className="text-xs">
                  你的水平超过或达到岗位要求的技能
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {data.strengths && data.strengths.length > 0 ? (
                  <div className="space-y-3">
                    {data.strengths.map(
                      (s: { name: string; userLevel: number; requiredLevel: number; gap: number }) => (
                        <div
                          key={s.name}
                          className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-emerald-500" />
                              <span className="font-medium">{s.name}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-100 text-emerald-700"
                            >
                              {s.gap >= 0 ? '+' : ''}
                              {s.gap}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              你的水平：
                              <span className="font-semibold text-emerald-600">
                                {s.userLevel}
                              </span>
                            </span>
                            <span>
                              要求：{s.requiredLevel}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    暂无优势技能数据
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card className="border-border/60 bg-card/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  需提升技能
                </CardTitle>
                <CardDescription className="text-xs">
                  与岗位要求有差距，需要加强的技能
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {data.weaknesses && data.weaknesses.length > 0 ? (
                  <div className="space-y-3">
                    {data.weaknesses.map(
                      (w: { name: string; userLevel: number; requiredLevel: number; gap: number }) => {
                        const progress = w.requiredLevel > 0
                          ? Math.round((w.userLevel / w.requiredLevel) * 100)
                          : 0;
                        return (
                          <div key={w.name} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{w.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {w.userLevel} / {w.requiredLevel}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>差距：{w.gap}</span>
                              <span className="text-amber-600">
                                优先提升
                              </span>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    暂无待提升技能
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Missing skills + Suggestions */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Missing skills */}
            <Card className="border-border/60 bg-card/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <XCircle className="h-4 w-4 text-rose-500" />
                  缺失技能
                </CardTitle>
                <CardDescription className="text-xs">
                  岗位要求但你还没掌握的技能
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {data.missingSkills && data.missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.missingSkills.map((skill: string) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="border-rose-200 bg-rose-50 text-rose-700"
                      >
                        <AlertCircle className="mr-1 h-3 w-3" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    无缺失技能，继续保持！
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suggestions */}
            <Card className="border-border/60 bg-card/80 backdrop-blur lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  提升建议
                </CardTitle>
                <CardDescription className="text-xs">
                  按优先级排列的针对性提升方案
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {data.improvementSuggestions &&
                data.improvementSuggestions.length > 0 ? (
                  <ul className="space-y-3">
                    {data.improvementSuggestions.map(
                      (s: string, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-3"
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              i === 0
                                ? 'bg-rose-500 text-white'
                                : i === 1
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-primary text-white'
                            }`}
                          >
                            {i + 1}
                          </span>
                          <div className="text-sm text-foreground/80">
                            {s}
                          </div>
                        </li>
                      ),
                    )}
                  </ul>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    暂无提升建议
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default CompetitivenessPage;
