import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  BookX,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  Target,
  Brain,
  AlertCircle,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Filter,
  BookmarkCheck,
  RefreshCw,
} from 'lucide-react';
import type {
  WrongQuestionItem,
  WrongQuestionListResponse,
  UpdateWrongQuestionRequest,
} from '@shared/api.interface';
import {
  getWrongQuestions,
  getWrongQuestionDetail,
  practice,
  markMastered,
  removeWrongQuestion,
  getWrongQuestionStats,
} from '@/api/wrong-question';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const SOURCE_LABELS: Record<string, string> = {
  interview: '面试',
  exam: '笔试',
};

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  interview: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-500',
    border: 'border-blue-500/30',
  },
  exam: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-500',
    border: 'border-violet-500/30',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: '技术',
  hr: 'HR',
  behavior: '行为',
  aptitude: '行测',
  programming: '编程',
};

const WrongQuestionPage = () => {
  // Stats
  const [stats, setStats] = useState<{
    totalCount: number;
    masteredCount: number;
    reviewCount: number;
    byCategory: { category: string; count: number }[];
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // List
  const [items, setItems] = useState<WrongQuestionItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);

  // Filters
  const [source, setSource] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [masterLevel, setMasterLevel] = useState<string>('all');

  // Detail
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, WrongQuestionItem>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  // Practice
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [practiceAnswer, setPracticeAnswer] = useState<string>('');
  const [practiceOpen, setPracticeOpen] = useState<boolean>(false);
  const [practicing, setPracticing] = useState<boolean>(false);
  const [practiceResult, setPracticeResult] = useState<WrongQuestionItem | null>(null);

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Mark action
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getWrongQuestionStats();
      setStats(data);
    } catch (error) {
      logger.error('加载错题统计失败', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; pageSize: number; source?: string; category?: string; masterLevel?: string } = {
        page,
        pageSize,
      };
      if (source !== 'all') params.source = source;
      if (category !== 'all') params.category = category;
      if (masterLevel !== 'all') params.masterLevel = masterLevel;
      const data: WrongQuestionListResponse = await getWrongQuestions(params);
      setItems(data.items);
      setTotal(data.total);
    } catch (error) {
      logger.error('加载错题列表失败', error);
      toast.error('加载错题列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, source, category, masterLevel]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const handleToggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailMap[id]) {
      setLoadingDetailId(id);
      try {
        const data = await getWrongQuestionDetail(id);
        setDetailMap((prev) => ({ ...prev, [id]: data }));
      } catch (error) {
        logger.error('加载错题详情失败', error);
        toast.error('加载详情失败');
      } finally {
        setLoadingDetailId(null);
      }
    }
  };

  const handleMarkMastered = async (id: string, mastered: boolean) => {
    setActionId(id);
    try {
      const data = await markMastered(id, { masterLevel: mastered ? 'mastered' : 'review' });
      setItems((prev) =>
        prev.map((item: WrongQuestionItem) => (item.id === id ? { ...item, isMastered: mastered } : item)),
      );
      setDetailMap((prev) =>
        prev[id] ? { ...prev, [id]: { ...prev[id], isMastered: mastered } } : prev,
      );
      void fetchStats();
      toast.success(mastered ? '已标记为掌握' : '已标记为待复习');
    } catch (error) {
      logger.error('标记掌握状态失败', error);
      toast.error('操作失败');
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (id: string) => {
    setDeleting(true);
    try {
      await removeWrongQuestion(id);
      setItems((prev) => prev.filter((item: WrongQuestionItem) => item.id !== id));
      setTotal((prev) => prev - 1);
      setDeleteConfirmId(null);
      if (expandedId === id) setExpandedId(null);
      void fetchStats();
      toast.success('已移出错题本');
    } catch (error) {
      logger.error('移出错题本失败', error);
      toast.error('移除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenPractice = (item: WrongQuestionItem) => {
    setPracticeId(item.id);
    setPracticeAnswer('');
    setPracticeResult(null);
    setPracticeOpen(true);
  };

  const handleSubmitPractice = async () => {
    if (!practiceId || !practiceAnswer.trim()) {
      toast.warning('请输入你的答案');
      return;
    }
    setPracticing(true);
    try {
      const data = await practice(practiceId);
      setPracticeResult(data);
      // Refresh list and stats
      void fetchList();
      void fetchStats();
      toast.success('练习完成');
    } catch (error) {
      logger.error('练习提交失败', error);
      toast.error('提交失败');
    } finally {
      setPracticing(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const sourceStyle = (s: string) =>
    SOURCE_COLORS[s] ?? SOURCE_COLORS.interview;
  const sourceLabel = (s: string) => SOURCE_LABELS[s] ?? s;
  const catLabel = (c: string) => CATEGORY_LABELS[c] ?? c;

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: '总错题数',
        value: stats.totalCount,
        icon: BookX,
        color: 'text-primary',
        bg: 'bg-primary/15',
      },
      {
        label: '已掌握',
        value: stats.masteredCount,
        icon: BookmarkCheck,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/15',
      },
      {
        label: '待复习',
        value: stats.reviewCount,
        icon: Clock,
        color: 'text-amber-500',
        bg: 'bg-amber-500/15',
      },
    ];
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-xl font-semibold">错题本</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          收集错题，针对性复习，巩固薄弱知识点
        </p>
      </div>

      {/* 统计卡片 */}
      {statsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-ai-section-type="card-stat">
          {Array.from({ length: 3 }).map((_, i: number) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="mb-2 h-4 w-16" />
                <Skeleton className="h-7 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-ai-section-type="card-stat">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(0_0_0_0.3)]"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className={`mt-1 text-2xl font-bold font-mono ${card.color}`}>
                        {card.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg} ${card.color} transition-all group-hover:scale-110`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* 按类别分布 */}
      {stats && stats.byCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">按类别分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.byCategory.map((cat: { category: string; count: number }) => (
                <Badge key={cat.category} variant="secondary" className="px-3 py-1 text-xs">
                  {catLabel(cat.category)}：{cat.count} 题
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 筛选区 */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            筛选条件
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                来源
              </label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部来源" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部来源</SelectItem>
                  <SelectItem value="interview">面试</SelectItem>
                  <SelectItem value="exam">笔试</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                分类
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  <SelectItem value="technical">技术</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="behavior">行为</SelectItem>
                  <SelectItem value="aptitude">行测</SelectItem>
                  <SelectItem value="programming">编程</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                掌握状态
              </label>
              <Select value={masterLevel} onValueChange={setMasterLevel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="mastered">已掌握</SelectItem>
                  <SelectItem value="review">待复习</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错题列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i: number) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="mb-3 h-5 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookX className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">暂无错题</p>
            <p className="mt-1 text-xs">答错的题目会自动收录到这里</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item: WrongQuestionItem) => {
            const isExpanded = expandedId === item.id;
            const detail = detailMap[item.id] ?? item;
            const sStyle = sourceStyle(item.sourceType);
            const isLoadingDetail = loadingDetailId === item.id;

            return (
              <Card
                key={item.id}
                className="overflow-hidden transition-all duration-200 hover:border-primary/40"
              >
                <CardContent
                  className="cursor-pointer p-5"
                  onClick={() => void handleToggleExpand(item.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-base font-medium leading-snug">
                        {item.questionTitle}
                      </h3>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`font-normal ${sStyle.bg} ${sStyle.text} ${sStyle.border}`}
                        >
                          {sourceLabel(item.sourceType)}
                        </Badge>
                        {item.category && (
                          <Badge variant="secondary" className="font-normal">
                            {catLabel(item.category)}
                          </Badge>
                        )}
                        <Badge variant="outline" className="font-normal">
                          错 {item.wrongCount} 次
                        </Badge>
                        {item.isMastered ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-normal"
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            已掌握
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 bg-amber-500/10 text-amber-500 font-normal"
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            待复习
                          </Badge>
                        )}
                        {item.tags.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    <span>上次错误：{new Date(item.lastWrongAt).toLocaleDateString('zh-CN')}</span>
                    <span>点击{isExpanded ? '收起' : '展开'}详情</span>
                  </div>
                </CardContent>

                {/* 展开详情 */}
                {isExpanded && (
                  <div className="border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                    {isLoadingDetail ? (
                      <div className="p-5 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : (
                      <div className="p-5 space-y-4">
                        {detail.questionContent && (
                          <div>
                            <h4 className="mb-1.5 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                              <BookX className="h-4 w-4" />
                              题目内容
                            </h4>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {detail.questionContent}
                            </p>
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                            <h4 className="mb-1.5 text-sm font-medium text-red-600 flex items-center gap-1.5">
                              <AlertCircle className="h-4 w-4" />
                              我的答案
                            </h4>
                            <p className="text-sm">{detail.userAnswer || '未作答'}</p>
                          </div>
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <h4 className="mb-1.5 text-sm font-medium text-emerald-600 flex items-center gap-1.5">
                              <CheckCircle className="h-4 w-4" />
                              正确答案
                            </h4>
                            <p className="text-sm">{detail.correctAnswer || '暂无'}</p>
                          </div>
                        </div>

                        {detail.analysis && (
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                            <h4 className="mb-1.5 text-sm font-medium text-amber-600 flex items-center gap-1.5">
                              <Lightbulb className="h-4 w-4" />
                              解析
                            </h4>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {detail.analysis}
                            </p>
                          </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleOpenPractice(item)}
                            data-ai-section-type="button"
                          >
                            <Brain className="h-4 w-4" />
                            练习
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleMarkMastered(item.id, !item.isMastered)}
                            disabled={actionId === item.id}
                            data-ai-section-type="button"
                            className={
                              item.isMastered
                                ? 'border-amber-500/30 text-amber-600 hover:bg-amber-500/10'
                                : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
                            }
                          >
                            {actionId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : item.isMastered ? (
                              <RefreshCw className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5" />
                            )}
                            {item.isMastered ? '标记待复习' : '标记掌握'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirmId(item.id)}
                            data-ai-section-type="button"
                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            移除
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {total} 道错题，第 {page} / {totalPages} 页
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 练习对话框 */}
      <Dialog open={practiceOpen} onOpenChange={setPracticeOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              错题练习
            </DialogTitle>
            <DialogDescription>
              重新作答，检验是否真正掌握
            </DialogDescription>
          </DialogHeader>

          {practiceResult ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium text-emerald-600">练习完成</span>
                </div>
                <p className="mt-2 text-sm text-foreground/80">
                  这道题已记录你的练习情况，记得定期复习巩固哦。
                </p>
              </div>
              {practiceResult.correctAnswer && (
                <div>
                  <p className="mb-1 text-sm font-medium text-muted-foreground">正确答案</p>
                  <p className="font-mono text-sm">{practiceResult.correctAnswer}</p>
                </div>
              )}
              {practiceResult.analysis && (
                <div>
                  <p className="mb-1 text-sm font-medium text-muted-foreground">解析</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {practiceResult.analysis}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">题目</p>
                <p className="text-base leading-relaxed">
                  {detailMap[practiceId ?? '']?.questionTitle ||
                    items.find((i: WrongQuestionItem) => i.id === practiceId)?.questionTitle}
                </p>
              </div>
              {detailMap[practiceId ?? '']?.questionContent && (
                <div>
                  <p className="mb-1 text-sm font-medium text-muted-foreground">题目内容</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {detailMap[practiceId ?? '']?.questionContent}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>你的答案</Label>
                <Textarea
                  value={practiceAnswer}
                  onChange={(e) => setPracticeAnswer(e.target.value)}
                  placeholder="请输入你的答案..."
                  className="min-h-[120px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPracticeOpen(false)}>
              {practiceResult ? '关闭' : '取消'}
            </Button>
            {!practiceResult && (
              <Button
                onClick={() => void handleSubmitPractice()}
                disabled={practicing || !practiceAnswer.trim()}
                data-ai-section-type="button"
              >
                {practicing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Target className="h-4 w-4" />
                )}
                提交答案
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认移除</DialogTitle>
            <DialogDescription>
              将这道题从错题本中移除，确定吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && void handleRemove(deleteConfirmId)}
              disabled={deleting}
              data-ai-section-type="button"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              确认移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WrongQuestionPage;
