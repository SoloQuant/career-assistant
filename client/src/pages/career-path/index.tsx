import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Plus,
  CheckCircle2,
  Clock,
  Target,
  Loader2,
  Sparkles,
  Trash2,
  Calendar,
  BookOpen,
  ListTodo,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import type {
  CareerPath,
  CareerPathWithStages,
  CareerStage,
  GenerateCareerPlanRequest,
  CreateCareerPathRequest,
} from '@shared/api.interface';
import {
  getCareerPathList,
  getCareerPath,
  createCareerPath,
  generatePlan,
  updateStageStatus,
  deleteCareerPath,
} from '@/api/career-path';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressRing } from '@/components/ui/progress-ring';

const TARGET_JOB_OPTIONS = [
  { key: 'data_engineer', label: '大数据开发' },
  { key: 'data_analyst', label: '数据分析师' },
  { key: 'algorithm', label: '算法工程师' },
];

const DURATION_OPTIONS = [3, 4, 5, 6];

function getJobLabel(key: string): string {
  const found = TARGET_JOB_OPTIONS.find((j) => j.key === key);
  return found ? found.label : key;
}

const STATUS_LABEL_MAP: Record<string, string> = {
  planning: '规划中',
  in_progress: '进行中',
  completed: '已完成',
  paused: '已暂停',
};

interface GenerateDialogState {
  targetJob: string;
  durationMonths: number;
}

function emptyGenerateForm(): GenerateDialogState {
  return {
    targetJob: TARGET_JOB_OPTIONS[0]?.key ?? 'data_engineer',
    durationMonths: DURATION_OPTIONS[2] ?? 5,
  };
}

const CareerPathPage = () => {
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<CareerPathWithStages | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [form, setForm] = useState<GenerateDialogState>(emptyGenerateForm());
  const [generating, setGenerating] = useState<boolean>(false);
  const [previewPlan, setPreviewPlan] = useState<CareerPathWithStages | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CareerPath | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchPathList = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await getCareerPathList();
      setPaths(data.items);
      if (data.items.length > 0 && !selectedId) {
        setSelectedId(data.items[0].id);
      }
    } catch (error) {
      logger.error('加载职业路径列表失败', error);
      toast.error('加载职业路径列表失败');
    } finally {
      setLoadingList(false);
    }
  }, [selectedId]);

  const fetchPathDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await getCareerPath(id);
      setSelectedPath(data);
    } catch (error) {
      logger.error('加载职业路径详情失败', error);
      toast.error('加载路径详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void fetchPathList();
  }, []);

  useEffect(() => {
    if (selectedId) {
      void fetchPathDetail(selectedId);
    } else {
      setSelectedPath(null);
    }
  }, [selectedId, fetchPathDetail]);

  const sortedStages = useMemo(() => {
    if (!selectedPath) return [];
    return [...selectedPath.stages].sort(
      (a: CareerStage, b: CareerStage) => a.sortOrder - b.sortOrder,
    );
  }, [selectedPath]);

  const overallProgress = useMemo(() => {
    if (!selectedPath || selectedPath.totalStages === 0) return 0;
    const completed = sortedStages.filter(
      (s: CareerStage) => s.isCompleted,
    ).length;
    return Math.floor((completed / selectedPath.totalStages) * 100);
  }, [selectedPath, sortedStages]);

  const handleSelectPath = (id: string) => {
    setSelectedId(id);
  };

  const handleToggleStage = useCallback(
    async (stage: CareerStage) => {
      const nextCompleted = !stage.isCompleted;
      setUpdatingStageId(stage.id);

      // 乐观更新
      setSelectedPath((prev) => {
        if (!prev) return prev;
        const newStages = prev.stages.map((s: CareerStage) =>
          s.id === stage.id ? { ...s, isCompleted: nextCompleted } : s,
        );
        const newCompleted = newStages.filter(
          (s: CareerStage) => s.isCompleted,
        ).length;
        return {
          ...prev,
          currentStage: Math.max(0, Math.min(prev.totalStages - 1, newCompleted)),
          stages: newStages,
        };
      });

      try {
        await updateStageStatus(stage.id, nextCompleted);
        toast.success(nextCompleted ? '阶段已标记完成' : '阶段已取消完成');
      } catch (error) {
        logger.error('更新阶段状态失败', error);
        toast.error('更新失败');
        // 回滚
        setSelectedPath((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            stages: prev.stages.map((s: CareerStage) =>
              s.id === stage.id ? { ...s, isCompleted: !nextCompleted } : s,
            ),
          };
        });
      } finally {
        setUpdatingStageId(null);
      }
    },
    [],
  );

  const openGenerateDialog = () => {
    setForm(emptyGenerateForm());
    setPreviewPlan(null);
    setDialogOpen(true);
  };

  const handleGeneratePreview = async () => {
    if (!form.targetJob) {
      toast.error('请选择目标岗位');
      return;
    }
    setGenerating(true);
    setPreviewPlan(null);
    try {
      const req: GenerateCareerPlanRequest = {
        targetJob: form.targetJob,
        currentSkills: [],
        durationMonths: form.durationMonths,
      };
      const data = await generatePlan(req);
      setPreviewPlan(data);
      toast.success('计划已生成，请预览确认');
    } catch (error) {
      logger.error('生成学习计划失败', error);
      toast.error('生成计划失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePlan = async () => {
    if (!previewPlan) return;
    setSaving(true);
    try {
      const req: CreateCareerPathRequest = {
        targetJob: previewPlan.targetJob,
        title: previewPlan.title,
        durationMonths: previewPlan.durationMonths,
      };
      const created = await createCareerPath(req);
      toast.success('学习计划已保存');
      setDialogOpen(false);
      setPaths((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setSelectedPath(created);
      setPreviewPlan(null);
    } catch (error) {
      logger.error('保存学习计划失败', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCareerPath(deleteTarget.id);
      setPaths((prev) => prev.filter((p: CareerPath) => p.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) {
        const remaining = paths.filter(
          (p: CareerPath) => p.id !== deleteTarget.id,
        );
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success('路径已删除');
      setDeleteTarget(null);
    } catch (error) {
      logger.error('删除职业路径失败', error);
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const currentStageIndex = useMemo(() => {
    if (!selectedPath) return -1;
    return selectedPath.currentStage;
  }, [selectedPath]);

  return (
    <div className="space-y-6">
      {/* 顶部标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            职业路径规划
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            定制专属学习路线，系统提升职业竞争力
          </p>
        </div>
        <Button
          onClick={openGenerateDialog}
          data-ai-section-type="button"
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          生成学习计划
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左侧：路径列表 */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                我的路径
              </CardTitle>
              <CardDescription className="text-xs">
                已创建 {paths.length} 条职业路径
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingList ? (
                Array.from({ length: 3 }).map((_, i: number) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))
              ) : paths.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  暂无职业路径
                  <br />
                  点击右上角「生成学习计划」
                </div>
              ) : (
                paths.map((path: CareerPath) => {
                  const isActive = selectedId === path.id;
                  return (
                    <div
                      key={path.id}
                      onClick={() => handleSelectPath(path.id)}
                      className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        isActive
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-transparent hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm truncate">
                            {path.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {getJobLabel(path.targetJob)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 font-normal"
                            >
                              {STATUS_LABEL_MAP[path.status] ?? path.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {path.durationMonths}个月
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(path);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                      {isActive && (
                        <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </aside>

        {/* 右侧：路径详情 */}
        <main className="flex-1 min-w-0">
          {loadingDetail && selectedId ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : !selectedPath ? (
            <Card className="h-96 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {paths.length === 0
                    ? '点击上方「生成学习计划」开始规划'
                    : '请选择一条职业路径查看详情'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* 路径概览 */}
              <Card className="group relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex items-center gap-5">
                      <ProgressRing
                        value={overallProgress}
                        size={72}
                        strokeWidth={6}
                        color="hsl(var(--primary))"
                        trackColor="hsl(var(--muted))"
                      />
                      <div>
                        <h3 className="text-lg font-semibold">
                          {selectedPath.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedPath.description}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 sm:ml-auto sm:flex sm:gap-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                          <Target className="h-4 w-4" />
                          <span className="text-xs">目标岗位</span>
                        </div>
                        <p className="mt-1 text-sm font-medium">
                          {getJobLabel(selectedPath.targetJob)}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs">总时长</span>
                        </div>
                        <p className="mt-1 text-sm font-medium">
                          {selectedPath.durationMonths}个月
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          <span className="text-xs">当前阶段</span>
                        </div>
                        <p className="mt-1 text-sm font-medium">
                          {currentStageIndex + 1} / {selectedPath.totalStages}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>整体进度</span>
                      <span>{overallProgress}% 完成</span>
                    </div>
                    <Progress value={overallProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* 职业路径图 - 时间线 */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-primary" />
                  学习路线图
                </h3>
                <div className="relative pl-8 space-y-6">
                  {/* 连接线 */}
                  <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-border" />

                  {sortedStages.map((stage: CareerStage, index: number) => {
                    const isCurrent = index === currentStageIndex && !stage.isCompleted;
                    const isCompleted = stage.isCompleted;
                    const isUpdating = updatingStageId === stage.id;

                    return (
                      <div key={stage.id} className="relative">
                        {/* 时间线节点 */}
                        <div
                          className={`absolute -left-8 top-4 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-300 z-10 ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_0_4px_hsl(var(--emerald)_/_0.1)]'
                              : isCurrent
                                ? 'bg-primary border-primary text-white shadow-[0_0_0_4px_hsl(var(--primary)_/_0.15)] animate-pulse'
                                : 'bg-background border-muted-foreground/30 text-muted-foreground/50'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <span className="text-xs font-medium">
                              {index + 1}
                            </span>
                          )}
                        </div>

                        <Card
                          className={`transition-all duration-300 ${
                            isCompleted
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : isCurrent
                                ? 'border-primary/60 shadow-[0_4px_20px_rgba(0_0_0_0.1)] ring-1 ring-primary/20'
                                : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={stage.isCompleted}
                                  disabled={isUpdating}
                                  onCheckedChange={() =>
                                    handleToggleStage(stage)
                                  }
                                  className="mt-0.5"
                                />
                                <div>
                                  <CardTitle className="text-base flex items-center gap-2">
                                    {stage.title}
                                    {isCurrent && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] h-5 px-2 font-normal bg-primary/15 text-primary border-primary/20"
                                      >
                                        进行中
                                      </Badge>
                                    )}
                                  </CardTitle>
                                  <CardDescription className="text-xs mt-0.5">
                                    {stage.description}
                                  </CardDescription>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className="flex-shrink-0 text-xs font-normal"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {stage.durationWeeks}周
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* 技能 badges */}
                            {stage.requiredSkills.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2 font-medium">
                                  需掌握技能
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {stage.requiredSkills.map(
                                    (skill: string, i: number) => (
                                      <Badge
                                        key={`${skill}-${i}`}
                                        variant="secondary"
                                        className="text-xs font-normal"
                                      >
                                        {skill}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 主要任务 */}
                            {stage.tasks.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2 font-medium">
                                  主要任务
                                </p>
                                <ul className="space-y-1.5">
                                  {stage.tasks.map(
                                    (task: string, i: number) => (
                                      <li
                                        key={i}
                                        className={`text-sm flex items-start gap-2 ${
                                          isCompleted
                                            ? 'text-muted-foreground line-through'
                                            : ''
                                        }`}
                                      >
                                        <span
                                          className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                            isCompleted
                                              ? 'bg-emerald-400'
                                              : 'bg-primary'
                                          }`}
                                        />
                                        <span>{task}</span>
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 生成计划弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              生成学习计划
            </DialogTitle>
            <DialogDescription>
              选择目标岗位和期望时长，AI 为你定制专属学习路径
            </DialogDescription>
          </DialogHeader>

          {!previewPlan ? (
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">目标岗位</label>
                <Select
                  value={form.targetJob}
                  onValueChange={(val: string) =>
                    setForm((prev) => ({ ...prev, targetJob: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择目标岗位" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_JOB_OPTIONS.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  期望时长（{form.durationMonths}个月）
                </label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((months: number) => (
                    <Button
                      key={months}
                      type="button"
                      variant={
                        form.durationMonths === months
                          ? 'default'
                          : 'outline'
                      }
                      className="flex-1"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          durationMonths: months,
                        }))
                      }
                    >
                      {months}个月
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleGeneratePreview}
                  disabled={generating}
                  className="w-full gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在生成计划...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      生成计划预览
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{previewPlan.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {previewPlan.description}
                  </p>
                </div>
                <Badge variant="outline">{previewPlan.durationMonths}个月</Badge>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                {previewPlan.stages
                  .sort(
                    (a: CareerStage, b: CareerStage) =>
                      a.sortOrder - b.sortOrder,
                  )
                  .map((stage: CareerStage, index: number) => (
                    <Card
                      key={stage.id}
                      className="border-muted-foreground/20"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                              {index + 1}
                            </span>
                            {stage.title}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {stage.durationWeeks}周
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {stage.requiredSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {stage.requiredSkills.map(
                              (skill: string, i: number) => (
                                <Badge
                                  key={`${skill}-${i}`}
                                  variant="secondary"
                                  className="text-[10px] font-normal"
                                >
                                  {skill}
                                </Badge>
                              ),
                            )}
                          </div>
                        )}
                        {stage.tasks.length > 0 && (
                          <ul className="space-y-0.5">
                            {stage.tasks.slice(0, 3).map(
                              (task: string, i: number) => (
                                <li
                                  key={i}
                                  className="text-xs text-muted-foreground flex items-start gap-1.5"
                                >
                                  <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                                  {task}
                                </li>
                              ),
                            )}
                            {stage.tasks.length > 3 && (
                              <li className="text-xs text-muted-foreground/70">
                                +{stage.tasks.length - 3} 项任务...
                              </li>
                            )}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {previewPlan ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setPreviewPlan(null)}
                  disabled={saving}
                >
                  重新生成
                </Button>
                <Button onClick={handleSavePlan} disabled={saving} className="gap-2">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      确认保存
                    </>
                  )}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除职业路径「{deleteTarget?.title}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  删除中
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CareerPathPage;
