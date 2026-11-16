import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Star,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
  BookOpen,
  FileQuestion,
  Trophy,
  BookmarkX,
  Loader2,
  StickyNote,
} from 'lucide-react';
import type {
  InterviewQuestionWithRecord,
  InterviewListParams,
  InterviewStats,
  UpdateInterviewRecordRequest,
} from '@shared/api.interface';
import {
  getQuestionList,
  getInterviewStats,
  updateRecord,
  getCategories,
} from '@/api/interview';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORY_LABELS: Record<string, string> = {
  technical: '技术题',
  behavior: '行为题',
  hr: 'HR 题',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  easy: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
  },
  medium: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-500',
    border: 'border-amber-500/30',
  },
  hard: {
    bg: 'bg-red-500/15',
    text: 'text-red-500',
    border: 'border-red-500/30',
  },
};

type TabKey = 'all' | 'favorite' | 'wrong';

const InterviewPage = () => {
  const [questions, setQuestions] = useState<InterviewQuestionWithRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<InterviewStats | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [jobType, setJobType] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');

  // Options
  const [categories, setCategories] = useState<string[]>([]);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState<boolean>(true);

  // Note state per expanded card (local draft)
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [savingRecord, setSavingRecord] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data: InterviewStats = await getInterviewStats();
      setStats(data);
    } catch (error) {
      logger.error('加载面试统计失败', error);
      toast.error('加载统计数据失败');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const data = await getCategories();
      setCategories(data.categories);
      setJobTypes(data.jobTypes);
      setDifficulties(data.difficulties);
    } catch (error) {
      logger.error('加载筛选选项失败', error);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params: InterviewListParams = {
        page: 1,
        pageSize: 50,
      };
      if (jobType !== 'all') params.jobType = jobType;
      if (category !== 'all') params.category = category;
      if (difficulty !== 'all') params.difficulty = difficulty;
      if (keyword.trim()) params.keyword = keyword.trim();
      if (activeTab === 'favorite') params.isFavorite = true;
      if (activeTab === 'wrong') params.isWrong = true;

      const data = await getQuestionList(params);
      setQuestions(data.items);
      setTotal(data.total);
    } catch (error) {
      logger.error('加载面试题列表失败', error);
      toast.error('加载题目列表失败');
    } finally {
      setLoading(false);
    }
  }, [jobType, category, difficulty, keyword, activeTab]);

  useEffect(() => {
    void fetchStats();
    void fetchCategories();
  }, [fetchStats, fetchCategories]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  const handleToggleExpand = (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next) {
      const q = questions.find((item) => item.id === id);
      setNoteDraft(q?.record?.note ?? '');
    }
  };

  const updateQuestionRecord = (
    id: string,
    patch: Partial<InterviewQuestionWithRecord['record']>,
  ) => {
    setQuestions((prev) =>
      prev.map((q: InterviewQuestionWithRecord) => {
        if (q.id !== id) return q;
        return {
          ...q,
          record: {
            ...(q.record ?? {
              id: '',
              questionId: id,
              status: 'unattempted' as const,
              isFavorite: false,
              isWrong: false,
              userAnswer: '',
              note: '',
              attemptCount: 0,
            }),
            ...patch,
          },
        };
      }),
    );
  };

  const handleToggleFavorite = async (q: InterviewQuestionWithRecord) => {
    const newFav = !q.record?.isFavorite;
    // Optimistic update
    updateQuestionRecord(q.id, { isFavorite: newFav });
    setSavingRecord(q.id);
    try {
      await updateRecord(q.id, { isFavorite: newFav } as UpdateInterviewRecordRequest);
      void fetchStats();
      toast.success(newFav ? '已收藏' : '已取消收藏');
    } catch (error) {
      logger.error('切换收藏失败', error);
      updateQuestionRecord(q.id, { isFavorite: !newFav });
      toast.error('操作失败');
    } finally {
      setSavingRecord(null);
    }
  };

  const handleMarkCorrect = async (q: InterviewQuestionWithRecord) => {
    updateQuestionRecord(q.id, { status: 'correct' });
    setSavingRecord(q.id);
    try {
      await updateRecord(q.id, { status: 'correct' } as UpdateInterviewRecordRequest);
      void fetchStats();
      toast.success('已标记为答对');
    } catch (error) {
      logger.error('标记正确失败', error);
      toast.error('操作失败');
    } finally {
      setSavingRecord(null);
    }
  };

  const handleMarkWrong = async (q: InterviewQuestionWithRecord) => {
    updateQuestionRecord(q.id, { status: 'wrong', isWrong: true });
    setSavingRecord(q.id);
    try {
      await updateRecord(q.id, {
        status: 'wrong',
        isWrong: true,
      } as UpdateInterviewRecordRequest);
      void fetchStats();
      toast.success('已标记为答错');
    } catch (error) {
      logger.error('标记错误失败', error);
      toast.error('操作失败');
    } finally {
      setSavingRecord(null);
    }
  };

  const handleSaveNote = async (q: InterviewQuestionWithRecord) => {
    setSavingRecord(q.id);
    try {
      await updateRecord(q.id, { note: noteDraft } as UpdateInterviewRecordRequest);
      updateQuestionRecord(q.id, { note: noteDraft });
      toast.success('笔记已保存');
    } catch (error) {
      logger.error('保存笔记失败', error);
      toast.error('保存笔记失败');
    } finally {
      setSavingRecord(null);
    }
  };

  const statsCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: '总题数',
        value: stats.totalQuestions,
        icon: FileQuestion,
        color: 'text-primary',
        bg: 'bg-primary/15',
      },
      {
        label: '已做题',
        value: stats.attempted,
        icon: BookOpen,
        color: 'text-blue-500',
        bg: 'bg-blue-500/15',
      },
      {
        label: '正确率',
        value: `${stats.correctRate}%`,
        icon: Trophy,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/15',
      },
      {
        label: '收藏数',
        value: stats.favorite,
        icon: Star,
        color: 'text-amber-500',
        bg: 'bg-amber-500/15',
      },
      {
        label: '错题数',
        value: stats.wrong,
        icon: BookmarkX,
        color: 'text-red-500',
        bg: 'bg-red-500/15',
      },
    ];
  }, [stats]);

  const getStatusBadge = (record: InterviewQuestionWithRecord['record']) => {
    if (!record || record.status === 'unattempted') {
      return <Badge variant="outline" className="text-muted-foreground">未做</Badge>;
    }
    if (record.status === 'correct') {
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
        >
          <CheckCircle className="mr-1 h-3 w-3" />
          答对
        </Badge>
      );
    }
    if (record.status === 'wrong') {
      return (
        <Badge
          variant="outline"
          className="border-red-500/30 bg-red-500/10 text-red-500"
        >
          <XCircle className="mr-1 h-3 w-3" />
          答错
        </Badge>
      );
    }
    return null;
  };

  const categoryLabel = (cat: string) => CATEGORY_LABELS[cat] ?? cat;
  const diffStyle = (diff: string) =>
    DIFFICULTY_COLORS[diff] ?? DIFFICULTY_COLORS.easy;
  const diffLabel = (diff: string) => DIFFICULTY_LABELS[diff] ?? diff;

  return (
    <div className="space-y-6" data-ai-section-type="card-list">
      {/* 标题 */}
      <div>
        <h2 className="text-xl font-semibold">面试题库</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          刷题练习，记录你的答题进度与笔记
        </p>
      </div>

      {/* 统计卡片 */}
      {statsLoading ? (
        <div
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
          data-ai-section-type="card-stat"
        >
          {Array.from({ length: 5 }).map((_, i: number) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="mb-2 h-4 w-16" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
          data-ai-section-type="card-stat"
        >
          {statsCards.map((card) => {
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
                      <p
                        className={`mt-1 text-2xl font-bold font-mono ${card.color}`}
                      >
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

      {/* 筛选区 */}
      <Card>
        <CardContent className="p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                岗位类型
              </label>
              <Select value={jobType} onValueChange={setJobType} disabled={optionsLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部岗位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部岗位</SelectItem>
                  {jobTypes.map((jt) => (
                    <SelectItem key={jt} value={jt}>
                      {jt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                题目分类
              </label>
              <Select
                value={category}
                onValueChange={setCategory}
                disabled={optionsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                难度
              </label>
              <Select
                value={difficulty}
                onValueChange={setDifficulty}
                disabled={optionsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部难度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部难度</SelectItem>
                  {difficulties.map((d) => (
                    <SelectItem key={d} value={d}>
                      {diffLabel(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                关键词
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索题目"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="w-full bg-muted/50 p-1">
          <TabsTrigger
            value="all"
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            全部题目
          </TabsTrigger>
          <TabsTrigger
            value="favorite"
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            我的收藏
          </TabsTrigger>
          <TabsTrigger
            value="wrong"
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            错题本
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <QuestionList
            loading={loading}
            questions={questions}
            total={total}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            onToggleFavorite={handleToggleFavorite}
            onMarkCorrect={handleMarkCorrect}
            onMarkWrong={handleMarkWrong}
            onSaveNote={handleSaveNote}
            noteDraft={noteDraft}
            setNoteDraft={setNoteDraft}
            savingRecord={savingRecord}
            diffLabel={diffLabel}
            diffStyle={diffStyle}
            categoryLabel={categoryLabel}
            getStatusBadge={getStatusBadge}
            emptyText="暂无题目"
          />
        </TabsContent>

        <TabsContent value="favorite" className="mt-4">
          <QuestionList
            loading={loading}
            questions={questions}
            total={total}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            onToggleFavorite={handleToggleFavorite}
            onMarkCorrect={handleMarkCorrect}
            onMarkWrong={handleMarkWrong}
            onSaveNote={handleSaveNote}
            noteDraft={noteDraft}
            setNoteDraft={setNoteDraft}
            savingRecord={savingRecord}
            diffLabel={diffLabel}
            diffStyle={diffStyle}
            categoryLabel={categoryLabel}
            getStatusBadge={getStatusBadge}
            emptyText="还没有收藏的题目"
          />
        </TabsContent>

        <TabsContent value="wrong" className="mt-4">
          <QuestionList
            loading={loading}
            questions={questions}
            total={total}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            onToggleFavorite={handleToggleFavorite}
            onMarkCorrect={handleMarkCorrect}
            onMarkWrong={handleMarkWrong}
            onSaveNote={handleSaveNote}
            noteDraft={noteDraft}
            setNoteDraft={setNoteDraft}
            savingRecord={savingRecord}
            diffLabel={diffLabel}
            diffStyle={diffStyle}
            categoryLabel={categoryLabel}
            getStatusBadge={getStatusBadge}
            emptyText="还没有错题，继续加油！"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface QuestionListProps {
  loading: boolean;
  questions: InterviewQuestionWithRecord[];
  total: number;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onToggleFavorite: (q: InterviewQuestionWithRecord) => void;
  onMarkCorrect: (q: InterviewQuestionWithRecord) => void;
  onMarkWrong: (q: InterviewQuestionWithRecord) => void;
  onSaveNote: (q: InterviewQuestionWithRecord) => void;
  noteDraft: string;
  setNoteDraft: (v: string) => void;
  savingRecord: string | null;
  diffLabel: (d: string) => string;
  diffStyle: (d: string) => { bg: string; text: string; border: string };
  categoryLabel: (c: string) => string;
  getStatusBadge: (r: InterviewQuestionWithRecord['record']) => React.ReactNode;
  emptyText: string;
}

const QuestionList = ({
  loading,
  questions,
  expandedId,
  onToggleExpand,
  onToggleFavorite,
  onMarkCorrect,
  onMarkWrong,
  onSaveNote,
  noteDraft,
  setNoteDraft,
  savingRecord,
  diffLabel,
  diffStyle,
  categoryLabel,
  getStatusBadge,
  emptyText,
}: QuestionListProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i: number) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="mb-3 h-5 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BookOpen className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((q: InterviewQuestionWithRecord) => {
        const isExpanded = expandedId === q.id;
        const isFav = q.record?.isFavorite ?? false;
        const dStyle = diffStyle(q.difficulty);
        const isSaving = savingRecord === q.id;

        return (
          <Card
            key={q.id}
            className="group overflow-hidden transition-all duration-200 hover:border-primary/40"
          >
            <CardContent
              className="cursor-pointer p-5"
              onClick={() => onToggleExpand(q.id)}
            >
              {/* 标题 + 收藏按钮 */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex-1 text-base font-semibold leading-snug">
                  {q.title}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 flex-shrink-0 ${
                    isFav ? 'text-amber-500' : 'text-muted-foreground'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onToggleFavorite(q);
                  }}
                  data-ai-section-type="button"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isFav ? (
                    <Star className="h-4 w-4 fill-current" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                  <span className="sr-only">收藏</span>
                </Button>
              </div>

              {/* 标签行 */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {q.jobType}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {categoryLabel(q.category)}
                </Badge>
                <Badge
                  variant="outline"
                  className={`font-normal ${dStyle.bg} ${dStyle.text} ${dStyle.border}`}
                >
                  {diffLabel(q.difficulty)}
                </Badge>
              </div>

              {/* 展开指示 */}
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50">
                {getStatusBadge(q.record)}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      收起答案
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      查看答案
                    </>
                  )}
                </span>
              </div>
            </CardContent>

            {/* 展开内容 */}
            {isExpanded && (
              <div className="border-t border-border/50">
                {/* 答案 */}
                <div className="p-5">
                  <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                    参考答案
                  </h4>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {q.answer}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-wrap gap-2 px-5 pb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onMarkCorrect(q);
                    }}
                    data-ai-section-type="button"
                    disabled={isSaving}
                  >
                    <CheckCircle className="h-4 w-4" />
                    我答对了
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onMarkWrong(q);
                    }}
                    data-ai-section-type="button"
                    disabled={isSaving}
                  >
                    <XCircle className="h-4 w-4" />
                    我答错了
                  </Button>
                </div>

                {/* 笔记 */}
                <div className="px-5 pb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                      <StickyNote className="h-4 w-4" />
                      我的笔记
                    </h4>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onSaveNote(q);
                      }}
                      data-ai-section-type="button"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      保存笔记
                    </Button>
                  </div>
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="写下你的思考、要点或易错点..."
                    className="min-h-[100px] resize-y"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* 底部状态栏 */}
            <CardFooter className="flex items-center justify-between px-5 py-3 text-xs text-muted-foreground border-t border-border/30">
              <span>
                尝试次数：{q.record?.attemptCount ?? 0}
              </span>
              {q.record?.lastAttemptAt && (
                <span>上次练习：{q.record.lastAttemptAt}</span>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};

export default InterviewPage;
