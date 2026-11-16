import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  ListTodo,
  Target,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getTasksBySkill } from '@/api/task-group';
import type {
  TasksBySkillResponse,
  TaskGroupSummary,
  TaskMilestoneWithGroup,
  TaskSubTaskWithParents,
} from '@shared/api.interface';

interface RelatedTasksSectionProps {
  skillId: string;
}

const RelatedTasksSection = ({ skillId }: RelatedTasksSectionProps) => {
  const navigate = useNavigate();
  const [data, setData] = useState<TasksBySkillResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTasksBySkill(skillId)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err) => {
        logger.error('加载关联任务失败', err);
        if (!cancelled) toast.error('加载关联任务失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [skillId]);

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Sparkles className="h-3 w-3 animate-pulse" />
        加载关联任务中...
      </div>
    );
  }

  const hasAny =
    data &&
    (data.groups.length > 0 || data.milestones.length > 0 || data.subTasks.length > 0);

  if (!hasAny) {
    return (
      <div className="text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg p-3 text-center">
        暂无关联任务，去任务管理创建学习任务吧
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data!.groups.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">总任务</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {data!.groups.length}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {data!.groups.slice(0, 5).map((g) => (
              <GroupRow key={g.id} group={g} onClick={() => navigate(`/tasks/group/${g.id}`)} />
            ))}
            {data!.groups.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-muted-foreground"
                onClick={() => navigate('/tasks')}
              >
                查看全部 {data!.groups.length} 个总任务
                <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {data!.milestones.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ListTodo className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">里程碑</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {data!.milestones.length}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {data!.milestones.slice(0, 5).map((m) => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                onClick={() => navigate(`/tasks/group/${m.groupId}`)}
              />
            ))}
          </div>
        </div>
      )}

      {data!.subTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">子任务</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {data!.subTasks.length}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {data!.subTasks.slice(0, 5).map((st) => (
              <SubTaskRow
                key={st.id}
                subTask={st}
                onClick={() => navigate(`/tasks/group/${st.groupId}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function GroupRow({ group, onClick }: { group: TaskGroupSummary; onClick: () => void }) {
  return (
    <div
      className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium truncate flex-1">{group.title}</span>
        <span className="text-[10px] font-mono text-primary shrink-0">{group.progress}%</span>
      </div>
      <Progress value={group.progress} className="h-1" />
    </div>
  );
}

function MilestoneRow({
  milestone,
  onClick,
}: {
  milestone: TaskMilestoneWithGroup;
  onClick: () => void;
}) {
  return (
    <div
      className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="text-xs font-medium truncate">{milestone.title}</div>
      <div className="flex items-center gap-2 mt-0.5">
        <Progress value={milestone.progress} className="h-1 flex-1" />
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
          {milestone.progress}%
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
        来自：{milestone.groupTitle}
      </p>
    </div>
  );
}

function SubTaskRow({
  subTask,
  onClick,
}: {
  subTask: TaskSubTaskWithParents;
  onClick: () => void;
}) {
  return (
    <div
      className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors flex items-center gap-2"
      onClick={onClick}
    >
      {subTask.isCompleted ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      ) : (
        <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div
          className={`text-xs truncate ${
            subTask.isCompleted ? 'line-through text-muted-foreground' : ''
          }`}
        >
          {subTask.title}
        </div>
        <p className="text-[10px] text-muted-foreground truncate">
          {subTask.groupTitle} · {subTask.milestoneTitle}
        </p>
      </div>
    </div>
  );
}

export default RelatedTasksSection;
