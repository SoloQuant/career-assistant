import { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  BookOpen,
  FileText,
  Play,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Loader2,
  Trophy,
  CheckSquare,
  ListOrdered,
  Eye,
  Send,
  AlertCircle,
} from 'lucide-react';
import type {
  ExamQuestion,
  ExamRecord,
  ExamQuestionListResponse,
  ExamRecordListResponse,
  SubmitExamRequest,
} from '@shared/api.interface';
import {
  getQuestions,
  getQuestionDetail,
  getRecords,
  getRecordDetail,
  submitExam,
  getExamStats,
} from '@/api/written-exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

const CATEGORY_LABELS: Record<string, string> = {
  aptitude: '行测',
  programming: '编程',
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

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: '单选',
  multiple_choice: '多选',
  fill_blank: '填空',
  coding: '编程',
};

type TabKey = 'practice' | 'records';

const WrittenExamPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('practice');

  // Stats
  const [stats, setStats] = useState<{
    totalAttempts: number;
    avgScore: number;
    bestScore: number;
    totalQuestions: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Questions
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [questionsTotal, setQuestionsTotal] = useState<number>(0);
  const [questionsLoading, setQuestionsLoading] = useState<boolean>(true);
  const [category, setCategory] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<string>('all');

  // Question detail
  const [selectedQuestion, setSelectedQuestion] = useState<ExamQuestion | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);

  // Records
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState<number>(0);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(true);

  // Record detail
  const [selectedRecord, setSelectedRecord] = useState<ExamRecord | null>(null);
  const [recordDetailLoading, setRecordDetailLoading] = useState<boolean>(false);
  const [recordDetailOpen, setRecordDetailOpen] = useState<boolean>(false);

  // Exam mode
  const [examMode, setExamMode] = useState<boolean>(false);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [currentExamIndex, setCurrentExamIndex] = useState<number>(0);
  const [examStartTime, setExamStartTime] = useState<number>(0);
  const [examElapsed, setExamElapsed] = useState<number>(0);
  const [submittingExam, setSubmittingExam] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<ExamRecord | null>(null);
  const [examCategory, setExamCategory] = useState<string>('aptitude');

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getExamStats();
      setStats(data);
    } catch (error) {
      logger.error('加载笔试统计失败', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const params: { page: number; pageSize: number; category?: string; difficulty?: string } = {
        page: 1,
        pageSize: 20,
      };
      if (category !== 'all') params.category = category;
      if (difficulty !== 'all') params.difficulty = difficulty;
      const data: ExamQuestionListResponse = await getQuestions(params);
      setQuestions(data.items);
      setQuestionsTotal(data.total);
    } catch (error) {
      logger.error('加载题目列表失败', error);
      toast.error('加载题目列表失败');
    } finally {
      setQuestionsLoading(false);
    }
  }, [category, difficulty]);

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const data: ExamRecordListResponse = await getRecords({ page: 1, pageSize: 20 });
      setRecords(data.items);
      setRecordsTotal(data.total);
    } catch (error) {
      logger.error('加载考试记录失败', error);
      toast.error('加载记录失败');
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'practice') {
      void fetchQuestions();
    }
  }, [activeTab, fetchQuestions]);

  useEffect(() => {
    if (activeTab === 'records') {
      void fetchRecords();
    }
  }, [activeTab, fetchRecords]);

  // Exam timer
  useEffect(() => {
    if (!examMode) return;
    const timer = setInterval(() => {
      setExamElapsed(Math.floor((Date.now() - examStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [examMode, examStartTime]);

  const handleViewQuestion = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setShowAnalysis(false);
    setUserAnswer('');
    try {
      const data = await getQuestionDetail(id);
      setSelectedQuestion(data);
    } catch (error) {
      logger.error('加载题目详情失败', error);
      toast.error('加载详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewRecord = async (id: string) => {
    setRecordDetailOpen(true);
    setRecordDetailLoading(true);
    try {
      const data = await getRecordDetail(id);
      setSelectedRecord(data);
    } catch (error) {
      logger.error('加载记录详情失败', error);
      toast.error('加载详情失败');
    } finally {
      setRecordDetailLoading(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) {
      toast.warning('请先输入答案');
      return;
    }
    setShowAnalysis(true);
    const isCorrect = userAnswer.trim() === selectedQuestion?.correctAnswer;
    if (isCorrect) {
      toast.success('回答正确！');
    } else {
      toast.error('回答错误');
    }
  };

  const handleStartExam = async () => {
    try {
      const data: ExamQuestionListResponse = await getQuestions({
        page: 1,
        pageSize: 10,
        category: examCategory,
      });
      if (data.items.length === 0) {
        toast.warning('暂无可用题目');
        return;
      }
      setExamQuestions(data.items.slice(0, 5));
      setExamAnswers({});
      setCurrentExamIndex(0);
      setExamStartTime(Date.now());
      setExamElapsed(0);
      setExamMode(true);
      setExamResult(null);
    } catch (error) {
      logger.error('开始模拟考试失败', error);
      toast.error('开始考试失败');
    }
  };

  const handleExamAnswer = (questionId: string, answer: string) => {
    setExamAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (currentExamIndex < examQuestions.length - 1) {
      setCurrentExamIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentExamIndex > 0) {
      setCurrentExamIndex((prev) => prev - 1);
    }
  };

  const handleSubmitExam = async () => {
    setSubmittingExam(true);
    try {
      const answersArr = examQuestions
        .filter((q: ExamQuestion) => examAnswers[q.id])
        .map((q: ExamQuestion) => ({ questionId: q.id, userAnswer: examAnswers[q.id] }));

      const payload: SubmitExamRequest = {
        recordId: '',
        answers: answersArr,
        timeSpentSeconds: examElapsed,
      };
      // Simulate submit - backend will create record
      const result = await submitExam(payload);
      setExamResult(result);
      setExamMode(false);
      void fetchRecords();
      void fetchStats();
      toast.success('交卷成功！');
    } catch (error) {
      logger.error('交卷失败', error);
      toast.error('交卷失败');
    } finally {
      setSubmittingExam(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const diffStyle = (diff: string) =>
    DIFFICULTY_COLORS[diff] ?? DIFFICULTY_COLORS.easy;
  const diffLabel = (diff: string) => DIFFICULTY_LABELS[diff] ?? diff;
  const catLabel = (c: string) => CATEGORY_LABELS[c] ?? c;
  const qTypeLabel = (t: string) => QUESTION_TYPE_LABELS[t] ?? t;

  const currentExamQ = examQuestions[currentExamIndex];
  const answeredCount = Object.keys(examAnswers).length;

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-xl font-semibold">笔试模拟</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          题库练习与模拟考试，检验你的知识储备
        </p>
      </div>

      {/* 统计卡片 */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" data-ai-section-type="card-stat">
          {Array.from({ length: 4 }).map((_, i: number) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="mb-2 h-4 w-16" />
                <Skeleton className="h-7 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" data-ai-section-type="card-stat">
          <Card className="transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">题库总量</p>
                  <p className="mt-1 text-2xl font-bold font-mono text-primary">
                    {stats.totalQuestions}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">考试次数</p>
                  <p className="mt-1 text-2xl font-bold font-mono text-blue-500">
                    {stats.totalAttempts}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500">
                  <ListOrdered className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">平均分</p>
                  <p className="mt-1 text-2xl font-bold font-mono text-emerald-500">
                    {stats.avgScore}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                  <Target className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">最高分</p>
                  <p className="mt-1 text-2xl font-bold font-mono text-amber-500">
                    {stats.bestScore}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                  <Trophy className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
      >
        <TabsList className="w-full bg-muted/50 p-1">
          <TabsTrigger
            value="practice"
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <BookOpen className="h-4 w-4" />
            题库练习
          </TabsTrigger>
          <TabsTrigger
            value="records"
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FileText className="h-4 w-4" />
            我的记录
          </TabsTrigger>
        </TabsList>

        {/* 题库练习 */}
        <TabsContent value="practice" className="mt-4 space-y-4">
          {/* 筛选 + 开始考试 */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="grid flex-1 gap-3 md:grid-cols-3">
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
                        <SelectItem value="aptitude">行测</SelectItem>
                        <SelectItem value="programming">编程</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      难度
                    </label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="全部难度" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部难度</SelectItem>
                        <SelectItem value="easy">简单</SelectItem>
                        <SelectItem value="medium">中等</SelectItem>
                        <SelectItem value="hard">困难</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      模拟考试分类
                    </label>
                    <Select value={examCategory} onValueChange={setExamCategory}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aptitude">行测</SelectItem>
                        <SelectItem value="programming">编程</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={() => void handleStartExam()}
                  data-ai-section-type="button"
                  className="h-9 whitespace-nowrap"
                >
                  <Play className="h-4 w-4" />
                  开始模拟考试
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 题目列表 */}
          {questionsLoading ? (
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
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BookOpen className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">暂无题目</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q: ExamQuestion) => {
                const dStyle = diffStyle(q.difficulty);
                return (
                  <Card
                    key={q.id}
                    className="cursor-pointer transition-all duration-200 hover:border-primary/40"
                    onClick={() => void handleViewQuestion(q.id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-base font-medium leading-snug">
                            {q.title}
                          </h3>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="font-normal">
                              {catLabel(q.category)}
                            </Badge>
                            <Badge variant="outline" className="font-normal">
                              {qTypeLabel(q.questionType)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`font-normal ${dStyle.bg} ${dStyle.text} ${dStyle.border}`}
                            >
                              {diffLabel(q.difficulty)}
                            </Badge>
                            <Badge variant="outline" className="font-normal">
                              {q.score} 分
                            </Badge>
                            {q.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="font-normal">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="flex-shrink-0">
                          <Eye className="h-4 w-4" />
                          查看
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 我的记录 */}
        <TabsContent value="records" className="mt-4">
          {recordsLoading ? (
            <Card>
              <CardContent className="p-5">
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i: number) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : records.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">暂无考试记录</p>
                <p className="mt-1 text-xs">开始第一场模拟考试吧</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>考试名称</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead>得分 / 总分</TableHead>
                      <TableHead>正确率</TableHead>
                      <TableHead>用时</TableHead>
                      <TableHead>日期</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r: ExamRecord) => {
                      const rate = r.totalCount > 0 ? Math.round((r.correctCount / r.totalCount) * 100) : 0;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.title}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{catLabel(r.category)}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-semibold text-primary">
                              {r.userScore}
                            </span>
                            <span className="text-muted-foreground"> / {r.totalScore}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={rate >= 60 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-red-500/30 bg-red-500/10 text-red-500'}
                            >
                              {rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatTime(r.timeSpentSeconds)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleViewRecord(r.id)}
                            >
                              查看详情
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 题目详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">题目详情</DialogTitle>
            <DialogDescription>
              {selectedQuestion && (
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="secondary">{catLabel(selectedQuestion.category)}</Badge>
                  <Badge variant="outline">{qTypeLabel(selectedQuestion.questionType)}</Badge>
                  <Badge
                    variant="outline"
                    className={`${diffStyle(selectedQuestion.difficulty).bg} ${diffStyle(selectedQuestion.difficulty).text} ${diffStyle(selectedQuestion.difficulty).border}`}
                  >
                    {diffLabel(selectedQuestion.difficulty)}
                  </Badge>
                  <Badge variant="outline">{selectedQuestion.score} 分</Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : selectedQuestion ? (
            <div className="space-y-4">
              <p className="text-base font-medium leading-relaxed">{selectedQuestion.title}</p>

              {/* 选项 */}
              {selectedQuestion.options.length > 0 && (
                <div className="space-y-2">
                  {selectedQuestion.options.map((opt: { label: string; value: string }) => {
                    const isSelected = userAnswer === opt.value;
                    const isCorrect = showAnalysis && opt.value === selectedQuestion.correctAnswer;
                    const isWrong = showAnalysis && isSelected && opt.value !== selectedQuestion.correctAnswer;
                    return (
                      <div
                        key={opt.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                          isCorrect
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : isWrong
                            ? 'border-red-500/50 bg-red-500/10'
                            : isSelected
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        }`}
                        onClick={() => !showAnalysis && setUserAnswer(opt.value)}
                      >
                        <div
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : isWrong
                              ? 'border-red-500 bg-red-500 text-white'
                              : isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border'
                          }`}
                        >
                          {opt.label}
                        </div>
                        <span className="text-sm">{opt.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 填空/编程题输入 */}
              {(selectedQuestion.questionType === 'fill_blank' || selectedQuestion.questionType === 'coding') && !showAnalysis && (
                <Textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder={selectedQuestion.questionType === 'coding' ? '请输入代码...' : '请输入答案...'}
                  className={selectedQuestion.questionType === 'coding' ? 'font-mono min-h-[150px]' : 'min-h-[80px]'}
                />
              )}

              {/* 解析 */}
              {showAnalysis && (
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    {userAnswer.trim() === selectedQuestion.correctAnswer ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                        <span className="font-medium text-emerald-600">回答正确</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="font-medium text-red-600">回答错误</span>
                      </>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">正确答案</p>
                    <p className="mt-1 font-mono text-sm">{selectedQuestion.correctAnswer}</p>
                  </div>
                  {selectedQuestion.analysis && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">答案解析</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedQuestion.analysis}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              关闭
            </Button>
            {!showAnalysis && selectedQuestion && (
              <Button onClick={handleSubmitAnswer} data-ai-section-type="button">
                <CheckSquare className="h-4 w-4" />
                提交答案
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 记录详情对话框 */}
      <Dialog open={recordDetailOpen} onOpenChange={setRecordDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRecord?.title}</DialogTitle>
            <DialogDescription>
              {selectedRecord && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{catLabel(selectedRecord.category)}</Badge>
                  <Badge variant="outline">
                    得分 {selectedRecord.userScore} / {selectedRecord.totalScore}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`${
                      selectedRecord.correctCount / selectedRecord.totalCount >= 0.6
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                        : 'border-red-500/30 bg-red-500/10 text-red-500'
                    }`}
                  >
                    正确率 {selectedRecord.totalCount > 0 ? Math.round((selectedRecord.correctCount / selectedRecord.totalCount) * 100) : 0}%
                  </Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {recordDetailLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i: number) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : selectedRecord ? (
            <div className="space-y-3">
              {selectedRecord.answers.map((ans: { questionId: string; userAnswer: string; isCorrect: boolean }, idx: number) => (
                <div
                  key={ans.questionId}
                  className={`rounded-lg border p-3 ${
                    ans.isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">第 {idx + 1} 题</span>
                    {ans.isCorrect ? (
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                        <CheckCircle className="mr-1 h-3 w-3" /> 正确
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-500">
                        <XCircle className="mr-1 h-3 w-3" /> 错误
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>你的答案：<span className="font-mono text-foreground">{ans.userAnswer || '未作答'}</span></p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDetailOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 考试模式对话框 */}
      <Dialog open={examMode} onOpenChange={(open) => !open && setExamMode(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>模拟考试</span>
              <Badge variant="outline" className="font-mono">
                <Clock className="mr-1 h-3 w-3" />
                {formatTime(examElapsed)}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              <div className="mt-2">
                <Progress
                  value={((currentExamIndex + 1) / examQuestions.length) * 100}
                  className="h-1.5"
                />
                <p className="mt-1 text-xs">
                  第 {currentExamIndex + 1} / {examQuestions.length} 题 · 已答 {answeredCount} 题
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          {currentExamQ && (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{qTypeLabel(currentExamQ.questionType)}</Badge>
                  <Badge
                    variant="outline"
                    className={`${diffStyle(currentExamQ.difficulty).bg} ${diffStyle(currentExamQ.difficulty).text} ${diffStyle(currentExamQ.difficulty).border}`}
                  >
                    {diffLabel(currentExamQ.difficulty)}
                  </Badge>
                  <Badge variant="outline">{currentExamQ.score} 分</Badge>
                </div>
                <p className="text-base font-medium leading-relaxed">{currentExamQ.title}</p>
              </div>

              {/* 选项 */}
              {currentExamQ.options.length > 0 && (
                <div className="space-y-2">
                  {currentExamQ.options.map((opt: { label: string; value: string }) => {
                    const isSelected = examAnswers[currentExamQ.id] === opt.value;
                    return (
                      <div
                        key={opt.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                          isSelected
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        }`}
                        onClick={() => handleExamAnswer(currentExamQ.id, opt.value)}
                      >
                        <div
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border'
                          }`}
                        >
                          {opt.label}
                        </div>
                        <span className="text-sm">{opt.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 填空/编程 */}
              {(currentExamQ.questionType === 'fill_blank' || currentExamQ.questionType === 'coding') && (
                <Textarea
                  value={examAnswers[currentExamQ.id] || ''}
                  onChange={(e) => handleExamAnswer(currentExamQ.id, e.target.value)}
                  placeholder={currentExamQ.questionType === 'coding' ? '请输入代码...' : '请输入答案...'}
                  className={currentExamQ.questionType === 'coding' ? 'font-mono min-h-[150px]' : 'min-h-[80px]'}
                />
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevQuestion}
              disabled={currentExamIndex === 0}
            >
              上一题
            </Button>
            <div className="flex gap-2">
              {currentExamIndex < examQuestions.length - 1 ? (
                <Button onClick={handleNextQuestion} data-ai-section-type="button">
                  下一题
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={() => void handleSubmitExam()}
                  disabled={submittingExam}
                  data-ai-section-type="button"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {submittingExam ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  交卷
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 考试结果对话框 */}
      <Dialog open={!!examResult && !examMode} onOpenChange={(open) => !open && setExamResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              考试完成
            </DialogTitle>
          </DialogHeader>
          {examResult && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">你的得分</p>
                <p className="mt-1 text-5xl font-bold text-primary font-mono">
                  {examResult.userScore}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  满分 {examResult.totalScore} 分
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-lg font-semibold font-mono">{examResult.correctCount}</p>
                  <p className="text-xs text-muted-foreground">答对</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-lg font-semibold font-mono">
                    {examResult.totalCount - examResult.correctCount}
                  </p>
                  <p className="text-xs text-muted-foreground">答错</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-lg font-semibold font-mono">
                    {formatTime(examResult.timeSpentSeconds)}
                  </p>
                  <p className="text-xs text-muted-foreground">用时</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExamResult(null)}>
              关闭
            </Button>
            <Button
              onClick={() => {
                setExamResult(null);
                void handleStartExam();
              }}
              data-ai-section-type="button"
            >
              <Play className="h-4 w-4" />
              再来一次
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WrittenExamPage;
