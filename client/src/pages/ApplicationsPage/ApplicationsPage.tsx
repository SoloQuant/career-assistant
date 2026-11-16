import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  BriefcaseIcon,
  MapPinIcon,
  CalendarIcon,
  BanknoteIcon,
  TagIcon,
  SendIcon,
  FileQuestionIcon,
  MessageSquareIcon,
  TrophyIcon,
  XCircleIcon,
} from 'lucide-react';
import {
  APPLICATION_STATUS_LABELS,
  type Application,
  type CreateApplicationDto,
  type UpdateApplicationDto,
} from '@shared/api.interface';
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from '@/api/applications';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type StatusKey =
  | 'all'
  | 'submitted'
  | 'written_test'
  | 'interview'
  | 'offer'
  | 'rejection';

const STATUS_OPTIONS: { key: StatusKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'submitted', label: '已投递' },
  { key: 'written_test', label: '笔试' },
  { key: 'interview', label: '面试' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejection', label: '拒信' },
];

const TYPE_LABELS: Record<string, string> = {
  campus: '校招',
  internship: '实习',
  full_time: '全职',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; step: string }> = {
  submitted: {
    bg: 'bg-[hsl(210_90%_60%)]/15',
    text: 'text-[hsl(210_90%_60%)]',
    border: 'border-[hsl(210_90%_60%)]/30',
    dot: 'bg-[hsl(210_90%_60%)]',
    step: 'bg-[hsl(210_90%_60%)]',
  },
  written_test: {
    bg: 'bg-[hsl(270_80%_65%)]/15',
    text: 'text-[hsl(270_80%_65%)]',
    border: 'border-[hsl(270_80%_65%)]/30',
    dot: 'bg-[hsl(270_80%_65%)]',
    step: 'bg-[hsl(270_80%_65%)]',
  },
  interview: {
    bg: 'bg-primary/15',
    text: 'text-primary',
    border: 'border-primary/30',
    dot: 'bg-primary',
    step: 'bg-primary',
  },
  offer: {
    bg: 'bg-[hsl(160_70%_50%)]/15',
    text: 'text-[hsl(160_70%_50%)]',
    border: 'border-[hsl(160_70%_50%)]/30',
    dot: 'bg-[hsl(160_70%_50%)]',
    step: 'bg-[hsl(160_70%_50%)]',
  },
  rejection: {
    bg: 'bg-[hsl(0_84%_60%)]/15',
    text: 'text-[hsl(0_84%_60%)]',
    border: 'border-[hsl(0_84%_60%)]/30',
    dot: 'bg-[hsl(0_84%_60%)]',
    step: 'bg-[hsl(0_84%_60%)]',
  },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  submitted: <SendIcon className="h-4 w-4" />,
  written_test: <FileQuestionIcon className="h-4 w-4" />,
  interview: <MessageSquareIcon className="h-4 w-4" />,
  offer: <TrophyIcon className="h-4 w-4" />,
  rejection: <XCircleIcon className="h-4 w-4" />,
};

const STEP_ORDER: string[] = ['submitted', 'written_test', 'interview', 'offer'];

const EMPTY_FORM: CreateApplicationDto = {
  company: '',
  position: '',
  city: '',
  salary: '',
  applicationDate: new Date().toISOString().slice(0, 10),
  status: 'submitted',
  applicationType: 'full_time',
  source: '',
  notes: '',
};

const ApplicationsPage = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] =
    useState<CreateApplicationDto>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApplications();
      setApplications(data);
    } catch (error) {
      logger.error('加载投递记录失败', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filtered = applications
    .filter((app: Application) =>
      statusFilter === 'all' ? true : app.status === statusFilter,
    )
    .sort(
      (a: Application, b: Application) =>
        new Date(b.applicationDate).getTime() -
        new Date(a.applicationDate).getTime(),
    );

  const stats = {
    submitted: applications.filter(
      (a: Application) => a.status === 'submitted',
    ).length,
    written_test: applications.filter(
      (a: Application) => a.status === 'written_test',
    ).length,
    interview: applications.filter(
      (a: Application) => a.status === 'interview',
    ).length,
    offer: applications.filter(
      (a: Application) => a.status === 'offer',
    ).length,
    rejection: applications.filter(
      (a: Application) => a.status === 'rejection',
    ).length,
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (app: Application) => {
    setEditingId(app.id);
    setFormData({
      company: app.company,
      position: app.position,
      city: app.city,
      salary: app.salary,
      applicationDate: app.applicationDate.slice(0, 10),
      status: app.status,
      applicationType: app.applicationType,
      source: app.source,
      notes: app.notes,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.company.trim() || !formData.position.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await updateApplication(
          editingId,
          formData as UpdateApplicationDto,
        );
        setApplications((prev) =>
          prev.map((a: Application) => (a.id === editingId ? updated : a)),
        );
      } else {
        const created = await createApplication(formData);
        setApplications((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
    } catch (error) {
      logger.error('保存投递记录失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApplication(id);
      setApplications((prev) =>
        prev.filter((a: Application) => a.id !== id),
      );
      setDeletingId(null);
    } catch (error) {
      logger.error('删除投递记录失败', error);
    }
  };

  const updateField = <K extends keyof CreateApplicationDto>(
    key: K,
    value: CreateApplicationDto[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const getStepIndex = (status: string): number => {
    if (status === 'rejection') return -1;
    return STEP_ORDER.indexOf(status);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold">投递记录</h2>
          <p className="text-sm text-muted-foreground mt-1">
            追踪每一次投递进展，把握求职节奏
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <PlusIcon className="h-4 w-4" />
          新增投递
        </Button>
      </div>

      {/* 5 status stat cards */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
        data-ai-section-type="card-stat"
      >
        <StatusCard
          label="已投递"
          value={stats.submitted}
          status="submitted"
          loading={loading}
        />
        <StatusCard
          label="笔试"
          value={stats.written_test}
          status="written_test"
          loading={loading}
        />
        <StatusCard
          label="面试"
          value={stats.interview}
          status="interview"
          loading={loading}
        />
        <StatusCard
          label="Offer"
          value={stats.offer}
          status="offer"
          loading={loading}
        />
        <StatusCard
          label="拒信"
          value={stats.rejection}
          status="rejection"
          loading={loading}
        />
      </div>

      {/* 状态筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                variant={statusFilter === opt.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(opt.key)}
                className={
                  statusFilter === opt.key
                    ? 'bg-primary text-primary-foreground'
                    : ''
                }
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyMedia variant="icon">
                <BriefcaseIcon />
              </EmptyMedia>
              <EmptyContent>
                <EmptyTitle>暂无投递记录</EmptyTitle>
                <EmptyDescription>
                  点击右上角「新增投递」开始记录你的求职历程
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="relative" data-ai-section-type="card-list">
          {/* timeline vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
          <div className="space-y-4 pl-8">
            {filtered.map((app: Application, idx: number) => {
              const color = STATUS_COLORS[app.status] ?? STATUS_COLORS.submitted;
              const isRejection = app.status === 'rejection';
              const currentStep = getStepIndex(app.status);

              return (
                <div key={app.id} className="relative">
                  {/* timeline dot */}
                  <span
                    className={`absolute -left-8 top-6 flex h-[30px] w-[30px] items-center justify-center rounded-full ${color.dot} text-white shadow-lg ring-4 ring-background z-10`}
                    aria-hidden="true"
                  >
                    <span className="scale-90">
                      {STATUS_ICONS[app.status]}
                    </span>
                  </span>

                  <Card
                    className="transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg overflow-hidden"
                  >
                    <div className={`w-full h-1 ${color.dot}`} />
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold">
                              {app.position}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`${color.bg} ${color.text} ${color.border} hover:${color.bg}`}
                            >
                              {APPLICATION_STATUS_LABELS[app.status]}
                            </Badge>
                            <Badge variant="outline">
                              {TYPE_LABELS[app.applicationType] ||
                                app.applicationType}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BriefcaseIcon className="h-3.5 w-3.5" />
                              {app.company}
                            </span>
                            {app.city && (
                              <span className="flex items-center gap-1">
                                <MapPinIcon className="h-3.5 w-3.5" />
                                {app.city}
                              </span>
                            )}
                            {app.salary && (
                              <span className="flex items-center gap-1">
                                <BanknoteIcon className="h-3.5 w-3.5" />
                                {app.salary}
                              </span>
                            )}
                            {app.source && (
                              <span className="flex items-center gap-1">
                                <TagIcon className="h-3.5 w-3.5" />
                                来源：{app.source}
                              </span>
                            )}
                          </div>

                          {app.notes && (
                            <p className="text-sm text-muted-foreground">
                              备注：{app.notes}
                            </p>
                          )}

                          {/* Progress steps */}
                          <div className="mt-3 flex items-center gap-1">
                            {STEP_ORDER.map((step, i) => {
                              const stepColor = STATUS_COLORS[step];
                              const isActive = !isRejection && i <= currentStep;
                              const isCurrent = i === currentStep && !isRejection;
                              return (
                                <div key={step} className="flex items-center flex-1">
                                  <div
                                    className={`flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-medium transition-colors ${
                                      isActive
                                        ? `${stepColor.step} text-white`
                                        : 'bg-secondary text-muted-foreground'
                                    } ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}
                                  >
                                    {i + 1}
                                  </div>
                                  {i < STEP_ORDER.length - 1 && (
                                    <div
                                      className={`flex-1 h-0.5 mx-0.5 transition-colors ${
                                        !isRejection && i < currentStep
                                          ? stepColor.step
                                          : 'bg-secondary'
                                      }`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                            {isRejection && (
                              <div className="ml-2 flex items-center gap-1 text-[hsl(0_84%_60%)] text-xs">
                                <XCircleIcon className="h-3.5 w-3.5" />
                                已结束
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex md:flex-col md:items-end gap-2">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground md:order-2">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {app.applicationDate.slice(0, 10)}
                          </span>
                          <div className="flex gap-2 md:order-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(app)}
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                              编辑
                            </Button>
                            <AlertDialog
                              open={deletingId === app.id}
                              onOpenChange={(open) => {
                                if (!open) setDeletingId(null);
                              }}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeletingId(app.id)}
                                >
                                  <Trash2Icon className="h-3.5 w-3.5" />
                                  删除
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除？</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    删除后将无法恢复，确定要删除「{app.company} - {app.position}」这条投递记录吗？
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDelete(app.id)}
                                  >
                                    确认删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? '编辑投递记录' : '新增投递记录'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="company">公司 *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => updateField('company', e.target.value)}
                placeholder="请输入公司名称"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="position">岗位 *</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => updateField('position', e.target.value)}
                placeholder="请输入岗位名称"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="city">城市</Label>
                <Input
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="如：大连"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="salary">薪资</Label>
                <Input
                  id="salary"
                  value={formData.salary || ''}
                  onChange={(e) => updateField('salary', e.target.value)}
                  placeholder="如：15-25K"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>状态</Label>
                <Select
                  value={formData.status || 'submitted'}
                  onValueChange={(val) =>
                    updateField(
                      'status',
                      val as CreateApplicationDto['status'],
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">已投递</SelectItem>
                    <SelectItem value="written_test">笔试</SelectItem>
                    <SelectItem value="interview">面试</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="rejection">拒信</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>类型</Label>
                <Select
                  value={formData.applicationType || 'full_time'}
                  onValueChange={(val) =>
                    updateField(
                      'applicationType',
                      val as CreateApplicationDto['applicationType'],
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campus">校招</SelectItem>
                    <SelectItem value="internship">实习</SelectItem>
                    <SelectItem value="full_time">全职</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="date">投递日期</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.applicationDate || ''}
                  onChange={(e) =>
                    updateField('applicationDate', e.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="source">来源</Label>
                <Input
                  id="source"
                  value={formData.source || ''}
                  onChange={(e) => updateField('source', e.target.value)}
                  placeholder="如：牛客网、官网"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="记录面试感受、内推人等信息"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

interface StatusCardProps {
  label: string;
  value: number;
  status: string;
  loading?: boolean;
}

function StatusCard({ label, value, status, loading }: StatusCardProps) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.submitted;
  const icon = STATUS_ICONS[status] ?? null;

  return (
    <Card className="transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg overflow-hidden">
      <div className={`w-full h-1 ${color.dot}`} />
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className={`${color.text}`}>{icon}</div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <div className={`text-3xl font-mono font-bold ${color.text}`}>
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ApplicationsPage;
