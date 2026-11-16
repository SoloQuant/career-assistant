import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Plus,
  Calendar,
  Pencil,
  Trash2,
  ChevronRight,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  Clock,
  ListTodo,
  Loader,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
} from '@shared/api.interface';
import { getTasks, createTask, updateTask, deleteTask } from '@/api/tasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

type TaskStatus = Task['status'];
type TaskPriority = Task['priority'];
type TaskType = Task['taskType'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const TYPE_LABELS: Record<TaskType, string> = {
  learning: '学习',
  job_search: '求职',
};

const STATUS_FLOW: Record<TaskStatus, TaskStatus | null> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: null,
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'bg-[hsl(0_84%_60%)]',
  medium: 'bg-[hsl(38_90%_55%)]',
  low: 'bg-[hsl(160_70%_50%)]',
};

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  high: 'bg-[hsl(0_84%_60%)]/15 text-[hsl(0_84%_60%)] border-[hsl(0_84%_60%)]/30 hover:bg-[hsl(0_84%_60%)]/15',
  medium: 'bg-[hsl(38_90%_55%)]/15 text-[hsl(38_90%_55%)] border-[hsl(38_90%_55%)]/30 hover:bg-[hsl(38_90%_55%)]/15',
  low: 'bg-[hsl(160_70%_50%)]/15 text-[hsl(160_70%_50%)] border-[hsl(160_70%_50%)]/30 hover:bg-[hsl(160_70%_50%)]/15',
};

const PRIORITY_OPTIONS: { key: 'all' | TaskPriority; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'high', label: '高优先级' },
  { key: 'medium', label: '中优先级' },
  { key: 'low', label: '低优先级' },
];

const STATUS_OPTIONS: { key: 'all' | TaskStatus; label: string }[] = [
  { key: 'all', label: '全部状态' },
  { key: 'pending', label: '待处理' },
  { key: 'in_progress', label: '进行中' },
  { key: 'completed', label: '已完成' },
];

const TONE_CLASSES: Record<string, string> = {
  default: 'text-foreground',
  green: 'text-[hsl(160_70%_50%)]',
  cyan: 'text-primary',
  amber: 'text-[hsl(38_90%_55%)]',
  red: 'text-destructive',
};

function isOverdue(dueDate: string | undefined): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return due < today;
}

function StatMini({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: 'default' | 'green' | 'cyan' | 'amber' | 'red';
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-secondary/30 px-3 py-2.5">
      <div className={`flex items-center gap-1.5 ${TONE_CLASSES[tone]}`}>
        {icon}
        <span className="text-lg font-mono font-bold">{value}</span>
      </div>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

const SimpleTaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');

  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formRelatedSkills, setFormRelatedSkills] = useState<string>('');
  const [formEstimatedTime, setFormEstimatedTime] = useState<string>('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formTaskType, setFormTaskType] = useState<TaskType>('learning');
  const [formDueDate, setFormDueDate] = useState<string>('');

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      setError('加载任务失败，请刷新页面重试');
      logger.error('加载任务失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t: Task) => t.status === 'completed').length;
    const inProgress = tasks.filter((t: Task) => t.status === 'in_progress').length;
    const pending = tasks.filter((t: Task) => t.status === 'pending').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, completionRate };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t: Task) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, priorityFilter, statusFilter]);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormRelatedSkills('');
    setFormEstimatedTime('');
    setFormPriority('medium');
    setFormTaskType('learning');
    setFormDueDate('');
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogMode('create');
    setEditingTask(null);
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setDialogMode('edit');
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormRelatedSkills((task.relatedSkills || []).join(', '));
    setFormEstimatedTime(task.estimatedTime ? String(task.estimatedTime) : '');
    setFormPriority(task.priority);
    setFormTaskType(task.taskType);
    setFormDueDate(task.dueDate || '');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      const relatedSkills = formRelatedSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const estimatedTimeNum = formEstimatedTime ? Number(formEstimatedTime) : 0;

      if (dialogMode === 'create') {
        const dto: CreateTaskDto = {
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          relatedSkills: relatedSkills.length > 0 ? relatedSkills : undefined,
          estimatedTime: estimatedTimeNum || undefined,
          priority: formPriority,
          taskType: formTaskType,
          dueDate: formDueDate || undefined,
        };
        const newTask = await createTask(dto);
        setTasks((prev) => [...prev, newTask]);
        toast.success('任务创建成功');
      } else if (editingTask) {
        const dto: UpdateTaskDto = {
          title: formTitle.trim(),
          description: formDescription.trim(),
          relatedSkills,
          estimatedTime: estimatedTimeNum,
          priority: formPriority,
          taskType: formTaskType,
          dueDate: formDueDate || undefined,
        };
        const updated = await updateTask(editingTask.id, dto);
        setTasks((prev) => prev.map((t: Task) => (t.id === updated.id ? updated : t)));
        toast.success('任务已更新');
      }
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      logger.error('提交任务失败', err);
      toast.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t: Task) => t.id !== id));
      toast.success('任务已删除');
    } catch (err) {
      logger.error('删除任务失败', err);
      toast.error('删除失败');
    }
  };

  const handleStatusAdvance = async (task: Task) => {
    const nextStatus = STATUS_FLOW[task.status];
    if (!nextStatus) return;
    try {
      const updated = await updateTask(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t: Task) => (t.id === task.id ? updated : t)));
    } catch (err) {
      logger.error('更新任务状态失败', err);
      toast.error('更新失败');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await updateTask(task.id, { status: newStatus });
      setTasks((prev) => prev.map((t: Task) => (t.id === task.id ? updated : t)));
    } catch (err) {
      logger.error('更新任务状态失败', err);
      toast.error('更新失败');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold">任务管理</h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理你的学习与求职任务，追踪进度与截止日期
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              新建任务
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {dialogMode === 'create' ? '新增任务' : '编辑任务'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="simple-task-title">任务标题 *</Label>
                <Input
                  id="simple-task-title"
                  placeholder="输入任务标题"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="simple-task-desc">任务描述</Label>
                <Textarea
                  id="simple-task-desc"
                  placeholder="输入任务描述"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="simple-task-priority">优先级</Label>
                  <Select
                    value={formPriority}
                    onValueChange={(val) => setFormPriority(val as TaskPriority)}
                  >
                    <SelectTrigger id="simple-task-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">高优先级</SelectItem>
                      <SelectItem value="medium">中优先级</SelectItem>
                      <SelectItem value="low">低优先级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="simple-task-type">任务类型</Label>
                  <Select
                    value={formTaskType}
                    onValueChange={(val) => setFormTaskType(val as TaskType)}
                  >
                    <SelectTrigger id="simple-task-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="learning">学习</SelectItem>
                      <SelectItem value="job_search">求职</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="simple-task-est">预计时间（小时）</Label>
                  <Input
                    id="simple-task-est"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="如 2"
                    value={formEstimatedTime}
                    onChange={(e) => setFormEstimatedTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="simple-task-due">截止日期</Label>
                  <Input
                    id="simple-task-due"
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="simple-task-skills">关联技能</Label>
                <Input
                  id="simple-task-skills"
                  placeholder="多个技能用逗号分隔，如 React, TypeScript"
                  value={formRelatedSkills}
                  onChange={(e) => setFormRelatedSkills(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button onClick={handleSubmit} disabled={!formTitle.trim() || submitting}>
                {submitting
                  ? '提交中...'
                  : dialogMode === 'create'
                  ? '创建'
                  : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress Card */}
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-5xl font-mono font-bold text-primary">
                  {stats.completionRate}%
                </span>
                <span className="text-sm text-muted-foreground">任务完成率</span>
              </div>
              <Progress value={stats.completionRate} className="h-2.5" />
              <p className="mt-2 text-xs text-muted-foreground">
                已完成 {stats.completed} / {stats.total} 个任务
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 lg:border-l lg:border-border lg:pl-6">
              <StatMini label="总任务" value={stats.total} tone="default" icon={<ListTodo className="h-4 w-4" />} />
              <StatMini label="已完成" value={stats.completed} tone="green" icon={<CheckCircle2 className="h-4 w-4" />} />
              <StatMini label="进行中" value={stats.inProgress} tone="cyan" icon={<PlayCircle className="h-4 w-4" />} />
              <StatMini label="待处理" value={stats.pending} tone="amber" icon={<Clock className="h-4 w-4" />} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center mr-1">优先级：</span>
            {PRIORITY_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                variant={priorityFilter === opt.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriorityFilter(opt.key)}
                className={priorityFilter === opt.key ? 'bg-primary text-primary-foreground' : ''}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <span className="text-sm text-muted-foreground self-center mr-1">状态：</span>
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                variant={statusFilter === opt.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(opt.key)}
                className={statusFilter === opt.key ? 'bg-primary text-primary-foreground' : ''}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader className="h-5 w-5 animate-spin mr-2" />
          加载中...
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">加载失败</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={fetchTasks}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ListTodo className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <p>暂无符合条件的任务</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-ai-section-type="card-list">
          {filteredTasks.map((task: Task) => {
            const isCompleted = task.status === 'completed';
            const isExpanded = expandedId === task.id;
            const overdue = !isCompleted && isOverdue(task.dueDate);

            return (
              <Card
                key={task.id}
                className={`overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg cursor-pointer ${
                  isCompleted ? 'opacity-60' : ''
                }`}
                onClick={() => toggleExpand(task.id)}
              >
                <div className="flex">
                  <div className={`w-1 shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                  <CardContent className="flex-1 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <h4
                            className={`text-base font-semibold leading-snug ${
                              isCompleted ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {task.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-[11px] ${PRIORITY_BADGE[task.priority]}`}
                          >
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                          <Badge variant="secondary" className="shrink-0 text-[11px]">
                            {TYPE_LABELS[task.taskType]}
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                          {task.relatedSkills && task.relatedSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {task.relatedSkills.slice(0, isExpanded ? undefined : 3).map(
                                (skill: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-[10px]">
                                    {skill}
                                  </Badge>
                                ),
                              )}
                              {!isExpanded && task.relatedSkills.length > 3 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{task.relatedSkills.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                          {task.dueDate && (
                            <span
                              className={`flex items-center gap-1 text-xs ${
                                overdue ? 'text-[hsl(0_84%_60%)] font-medium' : 'text-muted-foreground'
                              }`}
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              {task.dueDate}
                              {overdue && ' · 已过期'}
                            </span>
                          )}
                          {task.estimatedTime ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {task.estimatedTime}h
                            </span>
                          ) : null}
                        </div>

                        {isExpanded && task.description && (
                          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {isExpanded && (
                          <div
                            className="mt-4 flex items-center gap-2 pt-3 border-t border-border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!isCompleted && (
                              <Button
                                size="sm"
                                variant="default"
                                className="flex-1"
                                onClick={() => handleStatusAdvance(task)}
                              >
                                {task.status === 'pending' ? (
                                  <>
                                    <PlayCircle className="h-4 w-4" />
                                    开始
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    完成
                                  </>
                                )}
                              </Button>
                            )}
                            {isCompleted && (
                              <div className="flex-1 text-xs text-center text-muted-foreground">
                                已完成
                              </div>
                            )}
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(task)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div
                        className="shrink-0 pt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => handleToggleComplete(task)}
                          className="h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
                    </div>
                    <div className="flex justify-center mt-1 text-muted-foreground/60">
                      <ChevronRight
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default SimpleTaskList;
