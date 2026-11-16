import { useState } from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '@/components/ui/progress-ring';
import type { TaskGroup, SkillWithMastery } from '@shared/api.interface';
import { updateGroupSkills } from '@/api/task-group';
import SkillSelectorDialog from './SkillSelectorDialog';
import { getMasteryColor } from './SkillTagPill';
import { useNavigate } from 'react-router-dom';

const PRIORITY_LABELS = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
} as const;

const PRIORITY_BADGE = {
  high: 'bg-[hsl(0_84%_60%)]/15 text-[hsl(0_84%_60%)] border-[hsl(0_84%_60%)]/30 hover:bg-[hsl(0_84%_60%)]/15',
  medium: 'bg-[hsl(38_90%_55%)]/15 text-[hsl(38_90%_55%)] border-[hsl(38_90%_55%)]/30 hover:bg-[hsl(38_90%_55%)]/15',
  low: 'bg-[hsl(160_70%_50%)]/15 text-[hsl(160_70%_50%)] border-[hsl(160_70%_50%)]/30 hover:bg-[hsl(160_70%_50%)]/15',
} as const;

const STATUS_LABELS = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
} as const;

interface GroupHeaderProps {
  group: TaskGroup;
  groupSkills: SkillWithMastery[];
  onGroupSkillsChange: (skills: SkillWithMastery[]) => void;
}

const GroupHeader = ({ group, groupSkills, onGroupSkillsChange }: GroupHeaderProps) => {
  const navigate = useNavigate();
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAllDone = group.totalSubTasks > 0 && group.completedSubTasks === group.totalSubTasks;

  const handleSkillConfirm = async (ids: string[]) => {
    setSaving(true);
    try {
      const updated = await updateGroupSkills(group.id, ids);
      onGroupSkillsChange(updated);
      toast.success('关联技能已更新');
    } catch (error) {
      logger.error('更新总任务技能关联失败', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge
            variant="outline"
            className={`text-xs ${PRIORITY_BADGE[group.priority as keyof typeof PRIORITY_BADGE]}`}
          >
            {PRIORITY_LABELS[group.priority as keyof typeof PRIORITY_LABELS]}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {STATUS_LABELS[group.status as keyof typeof STATUS_LABELS]}
          </Badge>
          {group.dueDate && (
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {group.dueDate}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold mb-2">{group.title}</h1>
        {group.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {group.description}
          </p>
        )}

        {/* Skill pills */}
        {groupSkills.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                关联技能
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSkillDialogOpen(true)}
              >
                管理
              </Button>
            </div>
            <div className="space-y-2">
              {groupSkills.map((skill) => {
                const color = getMasteryColor(skill.masteryLevel);
                return (
                  <div key={skill.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        className="font-medium hover:underline text-left"
                        style={{ color }}
                        onClick={() => navigate(`/skills?highlight=${skill.id}`)}
                      >
                        {skill.name}
                      </button>
                      <span className="font-mono" style={{ color }}>
                        {skill.masteryLevel}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${skill.masteryLevel}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {groupSkills.length === 0 && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setSkillDialogOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              添加关联技能
            </Button>
          </div>
        )}
      </div>

      {/* Progress ring */}
      <div className="flex flex-col items-center gap-2 lg:border-l lg:border-border lg:pl-6">
        <ProgressRing
          value={group.progress}
          size={120}
          strokeWidth={8}
          color={isAllDone ? 'hsl(140 60% 45%)' : 'hsl(190 90% 55%)'}
        />
        <p className="text-xs text-muted-foreground">
          已完成 {group.completedSubTasks}/{group.totalSubTasks} 个子任务
        </p>
      </div>

      <SkillSelectorDialog
        open={skillDialogOpen}
        onClose={() => setSkillDialogOpen(false)}
        onConfirm={handleSkillConfirm}
        selectedIds={groupSkills.map((s) => s.id)}
        title="编辑总任务关联技能"
      />
    </div>
  );
};

export default GroupHeader;
