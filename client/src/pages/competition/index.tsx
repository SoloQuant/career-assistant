import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Trophy,
  Target,
  FileText,
  Calendar,
  Rocket,
  Lightbulb,
  Code,
  Award,
  Clock,
  CheckCircle,
  ChevronDown,
  Download,
  ExternalLink,
  CheckCircle2,
  Circle,
  Sparkles,
  Users,
  Globe,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import * as competitionApi from '@/api/competition';
import { updateSubTask } from '@/api/task-group';
import type {
  CompetitionInfo,
  CompetitionEntry,
  CompetitionReminderItem,
  TaskGroup,
  TaskMilestone,
  TaskSubTask,
  ProjectDocResponse,
  ProjectDocSection,
  TechStackItem,
  FeatureModule,
  CompetitionAward,
} from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

// ---- Status label mapping ----
const STATUS_LABELS: Record<string, { label: string; variant: string }> = {
  upcoming: { label: '即将开始', variant: 'secondary' },
  registering: { label: '报名中', variant: 'default' },
  ongoing: { label: '进行中', variant: 'default' },
  ended: { label: '已结束', variant: 'outline' },
};

const REMINDER_TYPE_LABELS: Record<string, string> = {
  registration: '报名',
  submission: '提交',
  competition: '比赛',
  other: '其他',
};

// ---- Timeline event type ----
interface TimelineEvent {
  key: string;
  label: string;
  date?: string;
  type: 'registration' | 'submission' | 'competition' | 'other';
}

// ---- Build timeline from competition info ----
function buildTimeline(info: CompetitionInfo): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (info.registrationStart) {
    events.push({
      key: 'reg-start',
      label: '报名开始',
      date: info.registrationStart,
      type: 'registration',
    });
  }
  if (info.registrationEnd) {
    events.push({
      key: 'reg-end',
      label: '报名截止',
      date: info.registrationEnd,
      type: 'registration',
    });
  }
  if (info.submissionDeadline) {
    events.push({
      key: 'submission',
      label: '作品提交截止',
      date: info.submissionDeadline,
      type: 'submission',
    });
  }
  if (info.competitionStart) {
    events.push({
      key: 'preliminary',
      label: '初赛',
      date: info.competitionStart,
      type: 'competition',
    });
  }
  if (info.competitionEnd) {
    events.push({
      key: 'final',
      label: '决赛',
      date: info.competitionEnd,
      type: 'competition',
    });
  }
  return events;
}

// ---- Format date helper ----
function formatDateShort(isoString: string): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}月${day}日`;
  } catch {
    return '--';
  }
}

function formatDateFull(isoString: string): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return '--';
  }
}

// ====== Banner Section ======
interface BannerProps {
  info: CompetitionInfo | null;
  loading: boolean;
}

const BannerSection = ({ info, loading }: BannerProps) => {
  if (loading || !info) {
    return (
      <Card className="mb-6 border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="p-8">
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-5 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </CardContent>
      </Card>
    );
  }

  const statusInfo = STATUS_LABELS[info.status] || STATUS_LABELS.upcoming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="mb-6 overflow-hidden border-border/60 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardContent className="p-8 relative">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                  <Trophy className="size-6" />
                </div>
                <Badge
                  variant={statusInfo.variant as 'default' | 'secondary' | 'outline'}
                  className="text-xs"
                >
                  {statusInfo.label}
                </Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                {info.name}
              </h2>
              {info.description && (
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {info.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {info.organizer && (
                  <Badge variant="secondary" className="gap-1.5">
                    <Users className="size-3" />
                    {info.organizer}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 items-start md:items-end">
              <Badge variant="outline" className="gap-1.5 text-sm py-1.5">
                <Target className="size-4" />
                AI WEB网页开发挑战赛
              </Badge>
              {info.officialUrl && (
                <Button variant="default" size="sm" asChild>
                  <UniversalLink
                    to={info.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    官网链接
                  </UniversalLink>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ====== Tab 1: Competition Detail ======
interface DetailTabProps {
  info: CompetitionInfo | null;
  reminders: CompetitionReminderItem[];
  loading: boolean;
  error: string | null;
}

const DetailTab = ({ info, reminders, loading, error }: DetailTabProps) => {
  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-8 text-center">
          <p className="text-destructive font-medium">加载失败：{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading || !info) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1, 2, 3].map((i: number) => (
          <Card key={i} className="border-border/60">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const timeline = buildTimeline(info);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 上半：简介 + 赛道介绍 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              比赛简介
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {info.description || '暂无简介'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="size-4 text-primary" />
              赛道介绍
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {info.trackIntroduction || '暂无赛道介绍'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 参赛要求 */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            参赛要求
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {info.requirements || '暂无参赛要求'}
          </p>
        </CardContent>
      </Card>

      {/* 奖项设置 */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Award className="size-4 text-amber-500" />
            奖项设置
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {info.awardsConfig && info.awardsConfig.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {info.awardsConfig.map((award: CompetitionAward, idx: number) => (
                <div
                  key={award.name + idx}
                  className="p-4 rounded-lg border border-border/60 bg-gradient-to-br from-primary/5 to-transparent"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="size-4 text-amber-500" />
                    <span className="font-semibold text-sm">{award.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {award.level} · {award.count} 名
                  </p>
                  {award.description && (
                    <p className="text-xs text-muted-foreground/80">
                      {award.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无奖项信息</p>
          )}
        </CardContent>
      </Card>

      {/* 重要时间节点时间线 */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            重要时间节点
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {timeline.length > 0 ? (
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-5">
                {timeline.map((event: TimelineEvent, idx: number) => (
                  <div key={event.key} className="relative flex items-start gap-4 pl-10">
                    <div
                      className={`absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background shadow-sm ${
                        event.type === 'registration'
                          ? 'bg-emerald-500'
                          : event.type === 'submission'
                            ? 'bg-amber-500'
                            : event.type === 'competition'
                              ? 'bg-primary'
                              : 'bg-slate-400'
                      }`}
                    >
                      {event.type === 'registration' ? (
                        <Users className="size-4 text-white" />
                      ) : event.type === 'submission' ? (
                        <FileText className="size-4 text-white" />
                      ) : event.type === 'competition' ? (
                        <Trophy className="size-4 text-white" />
                      ) : (
                        <Clock className="size-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{event.label}</p>
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {REMINDER_TYPE_LABELS[event.type] || event.type}
                        </Badge>
                      </div>
                      {event.date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateFull(event.date)}
                        </p>
                      )}
                    </div>
                    {idx === 0 && reminders.some((r: CompetitionReminderItem) => r.type === event.type) && (
                      <Badge variant="outline" className="text-xs">
                        {reminders.find((r: CompetitionReminderItem) => r.type === event.type)?.daysLeft} 天后
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无时间节点</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ====== Tab 2: Competition Work ======
interface WorkTabProps {
  work: CompetitionEntry | null;
  loading: boolean;
  error: string | null;
}

const WorkTab = ({ work, loading, error }: WorkTabProps) => {
  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-8 text-center">
          <p className="text-destructive font-medium">加载失败：{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading || !work) {
    return (
      <div className="space-y-6">
        <Card className="border-border/60">
          <CardHeader><Skeleton className="h-7 w-1/2" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5].map((i: number) => (
              <Skeleton key={i} className="h-6 w-20" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    reviewing: '评审中',
    awarded: '已获奖',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 作品名称 + 简介 */}
      <Card className="border-border/60 bg-card/80 backdrop-blur overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-cyan-400 to-primary" />
        <CardHeader className="pb-3 flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Rocket className="size-5 text-primary" />
              {work.projectName}
            </CardTitle>
            <CardDescription className="mt-2">
              {work.projectIntro || '暂无作品简介'}
            </CardDescription>
          </div>
          <Badge variant="default">{statusLabel[work.status] || work.status}</Badge>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 mt-2">
            {work.projectUrl && (
              <Button variant="outline" size="sm" asChild>
                <UniversalLink
                  to={work.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="size-4" />
                  项目地址
                </UniversalLink>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 技术栈 */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Code className="size-4 text-primary" />
            技术栈
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {work.techStack && work.techStack.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {work.techStack.map((tech: TechStackItem, idx: number) => (
                <Badge
                  key={tech.name + idx}
                  variant="secondary"
                  className="text-sm py-1 px-3"
                >
                  {tech.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无技术栈信息</p>
          )}
        </CardContent>
      </Card>

      {/* 功能模块 */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            功能模块
            <Badge variant="outline" className="ml-2">
              {work.featureModules?.length || 0} 个
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {work.featureModules && work.featureModules.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {work.featureModules.map((mod: FeatureModule, idx: number) => (
                <div
                  key={mod.name + idx}
                  className="p-3 rounded-lg border border-border/60 bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <span className="text-[10px] font-bold text-primary">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{mod.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无功能模块</p>
          )}
        </CardContent>
      </Card>

      {/* 创新亮点 */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lightbulb className="size-4 text-amber-500" />
            创新亮点
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {work.highlights ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {work.highlights.split('\n').filter(Boolean).map((line: string, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-border/60 bg-gradient-to-br from-amber-500/5 to-transparent"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                      <Lightbulb className="size-4" />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {line.replace(/^[-•*]\s*/, '')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无创新亮点</p>
          )}
        </CardContent>
      </Card>

      {/* 团队信息 */}
      {work.teamInfo && work.teamInfo.length > 0 && (
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="size-4 text-primary" />
              团队成员
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-4">
              {work.teamInfo.map((member, idx: number) => (
                <div
                  key={member.name + idx}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

// ====== Tab 3: Prep Plan ======
interface PrepTabProps {
  prepGroup: TaskGroup | null;
  setPrepGroup: React.Dispatch<React.SetStateAction<TaskGroup | null>>;
  loading: boolean;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
}

const PrepTab = ({
  prepGroup,
  setPrepGroup,
  loading,
  generating,
  error,
  onGenerate,
}: PrepTabProps) => {
  const navigate = useNavigate();

  const handleToggleSubTask = useCallback(
    async (subTaskId: string, currentCompleted: boolean) => {
      // 乐观更新
      setPrepGroup((prev: TaskGroup | null) => {
        if (!prev) return prev;
        let completedDelta = 0;
        const newMilestones = prev.milestones.map((m: TaskMilestone) => {
          const newSubTasks = m.subTasks.map((st: TaskSubTask) => {
            if (st.id === subTaskId) {
              const newCompleted = !currentCompleted;
              completedDelta = newCompleted ? 1 : -1;
              return { ...st, isCompleted: newCompleted };
            }
            return st;
          });
          const completedCount = newSubTasks.filter(
            (s: TaskSubTask) => s.isCompleted,
          ).length;
          const total = newSubTasks.length;
          return {
            ...m,
            subTasks: newSubTasks,
            completedSubTasks: completedCount,
            progress: total > 0 ? Math.round((completedCount / total) * 100) : 0,
          };
        });
        const totalCompleted =
          prev.completedSubTasks + completedDelta;
        const totalAll = prev.totalSubTasks;
        return {
          ...prev,
          milestones: newMilestones,
          completedSubTasks: totalCompleted,
          progress:
            totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0,
        };
      });

      try {
        await updateSubTask(subTaskId, {
          isCompleted: !currentCompleted,
        });
      } catch (err) {
        logger.error('更新子任务状态失败', err);
        // 回滚
        setPrepGroup((prev: TaskGroup | null) => {
          if (!prev) return prev;
          const newMilestones = prev.milestones.map((m: TaskMilestone) => {
            const newSubTasks = m.subTasks.map((st: TaskSubTask) => {
              if (st.id === subTaskId) {
                return { ...st, isCompleted: currentCompleted };
              }
              return st;
            });
            const completedCount = newSubTasks.filter(
              (s: TaskSubTask) => s.isCompleted,
            ).length;
            const total = newSubTasks.length;
            return {
              ...m,
              subTasks: newSubTasks,
              completedSubTasks: completedCount,
              progress:
                total > 0 ? Math.round((completedCount / total) * 100) : 0,
            };
          });
          const totalCompleted = newMilestones.reduce(
            (sum: number, m: TaskMilestone) => sum + m.completedSubTasks,
            0,
          );
          const totalAll = prev.totalSubTasks;
          return {
            ...prev,
            milestones: newMilestones,
            completedSubTasks: totalCompleted,
            progress:
              totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0,
          };
        });
      }
    },
    [setPrepGroup],
  );

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-8 text-center">
          <p className="text-destructive font-medium mb-4">加载失败：{error}</p>
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? '生成中...' : '生成备赛计划'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-border/60">
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
        {[0, 1, 2].map((i: number) => (
          <Card key={i} className="border-border/60">
            <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2].map((j: number) => (
                <Skeleton key={j} className="h-5 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // 未生成备赛计划
  if (!prepGroup) {
    return (
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Rocket className="size-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">还没有备赛计划</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            点击下方按钮，AI 将根据比赛信息和你的技能情况，自动生成一份个性化的备赛计划，助你有条不紊地备战。
          </p>
          <Button onClick={onGenerate} disabled={generating} size="lg">
            <Sparkles className="size-4" />
            {generating ? '正在生成备赛计划...' : '生成备赛计划'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 进度概览 */}
      <Card className="border-border/60 bg-card/80 backdrop-blur overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-cyan-400" />
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {prepGroup.title}
            </CardTitle>
            {prepGroup.description && (
              <CardDescription className="mt-1">
                {prepGroup.description}
              </CardDescription>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/tasks/group/${prepGroup.id}`)}
          >
            查看详情
            <ExternalLink className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">整体进度</span>
              <span className="font-semibold text-primary">
                {prepGroup.completedSubTasks} / {prepGroup.totalSubTasks} 项任务
              </span>
            </div>
            <Progress value={prepGroup.progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{prepGroup.progress}% 完成</span>
              <span>{prepGroup.totalMilestones} 个里程碑</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 里程碑列表 */}
      <div className="space-y-4">
        {prepGroup.milestones.map((milestone: TaskMilestone, mIdx: number) => (
          <Card
            key={milestone.id}
            className="border-border/60 bg-card/80 backdrop-blur"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan-500 text-white text-sm font-bold">
                    {mIdx + 1}
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {milestone.title}
                    </CardTitle>
                    {milestone.description && (
                      <CardDescription className="mt-0.5 text-xs">
                        {milestone.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {milestone.completedSubTasks}/{milestone.totalSubTasks}
                </Badge>
              </div>
              <div className="mt-3">
                <Progress value={milestone.progress} className="h-1.5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {milestone.subTasks.map((st: TaskSubTask) => (
                <div
                  key={st.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
                    st.isCompleted
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-border/60 hover:border-primary/40'
                  }`}
                >
                  <button
                    onClick={() => handleToggleSubTask(st.id, st.isCompleted)}
                    className="mt-0.5 shrink-0"
                    aria-label={st.isCompleted ? '标记为未完成' : '标记为已完成'}
                  >
                    {st.isCompleted ? (
                      <CheckCircle2 className="size-5 text-primary" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground/60 hover:text-primary transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        st.isCompleted
                          ? 'text-muted-foreground line-through'
                          : 'text-foreground'
                      }`}
                    >
                      {st.title}
                    </p>
                    {st.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {st.description}
                      </p>
                    )}
                    {st.estimatedMinutes > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground/70">
                        <Clock className="size-3" />
                        <span>预计 {st.estimatedMinutes} 分钟</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

// ====== Tab 4: Project Doc ======
interface DocTabProps {
  doc: ProjectDocResponse | null;
  loading: boolean;
  error: string | null;
}

const DocTab = ({ doc, loading, error }: DocTabProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((id: string) => {
    setExpandedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!doc) return;
    setExpandedIds(new Set(doc.sections.map((s: ProjectDocSection) => s.id)));
  }, [doc]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const handleExport = useCallback(() => {
    if (!doc) return;
    const lines: string[] = [];
    lines.push(`# ${doc.projectName}`);
    lines.push('');
    for (const section of doc.sections) {
      lines.push(`## ${section.title}`);
      lines.push('');
      lines.push(section.content);
      lines.push('');
    }
    const markdown = lines.join('\n');
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.projectName || 'project-doc'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [doc]);

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-8 text-center">
          <p className="text-destructive font-medium">加载失败：{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading || !doc) {
    return (
      <div className="space-y-4">
        {[0, 1, 2, 3, 4, 5].map((i: number) => (
          <Card key={i} className="border-border/60">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const sortedSections = [...doc.sections].sort(
    (a: ProjectDocSection, b: ProjectDocSection) => a.orderIndex - b.orderIndex,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            全部展开
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            全部收起
          </Button>
        </div>
        <Button onClick={handleExport} size="sm">
          <Download className="size-4" />
          导出文档
        </Button>
      </div>

      {/* 章节列表 */}
      <div className="space-y-3">
        {sortedSections.map((section: ProjectDocSection, idx: number) => {
          const isExpanded = expandedIds.has(section.id);
          return (
            <Card
              key={section.id}
              className="border-border/60 bg-card/80 backdrop-blur overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full"
              >
                <CardHeader className="pb-3 flex-row items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                      {idx + 1}
                    </div>
                    <CardTitle className="text-base font-semibold">
                      {section.title}
                    </CardTitle>
                  </div>
                  <ChevronDown
                    className={`size-4 text-muted-foreground transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </CardHeader>
              </button>
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0 pb-6">
                      <div className="pl-10 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {section.content}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
};

// ====== Main Page ======
const CompetitionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('detail');
  const [info, setInfo] = useState<CompetitionInfo | null>(null);
  const [work, setWork] = useState<CompetitionEntry | null>(null);
  const [reminders, setReminders] = useState<CompetitionReminderItem[]>([]);
  const [prepGroup, setPrepGroup] = useState<TaskGroup | null>(null);
  const [doc, setDoc] = useState<ProjectDocResponse | null>(null);

  const [infoLoading, setInfoLoading] = useState(true);
  const [workLoading, setWorkLoading] = useState(true);
  const [prepLoading, setPrepLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [infoError, setInfoError] = useState<string | null>(null);
  const [workError, setWorkError] = useState<string | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  // 加载比赛信息 + 提醒
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setInfoLoading(true);
      setInfoError(null);
      try {
        const [infoData, remindersData] = await Promise.all([
          competitionApi.getCompetitionInfo(),
          competitionApi.getCompetitionReminders(),
        ]);
        if (!cancelled) {
          setInfo(infoData);
          setReminders(remindersData);
        }
      } catch (err) {
        if (!cancelled) {
          setInfoError(err instanceof Error ? err.message : '加载失败');
        }
      } finally {
        if (!cancelled) setInfoLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 加载参赛作品
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setWorkLoading(true);
      setWorkError(null);
      try {
        const data = await competitionApi.getCompetitionWork();
        if (!cancelled) setWork(data);
      } catch (err) {
        if (!cancelled) {
          setWorkError(err instanceof Error ? err.message : '加载失败');
        }
      } finally {
        if (!cancelled) setWorkLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 加载备赛计划（如果已有）
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setPrepLoading(true);
      setPrepError(null);
      try {
        // 尝试从 reminders 或其他入口判断是否已有计划，这里先假定没有
        // 实际应根据后端接口设计调用列表查询
        // 暂时留空，点击生成后再显示
        setPrepGroup(null);
      } catch (err) {
        if (!cancelled) {
          setPrepError(err instanceof Error ? err.message : '加载失败');
        }
      } finally {
        if (!cancelled) setPrepLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 加载项目文档
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setDocLoading(true);
      setDocError(null);
      try {
        const data = await competitionApi.getProjectDoc();
        if (!cancelled) setDoc(data);
      } catch (err) {
        if (!cancelled) {
          setDocError(err instanceof Error ? err.message : '加载失败');
        }
      } finally {
        if (!cancelled) setDocLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGeneratePrepPlan = useCallback(async () => {
    setGenerating(true);
    setPrepError(null);
    try {
      const data = await competitionApi.generatePrepPlan();
      setPrepGroup(data);
    } catch (err) {
      logger.error('生成备赛计划失败', err);
      setPrepError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* 顶部横幅 */}
      <BannerSection info={info} loading={infoLoading} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 h-10 p-1">
          <TabsTrigger value="detail" className="gap-1.5 px-4">
            <FileText className="size-4" />
            比赛详情
          </TabsTrigger>
          <TabsTrigger value="work" className="gap-1.5 px-4">
            <Rocket className="size-4" />
            参赛作品
          </TabsTrigger>
          <TabsTrigger value="prep" className="gap-1.5 px-4">
            <Target className="size-4" />
            备赛计划
          </TabsTrigger>
          <TabsTrigger value="doc" className="gap-1.5 px-4">
            <FileText className="size-4" />
            作品文档
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="detail">
            <DetailTab
              info={info}
              reminders={reminders}
              loading={infoLoading}
              error={infoError}
            />
          </TabsContent>

          <TabsContent value="work">
            <WorkTab work={work} loading={workLoading} error={workError} />
          </TabsContent>

          <TabsContent value="prep">
            <PrepTab
              prepGroup={prepGroup}
              setPrepGroup={setPrepGroup}
              loading={prepLoading}
              generating={generating}
              error={prepError}
              onGenerate={handleGeneratePrepPlan}
            />
          </TabsContent>

          <TabsContent value="doc">
            <DocTab doc={doc} loading={docLoading} error={docError} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CompetitionPage;
