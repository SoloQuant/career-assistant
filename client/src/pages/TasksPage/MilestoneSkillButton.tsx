import { useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SkillWithMastery } from '@shared/api.interface';
import SkillSelectorDialog from './SkillSelectorDialog';

interface MilestoneSkillButtonProps {
  milestoneId: string;
  title: string;
  currentSkills: SkillWithMastery[];
  onSkillsChange: (skills: SkillWithMastery[]) => void;
  updateFn: (id: string, ids: string[]) => Promise<SkillWithMastery[]>;
}

const MilestoneSkillButton = ({
  milestoneId,
  title,
  currentSkills,
  onSkillsChange,
  updateFn,
}: MilestoneSkillButtonProps) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async (ids: string[]) => {
    setSaving(true);
    try {
      const updated = await updateFn(milestoneId, ids);
      onSkillsChange(updated);
      toast.success('关联技能已更新');
    } catch (error) {
      logger.error('更新技能关联失败', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setOpen(true)}
        title="管理关联技能"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </Button>
      <SkillSelectorDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        selectedIds={currentSkills.map((s) => s.id)}
        title={`编辑「${title}」关联技能`}
      />
    </>
  );
};

export default MilestoneSkillButton;
