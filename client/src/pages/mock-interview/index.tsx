import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  MessageSquare,
  Play,
  Send,
  Square,
  Trash2,
  ChevronRight,
  Loader2,
  Trophy,
  ThumbsUp,
  AlertCircle,
  Lightbulb,
  Clock,
  Target,
  Zap,
} from 'lucide-react';
import type {
  MockInterviewSession,
  MockInterviewMessage,
  InterviewSessionListResponse,
  CreateMockInterviewRequest,
} from '@shared/api.interface';
import {
  getSessions,
  getSessionDetail,
  startInterview,
  sendAnswer,
  endInterview,
  getFeedback,
  deleteSession,
} from '@/api/mock-interview';
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

const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  technical: '技术面试',
  hr: 'HR 面试',
  project: '项目管理',
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

const STATUS_LABELS: Record<string, string> = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const JOB_TYPE_OPTIONS = [
  { value: 'frontend', label: '前端开发' },
  { value: 'backend', label: '后端开发' },
  { value: 'fullstack', label: '全栈开发' },
  { value: 'data', label: '数据工程师' },
  { value: 'algorithm', label: '算法工程师' },
  { value: 'product', label: '产品经理' },
];

const MockInterviewPage = () => {
  const [sessions, setSessions] = useState<MockInterviewSession[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<MockInterviewSession | null>(null);
  const [messages, setMessages] = useState<MockInterviewMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // New interview form
  const [jobType, setJobType] = useState<string>('frontend');
  const [interviewType, setInterviewType] = useState<'technical' | 'hr' | 'project'>('technical');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [starting, setStarting] = useState<boolean>(false);

  // Answer input
  const [answerText, setAnswerText] = useState<string>('');
  const [sendingAnswer, setSendingAnswer] = useState<boolean>(false);
  const [ending, setEnding] = useState<boolean>(false);

  // Feedback
  const [feedbackData, setFeedbackData] = useState<MockInterviewSession | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState<boolean>(false);

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data: InterviewSessionListResponse = await getSessions({ page: 1, pageSize: 20 });
      setSessions(data.items);
      setTotal(data.total);
    } catch (error) {
      logger.error('加载面试会话列表失败', error);
      toast.error('加载会话列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectSession = async (id: string) => {
    setSelectedSessionId(id);
    setFeedbackData(null);
    setDetailLoading(true);
    try {
      const data = await getSessionDetail(id);
      setSessionDetail(data.session);
      setMessages(data.messages);
      if (data.session.status === 'completed') {
        void fetchFeedback(id);
      }
    } catch (error) {
      logger.error('加载会话详情失败', error);
      toast.error('加载会话详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchFeedback = async (id: string) => {
    setFeedbackLoading(true);
    try {
      const data = await getFeedback(id);
      setFeedbackData(data);
    } catch (error) {
      logger.error('加载面试反馈失败', error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleStartInterview = async () => {
    setStarting(true);
    try {
      const payload: CreateMockInterviewRequest = {
        jobType,
        interviewType,
        difficulty,
        totalQuestions,
      };
      const session = await startInterview(payload);
      setSessions((prev) => [session, ...prev]);
      setTotal((prev) => prev + 1);
      setSelectedSessionId(session.id);
      setSessionDetail(session);
      setMessages([]);
      setFeedbackData(null);
      toast.success('面试已开始，祝你好运！');
      // Load detail to get first question
      void handleSelectSession(session.id);
    } catch (error) {
      logger.error('开始面试失败', error);
      toast.error('开始面试失败');
    } finally {
      setStarting(false);
    }
  };

  const handleSendAnswer = async () => {
    if (!selectedSessionId || !answerText.trim()) return;
    setSendingAnswer(true);
    try {
      const msg = await sendAnswer(selectedSessionId, { answer: answerText.trim() });
      setMessages((prev) => [...prev, msg]);
      setAnswerText('');
      // Refresh session detail to get updated index and next question (if any)
      const detail = await getSessionDetail(selectedSessionId);
      setSessionDetail(detail.session);
      setMessages(detail.messages);
      if (detail.session.status === 'completed') {
        void fetchFeedback(selectedSessionId);
      }
    } catch (error) {
      logger.error('发送回答失败', error);
      toast.error('发送失败');
    } finally {
      setSendingAnswer(false);
    }
  };

  const handleEndInterview = async () => {
    if (!selectedSessionId) return;
    setEnding(true);
    try {
      const updated = await endInterview(selectedSessionId);
      setSessionDetail(updated);
      setSessions((prev) =>
        prev.map((s: MockInterviewSession) => (s.id === selectedSessionId ? updated : s)),
      );
      void fetchFeedback(selectedSessionId);
      toast.success('面试已结束，正在生成反馈...');
    } catch (error) {
      logger.error('结束面试失败', error);
      toast.error('结束面试失败');
    } finally {
      setEnding(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    setDeleting(true);
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s: MockInterviewSession) => s.id !== id));
      setTotal((prev) => prev - 1);
      if (selectedSessionId === id) {
        setSelectedSessionId(null);
        setSessionDetail(null);
        setMessages([]);
        setFeedbackData(null);
      }
      setDeleteConfirmId(null);
      toast.success('已删除会话');
    } catch (error) {
      logger.error('删除会话失败', error);
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const diffStyle = (diff: string) =>
    DIFFICULTY_COLORS[diff] ?? DIFFICULTY_COLORS.easy;
  const diffLabel = (diff: string) => DIFFICULTY_LABELS[diff] ?? diff;
  const typeLabel = (t: string) => INTERVIEW_TYPE_LABELS[t] ?? t;
  const statusLabel = (s: string) => STATUS_LABELS[s] ?? s;

  const progress = sessionDetail
    ? Math.min(100, Math.round((sessionDetail.currentQuestionIndex / Math.max(1, sessionDetail.totalQuestions)) * 100))
    : 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[600px] gap-4">
      {/* 左侧会话列表 */}
      <div className="flex w-80 flex-shrink-0 flex-col">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">面试会话</h2>
          <Badge variant="secondary">{total} 场</Badge>
        </div>

        <Card className="flex-1 overflow-hidden">
          <CardContent className="flex h-full flex-col p-0">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i: number) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm">暂无面试记录</p>
                <p className="mt-1 text-xs">开始你的第一场模拟面试吧</p>
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {sessions.map((s: MockInterviewSession) => {
                  const dStyle = diffStyle(s.difficulty);
                  const isActive = selectedSessionId === s.id;
                  return (
                    <div
                      key={s.id}
                      className={`group cursor-pointer rounded-lg border p-3 transition-all ${
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40 hover:bg-muted/30'
                      }`}
                      onClick={() => void handleSelectSession(s.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">{typeLabel(s.interviewType)}</span>
                            <Badge
                              variant="outline"
                              className={`h-4 px-1 text-[10px] font-normal ${dStyle.bg} ${dStyle.text} ${dStyle.border}`}
                            >
                              {diffLabel(s.difficulty)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{s.jobType}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(s.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <Badge
                          variant="outline"
                          className={`h-4 px-1.5 text-[10px] font-normal ${
                            s.status === 'in_progress'
                              ? 'border-blue-500/30 bg-blue-500/10 text-blue-500'
                              : s.status === 'completed'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {statusLabel(s.status)}
                        </Badge>
                        {s.score !== undefined && s.score !== null ? (
                          <span className="font-mono text-primary font-semibold">{s.score} 分</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {s.currentQuestionIndex}/{s.totalQuestions}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 右侧主区域 */}
      <div className="flex flex-1 flex-col">
        {!selectedSessionId ? (
          // 未选中：开始新面试表单
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                开始新面试
              </CardTitle>
              <CardDescription>
                选择面试类型和难度，开启一场模拟面试
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid max-w-lg gap-5">
                <div className="space-y-2">
                  <Label>岗位类型</Label>
                  <Select value={jobType} onValueChange={setJobType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择岗位类型" />
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

                <div className="space-y-2">
                  <Label>面试类型</Label>
                  <Select
                    value={interviewType}
                    onValueChange={(v) => setInterviewType(v as 'technical' | 'hr' | 'project')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择面试类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">技术面试</SelectItem>
                      <SelectItem value="hr">HR 面试</SelectItem>
                      <SelectItem value="project">项目管理</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>难度</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as 'easy' | 'medium' | 'hard')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择难度" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">简单</SelectItem>
                      <SelectItem value="medium">中等</SelectItem>
                      <SelectItem value="hard">困难</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>题目数量：{totalQuestions} 题</Label>
                  <Input
                    type="range"
                    min={3}
                    max={10}
                    step={1}
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(Number(e.target.value))}
                    className="h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>3 题</span>
                    <span>10 题</span>
                  </div>
                </div>

                <Button
                  onClick={() => void handleStartInterview()}
                  disabled={starting}
                  className="mt-2 h-11 text-base"
                  data-ai-section-type="button"
                >
                  {starting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  开始面试
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // 选中会话：问答界面
          <Card className="flex flex-1 flex-col overflow-hidden">
            {/* 顶部会话信息 */}
            <CardHeader className="border-b py-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {typeLabel(sessionDetail?.interviewType ?? '')}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`${diffStyle(sessionDetail?.difficulty ?? 'easy').bg} ${diffStyle(sessionDetail?.difficulty ?? 'easy').text} ${diffStyle(sessionDetail?.difficulty ?? 'easy').border}`}
                    >
                      {diffLabel(sessionDetail?.difficulty ?? 'easy')}
                    </Badge>
                    <Badge variant="secondary">{sessionDetail?.jobType}</Badge>
                  </div>
                  <CardDescription className="mt-1">
                    {statusLabel(sessionDetail?.status ?? '')} · 共 {sessionDetail?.totalQuestions} 题
                  </CardDescription>
                </div>
                {sessionDetail?.status === 'in_progress' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleEndInterview()}
                    disabled={ending}
                    data-ai-section-type="button"
                    className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                  >
                    {ending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                    结束面试
                  </Button>
                )}
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>进度</span>
                  <span>{sessionDetail?.currentQuestionIndex ?? 0} / {sessionDetail?.totalQuestions ?? 0}</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            </CardHeader>

            {/* 消息流 */}
            <CardContent className="flex-1 overflow-y-auto p-4">
              {detailLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i: number) => (
                    <div key={i} className="flex gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-20 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 && sessionDetail?.status !== 'completed' ? (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <MessageSquare className="mb-2 h-10 w-10 opacity-30" />
                  <p className="text-sm">等待面试官出题...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg: MockInterviewMessage) => {
                    const isInterviewer = msg.role === 'interviewer';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${isInterviewer ? '' : 'flex-row-reverse'}`}
                      >
                        <div
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                            isInterviewer
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          {isInterviewer ? (
                            <MessageSquare className="h-4 w-4" />
                          ) : (
                            <UserIcon />
                          )}
                        </div>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                            isInterviewer
                              ? 'bg-muted rounded-tl-sm'
                              : 'bg-primary text-primary-foreground rounded-tr-sm'
                          }`}
                        >
                          {isInterviewer && msg.questionIndex >= 0 && (
                            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                                第 {msg.questionIndex + 1} 题
                              </Badge>
                              <span>面试官</span>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </CardContent>

            {/* 面试已结束 + 反馈 */}
            {sessionDetail?.status === 'completed' && feedbackData && (
              <div className="border-t bg-muted/20 p-4">
                {feedbackLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                        <Trophy className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">面试评分</h3>
                        <p className="text-3xl font-bold text-primary font-mono">
                          {feedbackData.score ?? '-'}
                          <span className="ml-1 text-base font-normal text-muted-foreground">/ 100 分</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {feedbackData.strengths && (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                            <ThumbsUp className="h-4 w-4" />
                            表现亮点
                          </div>
                          <p className="text-sm text-foreground/80">{feedbackData.strengths}</p>
                        </div>
                      )}
                      {feedbackData.weaknesses && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            待提升点
                          </div>
                          <p className="text-sm text-foreground/80">{feedbackData.weaknesses}</p>
                        </div>
                      )}
                    </div>

                    {feedbackData.suggestions && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                        <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-amber-600">
                          <Lightbulb className="h-4 w-4" />
                          改进建议
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-foreground/80">
                          {feedbackData.suggestions}
                        </p>
                      </div>
                    )}

                    {feedbackData.feedback && (
                      <div className="rounded-lg border p-3">
                        <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                          <Zap className="h-4 w-4" />
                          综合评价
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-foreground/80">
                          {feedbackData.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 底部输入框 */}
            {sessionDetail?.status === 'in_progress' && (
              <CardFooter className="border-t p-3">
                <div className="flex w-full items-end gap-2">
                  <Textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="输入你的回答..."
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void handleSendAnswer();
                      }
                    }}
                  />
                  <Button
                    onClick={() => void handleSendAnswer()}
                    disabled={sendingAnswer || !answerText.trim()}
                    data-ai-section-type="button"
                    className="h-[60px] px-5"
                  >
                    {sendingAnswer ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    发送
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        )}
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除后将无法恢复，确定要删除这场面试记录吗？
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
              onClick={() => deleteConfirmId && void handleDeleteSession(deleteConfirmId)}
              disabled={deleting}
              data-ai-section-type="button"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Simple user icon component
const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default MockInterviewPage;
