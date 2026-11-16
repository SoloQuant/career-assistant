import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Clock,
  Trash2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import type { TaskSubTask, SkillWithMastery } from '@shared/api.interface';
import { SkillDot, getMasteryColor } from './SkillTagPill';
import { updateSubTask as updateSubTaskApi, deleteSubTask as deleteSubTaskApi } from '@/api/task-group';
import { logger } from '@lark-apaas/client-toolkit/logger';

interface SubTaskItemProps {
  subTask: TaskSubTask;
  skills: SkillWithMastery[];
  onUpdate: (subTask: TaskSubTask) => void;
  onDelete: (subTaskId: string) => void;
}

const SubTaskItem = ({ subTask, skills, onUpdate, onDelete }: SubTaskItemProps) => {
  const navigate = useNavigate();

  const handleToggle = async () => {
    const prev = subTask.isCompleted;
    onUpdate({ ...subTask, isCompleted: !prev });
    try {
      const updated = await updateSubTaskApi(subTask.id, { isCompleted: !prev });
      onUpdate(updated);
      if (!prev && skills.length > 0) {
        const topSkill = skills[0]!;
        toast.success('子任务已完成', {
          description: `完成此任务可能提升了【${topSkill.name}】能力，是否去更新评估？`,
          action: {
            label: '去看看',
            onClick: () => {
              navigate(`/skills?highlight=${topSkill.id}`);
            },
          },
          icon: <Sparkles className="h-4 w-4 text-primary" />,
        });
      } else if (!prev) {
        toast.success('子任务已完成');
      }
    } catch (error) {
      logger.error('更新子任务状态失败', error);
      toast.error('更新失败');
      onUpdate({ ...subTask, isCompleted: prev });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSubTaskApi(subTask.id);
      onDelete(subTask.id);
    } catch (error) {
      logger.error('删除子任务失败', error);
      toast.error('删除失败');
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = (minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1);
    return `${hours}h`;
  };

  return (
    <motion.div
      layout
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
        subTask.isCompleted
          ? 'bg-secondary/20 opacity-70'
          : 'bg-secondary/40 hover:bg-secondary/60'
      }`}
    >
      <Checkbox
        checked={subTask.isCompleted}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      <span
        className={`flex-1 text-sm transition-all duration-300 ${
          subTask.isCompleted
            ? 'line-through text-muted-foreground'
            : 'text-foreground'
        }`}
      >
        {subTask.title}
      </span>

      {skills.length > 0 && (
        <div className="flex -space-x-1">
          {skills.slice(0, 3).map((s) => (
            <SkillDot key={s.id} name={s.name} mastery={s.masteryLevel} />
          ))}
          {skills.length > 3 && (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold bg-muted text-muted-foreground border border-background"
              title={`还有 ${skills.length - 3} 项技能`}
            >
              +{skills.length - 3}
            </span>
          )}
        </div>
      )}

      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatTime(subTask.estimatedMinutes)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={handleDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
};

export default SubTaskItem;
