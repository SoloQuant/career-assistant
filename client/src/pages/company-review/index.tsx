import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Search,
  Star,
  ThumbsUp,
  Plus,
  Building2,
  Clock,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Filter,
  ArrowUpDown,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import {
  getReviews,
  createReview,
  markHelpful,
  getCompanyStats,
} from '@/api/company-review';
import type {
  CompanyReview,
  CreateCompanyReviewRequest,
} from '@shared/api.interface';

const CHART_THEME = 'ud';

const RATING_OPTIONS = [
  { value: 'all', label: '全部评分' },
  { value: '5', label: '5 星' },
  { value: '4', label: '4 星及以上' },
  { value: '3', label: '3 星及以上' },
  { value: '2', label: '2 星及以上' },
  { value: '1', label: '1 星' },
];

const OVERTIME_OPTIONS = [
  { value: 'all', label: '全部加班程度' },
  { value: 'no_overtime', label: '不加班' },
  { value: 'less', label: '偶尔加班' },
  { value: 'normal', label: '正常加班' },
  { value: 'serious', label: '经常加班' },
  { value: '996', label: '996 / ICU' },
];

const SORT_OPTIONS = [
  { value: 'latest', label: '最新发布' },
  { value: 'helpful', label: '最有帮助' },
  { value: 'rating_desc', label: '评分最高' },
  { value: 'rating_asc', label: '评分最低' },
];

const OVERTIME_LABEL: Record<string, string> = {
  no_overtime: '不加班',
  less: '偶尔加班',
  normal: '正常加班',
  serious: '经常加班',
  '996': '996 / ICU',
};

const EMPLOYMENT_LABEL: Record<string, string> = {
  current: '在职员工',
  former: '离职员工',
  intern: '实习生',
};

const getOvertimeColor = (level: string): string => {
  if (level === 'no_overtime') return 'bg-emerald-500';
  if (level === 'less') return 'bg-sky-500';
  if (level === 'normal') return 'bg-amber-500';
  if (level === 'serious') return 'bg-orange-500';
  if (level === '996') return 'bg-rose-500';
  return 'bg-muted-foreground';
};

const StarRating = ({
  value,
  size = 14,
}: {
  value: number;
  size?: number;
}) => {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i: number) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            className={`${filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
            style={{ width: size, height: size }}
          />
        );
      })}
    </div>
  );
};

const CompanyReviewPage = () => {
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('all');
  const [overtime, setOvertime] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [items, setItems] = useState<CompanyReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [helpfulMap, setHelpfulMap] = useState<Record<string, boolean>>({});

  // 写评价表单
  const [formData, setFormData] = useState<CreateCompanyReviewRequest>({
    companyName: '',
    overallRating: 5,
    workLifeBalanceRating: 5,
    salaryRating: 5,
    growthRating: 5,
    cultureRating: 5,
    overtimeLevel: 'normal',
    realSalary: '',
    interviewExperience: '',
    pros: '',
    cons: '',
    jobTitle: '',
    employmentStatus: 'current',
    isAnonymous: false,
  });

  // 公司统计弹窗
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsData, setStatsData] = useState<{
    companyName: string;
    reviewCount: number;
    avgOverallRating: number;
    avgWorkLifeBalanceRating: number;
    avgSalaryRating: number;
    avgGrowthRating: number;
    avgCultureRating: number;
  } | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        pageSize: number;
        companyName?: string;
        overallRating?: number;
        overtimeLevel?: string;
        sortBy?: string;
      } = { page, pageSize };
      if (search.trim()) params.companyName = search.trim();
      if (rating !== 'all') params.overallRating = Number(rating);
      if (overtime !== 'all') params.overtimeLevel = overtime;
      if (sortBy) params.sortBy = sortBy;

      const res = await getReviews(params);
      setItems(res?.items || []);
      setTotal(res?.total || 0);
    } catch (err) {
      logger.error('fetch company reviews failed', err);
      toast.error('加载公司评价失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, rating, overtime, sortBy]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const handleMarkHelpful = async (id: string) => {
    if (helpfulMap[id]) return;
    try {
      const res = await markHelpful(id);
      setHelpfulMap((prev) => ({ ...prev, [id]: true }));
      setItems((prev) =>
        prev.map((it: CompanyReview) =>
          it.id === id ? { ...it, helpfulCount: res.helpfulCount } : it,
        ),
      );
      toast.success('感谢你的反馈');
    } catch (err) {
      logger.error('mark helpful failed', err);
      toast.error('操作失败，请稍后重试');
    }
  };

  const handleSubmitReview = async () => {
    if (!formData.companyName.trim()) {
      toast.error('请输入公司名称');
      return;
    }
    setSubmitting(true);
    try {
      await createReview(formData);
      toast.success('评价提交成功');
      setDialogOpen(false);
      setFormData({
        companyName: '',
        overallRating: 5,
        workLifeBalanceRating: 5,
        salaryRating: 5,
        growthRating: 5,
        cultureRating: 5,
        overtimeLevel: 'normal',
        realSalary: '',
        interviewExperience: '',
        pros: '',
        cons: '',
        jobTitle: '',
        employmentStatus: 'current',
        isAnonymous: false,
      });
      void fetchReviews();
    } catch (err) {
      logger.error('create review failed', err);
      toast.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewCompanyStats = async (companyName: string) => {
    setStatsOpen(true);
    setStatsData(null);
    setStatsLoading(true);
    try {
      const res = await getCompanyStats(companyName);
      setStatsData(res);
    } catch (err) {
      logger.error('fetch company stats failed', err);
      toast.error('加载公司统计失败');
    } finally {
      setStatsLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const RatingBar = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="w-20 text-muted-foreground">{label}</span>
      <div className="flex-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${(value / 5) * 100}%` }}
          />
        </div>
      </div>
      <span className="w-8 text-right font-medium">{value.toFixed(1)}</span>
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">公司评价库</h1>
          <p className="text-sm text-muted-foreground">
            来自真实员工的一手公司评价，帮你做出更好的职业选择
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          写评价
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索公司名称..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <Select
                value={rating}
                onValueChange={(v) => {
                  setRating(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="综合评分" />
                </SelectTrigger>
                <SelectContent>
                  {RATING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Select
                value={overtime}
                onValueChange={(v) => {
                  setOvertime(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="加班程度" />
                </SelectTrigger>
                <SelectContent>
                  {OVERTIME_OPTIONS.map((opt) => (
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
              共 {total} 条评价
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i: number) => (
            <Card
              key={i}
              className="border-border/60 bg-card/80 backdrop-blur"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : items.length === 0 ? (
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-base font-medium">暂无评价</p>
              <p className="mt-1 text-sm text-muted-foreground">
                还没有符合条件的评价，来写第一条吧
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                写评价
              </Button>
            </CardContent>
          </Card>
        ) : (
          items.map((review: CompanyReview) => (
            <Card
              key={review.id}
              className="border-border/60 bg-card/80 backdrop-blur transition-all hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-sm text-primary">
                      {review.isAnonymous
                        ? '匿'
                        : review.jobTitle
                          ? review.jobTitle.charAt(0)
                          : '用'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() =>
                              handleViewCompanyStats(review.companyName)
                            }
                            className="flex items-center gap-1.5 text-base font-semibold hover:text-primary"
                          >
                            <Building2 className="h-4 w-4 text-primary" />
                            {review.companyName}
                          </button>
                          <Badge variant="secondary" className="gap-1">
                            <span className="text-base font-bold text-amber-500">
                              {review.overallRating.toFixed(1)}
                            </span>
                            <StarRating value={review.overallRating} />
                          </Badge>
                          {review.overtimeLevel && (
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${getOvertimeColor(
                                  review.overtimeLevel,
                                )}`}
                              />
                              {OVERTIME_LABEL[review.overtimeLevel] ||
                                review.overtimeLevel}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {review.jobTitle && <span>{review.jobTitle}</span>}
                          {review.employmentStatus && (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-muted/50 px-1.5 py-0 text-[10px] font-normal"
                            >
                              {EMPLOYMENT_LABEL[review.employmentStatus] ||
                                review.employmentStatus}
                            </Badge>
                          )}
                          {review.isAnonymous && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              匿名
                            </span>
                          )}
                          <span>
                            {new Date(
                              review.createdAt,
                            ).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dimension ratings */}
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {review.workLifeBalanceRating !== undefined && (
                        <RatingBar
                          label="工作生活平衡"
                          value={review.workLifeBalanceRating}
                        />
                      )}
                      {review.salaryRating !== undefined && (
                        <RatingBar
                          label="薪资待遇"
                          value={review.salaryRating}
                        />
                      )}
                      {review.growthRating !== undefined && (
                        <RatingBar
                          label="成长空间"
                          value={review.growthRating}
                        />
                      )}
                      {review.cultureRating !== undefined && (
                        <RatingBar
                          label="公司文化"
                          value={review.cultureRating}
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {review.realSalary && (
                        <div className="rounded-lg bg-muted/40 p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <DollarSign className="h-3.5 w-3.5" />
                            真实薪资
                          </div>
                          <div className="mt-1 text-sm font-medium">
                            {review.realSalary}
                          </div>
                        </div>
                      )}
                      {review.interviewExperience && (
                        <div className="rounded-lg bg-muted/40 p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <TrendingUp className="h-3.5 w-3.5" />
                            面试经验
                          </div>
                          <div className="mt-1 line-clamp-2 text-sm">
                            {review.interviewExperience}
                          </div>
                        </div>
                      )}
                    </div>

                    {review.pros && (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-emerald-600">
                          优点
                        </div>
                        <p className="mt-1 text-sm text-foreground/80">
                          {review.pros}
                        </p>
                      </div>
                    )}

                    {review.cons && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-rose-600">
                          缺点
                        </div>
                        <p className="mt-1 text-sm text-foreground/80">
                          {review.cons}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {review.helpfulCount} 人觉得有帮助
                      </div>
                      <Button
                        variant={helpfulMap[review.id] ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleMarkHelpful(review.id)}
                        disabled={helpfulMap[review.id]}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {helpfulMap[review.id] ? '已标记' : '有帮助'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Write Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>写公司评价</DialogTitle>
            <DialogDescription>
              分享你的真实体验，帮助更多求职者做出更好的选择
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>公司名称 *</Label>
              <Input
                placeholder="请输入公司全称"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, companyName: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>你的岗位</Label>
                <Input
                  placeholder="如：前端工程师"
                  value={formData.jobTitle || ''}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, jobTitle: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>在职状态</Label>
                <Select
                  value={formData.employmentStatus || 'current'}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, employmentStatus: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">在职员工</SelectItem>
                    <SelectItem value="former">离职员工</SelectItem>
                    <SelectItem value="intern">实习生</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>综合评分：{formData.overallRating} 星</Label>
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={formData.overallRating}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    overallRating: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'workLifeBalanceRating', label: '工作生活平衡' },
                { key: 'salaryRating', label: '薪资待遇' },
                { key: 'growthRating', label: '成长空间' },
                { key: 'cultureRating', label: '公司文化' },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                  <Label className="text-xs">
                    {item.label}：
                    {String(
                      formData[item.key as keyof CreateCompanyReviewRequest],
                    )}
                    星
                  </Label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.5}
                    value={String(
                      formData[item.key as keyof CreateCompanyReviewRequest],
                    )}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        [item.key]: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>加班程度</Label>
                <Select
                  value={formData.overtimeLevel || 'normal'}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, overtimeLevel: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_overtime">不加班</SelectItem>
                    <SelectItem value="less">偶尔加班</SelectItem>
                    <SelectItem value="normal">正常加班</SelectItem>
                    <SelectItem value="serious">经常加班</SelectItem>
                    <SelectItem value="996">996 / ICU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>真实薪资</Label>
                <Input
                  placeholder="如：25k * 16 薪"
                  value={formData.realSalary || ''}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, realSalary: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>优点</Label>
              <textarea
                className="min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20"
                placeholder="公司有哪些优点？"
                value={formData.pros || ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, pros: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>缺点</Label>
              <textarea
                className="min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20"
                placeholder="公司有哪些不足？"
                value={formData.cons || ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, cons: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>面试经验</Label>
              <textarea
                className="min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20"
                placeholder="面试流程、难度、问题等"
                value={formData.interviewExperience || ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    interviewExperience: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={formData.isAnonymous}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    isAnonymous: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              <Label htmlFor="anonymous" className="cursor-pointer text-sm">
                匿名发布
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleSubmitReview} disabled={submitting}>
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              提交评价
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Stats Dialog */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {statsData?.companyName || '公司评价汇总'}
            </DialogTitle>
            <DialogDescription>
              {statsLoading
                ? '加载中...'
                : `共 ${statsData?.reviewCount || 0} 条评价`}
            </DialogDescription>
          </DialogHeader>

          {statsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          ) : statsData ? (
            <div className="space-y-5">
              <div className="flex items-center justify-center gap-4 rounded-lg bg-primary/5 p-5">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">
                    {statsData.avgOverallRating.toFixed(1)}
                  </div>
                  <div className="mt-1">
                    <StarRating
                      value={statsData.avgOverallRating}
                      size={16}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    综合评分
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <RatingBar
                  label="工作生活平衡"
                  value={statsData.avgWorkLifeBalanceRating}
                />
                <RatingBar
                  label="薪资待遇"
                  value={statsData.avgSalaryRating}
                />
                <RatingBar
                  label="成长空间"
                  value={statsData.avgGrowthRating}
                />
                <RatingBar
                  label="公司文化"
                  value={statsData.avgCultureRating}
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              暂无数据
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatsOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyReviewPage;
