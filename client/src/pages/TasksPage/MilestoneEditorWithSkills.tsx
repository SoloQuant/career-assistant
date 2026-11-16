import { Badge } from '@/components/ui/badge';
import MilestoneEditor, { type PreviewMilestoneData } from './MilestoneEditor';

interface MilestoneEditorWithSkillsProps {
  milestones: PreviewMilestoneData[];
  milestoneSkillNames: string[][];
  onChange: (milestones: PreviewMilestoneData[]) => void;
}

const MilestoneEditorWithSkills = ({
  milestones,
  milestoneSkillNames,
  onChange,
}: MilestoneEditorWithSkillsProps) => {
  const hasSkills = milestoneSkillNames.some((arr) => arr.length > 0);
  if (!hasSkills) {
    return <MilestoneEditor milestones={milestones} onChange={onChange} />;
  }
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        AI 已为每个里程碑推荐了关联技能（仅供参考，创建后可在详情页精确管理）
      </div>
      <MilestoneEditor milestones={milestones} onChange={onChange} />
      <div className="space-y-2">
        {milestones.map((m, mIdx) => {
          const skillNames = milestoneSkillNames[mIdx] ?? [];
          if (skillNames.length === 0) return null;
          return (
            <div key={mIdx} className="flex items-start gap-2 text-xs">
              <span className="text-muted-foreground shrink-0 pt-0.5">
                {m.name || `里程碑${mIdx + 1}`}：
              </span>
              <div className="flex flex-wrap gap-1">
                {skillNames.map((name, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MilestoneEditorWithSkills;
