import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  ListTodo,
  CheckCircle2,
  PlayCircle,
  TrendingUp,
  Plus,
  Target,
} from 'lucide-react';
import type { TaskGroupSummary, TaskOverviewStats } from '@shared/api.interface';
import { listGroups, getOverviewStats } from '@/api/task-group';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import TaskSplitDialog from './TaskSplitDialog';

const PRIORITY_LABELS: Record<string, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-[hsl(0_84%_60%)]/15 text-[hsl(0_84%_60%)] border-[hsl(0_84%_60%)]/30 hover:bg-[hsl(0_84%_60%)]/15',
  medium: 'bg-[hsl(38_90%_55%)]/15 text-[hsl(38_90%_55%)] border-[hsl(38_90%_55%)]/30 hover:bg-[hsl(38_90%_55%)]/15',
  low: 'bg-[hsl(160_70%_50%)]/15 text-[hsl(160_70%_50%)] border-[hsl(160_70%_50%)]/30 hover:bg-[hsl(160_70%_50%)]/15',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  delay?: number;
}

const StatCard = ({ title, value, icon, gradientFrom, gradientTo, delay = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Card className="group relative overflow-hidden border-border/60 bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {value}
            </p>
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
              boxShadow: `0 4px 14px ${gradientFrom}40`,
            }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: `radial-gradient(circle, ${gradientFrom}, transparent 70%)` }}
      />
    </Card>
  </motion.div>
);

interface TaskGroupListProps {
  refreshKey?: number;
}

const TaskGroupList = ({ refreshKey = 0 }: TaskGroupListProps) => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<TaskGroupSummary[]>([]);
  const [stats, setStats] = useState<TaskOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [groupsData, statsData] = await Promise.all([
        listGroups(),
        getOverviewStats(),
      ]);
      setGroups(groupsData);
      setStats(statsData);
    } catch (err) {
      setError('加载总任务列表失败');
      logger.error('加载总任务列表失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleCreated = () => {
    fetchData();
  };

  const handleCardClick = (id: string) => {
    navigate(`/tasks/group/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">加载失败</p>
            <p className="text-sm">{error}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchData}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            任务总览
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理复杂任务，通过里程碑和子任务追踪项目进度
          </p>
        </div>
        <Button onClick={() => setSplitOpen(true)}>
          <Sparkles className="h-4 w-4 mr-2" />
          创建总任务
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-ai-section-type="card-stat">
          <StatCard
            title="总任务数"
            value={stats.totalGroups}
            icon={<ListTodo className="h-5 w-5" />}
            gradientFrom="hsl(221, 83%, 53%)"
            gradientTo="hsl(190, 90%, 55%)"
            delay={0}
          />
          <StatCard
            title="进行中"
            value={stats.activeGroups}
            icon={<PlayCircle className="h-5 w-5" />}
            gradientFrom="hsl(260, 80%, 70%)"
            gradientTo="hsl(190, 90%, 55%)"
            delay={0.1}
          />
          <StatCard
            title="已完成"
            value={stats.completedGroups}
            icon={<CheckCircle2 className="h-5 w-5" />}
            gradientFrom="hsl(160, 70%, 50%)"
            gradientTo="hsl(140, 60%, 45%)"
            delay={0.2}
          />
          <StatCard
            title="整体进度"
            value={`${stats.overallProgress}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            gradientFrom="hsl(38, 90%, 55%)"
            gradientTo="hsl(30, 90%, 60%)"
            delay={0.3}
          />
        </div>
      )}

      {/* Group list */}
      {groups.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-16 text-center">
            <Sparkles className="mx-auto h-12 w-12 mb-4 text-primary/50" />
            <h3 className="text-lg font-medium mb-2">还没有总任务</h3>
            <p className="text-sm text-muted-foreground mb-6">
              使用 AI 智能拆分功能，一键将大任务拆分为里程碑和子任务
            </p>
            <Button onClick={() => setSplitOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              立即创建
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-ai-section-type="card-list">
          {groups.map((group, idx) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
            >
              <Card
                className="group relative h-full overflow-hidden border-border/60 bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
                onClick={() => handleCardClick(group.id)}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground flex-1 min-w-0 truncate">
                      {group.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-[11px] shrink-0 ${PRIORITY_BADGE[group.priority]}`}
                    >
                      {PRIORITY_LABELS[group.priority]}
                    </Badge>
                  </div>

                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {group.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[11px]">
                      {STATUS_LABELS[group.status]}
                    </Badge>
                    {group.relatedSkills && group.relatedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {group.relatedSkills.slice(0, 2).map((skill, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {skill}
                          </Badge>
                        ))}
                        {group.relatedSkills.length > 2 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{group.relatedSkills.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">进度</span>
                      <span className="font-mono font-medium text-primary">
                        {group.progress}%
                      </span>
                    </div>
                    <Progress value={group.progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <span>{group.totalMilestones} 个里程碑</span>
                    <span className="font-mono">
                      {group.completedSubTasks}/{group.totalSubTasks} 子任务
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <TaskSplitDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        onCreated={handleCreated}
      />
    </motion.div>
  );
};

export default TaskGroupList;
