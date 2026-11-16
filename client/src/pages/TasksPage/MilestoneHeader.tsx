import { useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { TaskMilestone, SkillWithMastery } from '@shared/api.interface';
import {
  deleteMilestone as deleteMilestoneApi,
  updateMilestone as updateMilestoneApi,
  updateMilestoneSkills,
} from '@/api/task-group';
import { SkillTagPill } from './SkillTagPill';
import MilestoneSkillButton from './MilestoneSkillButton';

interface MilestoneHeaderProps {
  milestone: TaskMilestone;
  skills: SkillWithMastery[];
  onMilestoneDelete: (milestoneId: string) => void;
  onMilestoneUpdate: (milestone: TaskMilestone) => void;
  onMilestoneSkillsChange: (skills: SkillWithMastery[]) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  expanded: boolean;
  progress: number;
  completed: number;
  total: number;
}

const MilestoneHeader = ({
  milestone,
  skills,
  onMilestoneDelete,
  onMilestoneUpdate,
  onMilestoneSkillsChange,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  progress,
  completed,
  total,
}: MilestoneHeaderProps) => {
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(milestone.title);

  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim() === milestone.title) {
      setEditingName(false);
      setEditName(milestone.title);
      return;
    }
    try {
      const updated = await updateMilestoneApi(milestone.id, {
        title: editName.trim(),
      });
      onMilestoneUpdate(updated);
      setEditingName(false);
      toast.success('里程碑已更新');
    } catch (error) {
      logger.error('更新里程碑失败', error);
      toast.error('更新失败');
    }
  };

  const handleDeleteMilestone = async () => {
    if (total > 0 && !await showConfirm('删除里程碑将同时删除所有子任务，确定吗？')) {
      return;
    }
    try {
      await deleteMilestoneApi(milestone.id);
      onMilestoneDelete(milestone.id);
      toast.success('里程碑已删除');
    } catch (error) {
      logger.error('删除里程碑失败', error);
      toast.error('删除失败');
    }
  };

  return (
    <div className="flex items-start gap-2 flex-wrap w-full">
      {editingName ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8 text-base font-medium"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName();
              if (e.key === 'Escape') {
                setEditingName(false);
                setEditName(milestone.title);
              }
            }}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              setEditingName(false);
              setEditName(milestone.title);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <h3 className="font-semibold text-foreground truncate flex-1 min-w-0">
          {milestone.title}
        </h3>
      )}

      {!editingName && skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {skills.slice(0, 2).map((s) => (
            <SkillTagPill key={s.id} skill={s} />
          ))}
          {skills.length > 2 && (
            <Badge variant="outline" className="text-[10px]">
              +{skills.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onMoveUp}
          disabled={!canMoveUp}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onMoveDown}
          disabled={!canMoveDown}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <MilestoneSkillButton
          milestoneId={milestone.id}
          title={milestone.title}
          currentSkills={skills}
          onSkillsChange={onMilestoneSkillsChange}
          updateFn={updateMilestoneSkills}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setEditingName(true);
            setEditName(milestone.title);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={handleDeleteMilestone}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MilestoneHeader;
