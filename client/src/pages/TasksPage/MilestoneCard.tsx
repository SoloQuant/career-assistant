import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { ChevronDown, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type { TaskMilestone, TaskSubTask, SkillWithMastery } from '@shared/api.interface';
import { createSubTask as createSubTaskApi } from '@/api/task-group';
import SubTaskItem from './SubTaskItem';
import MilestoneHeader from './MilestoneHeader';

interface MilestoneCardProps {
  milestone: TaskMilestone;
  skills: SkillWithMastery[];
  subTaskSkillsMap: Record<string, SkillWithMastery[]>;
  onSubTaskUpdate: (subTask: TaskSubTask) => void;
  onSubTaskDelete: (subTaskId: string) => void;
  onSubTaskCreate: (subTask: TaskSubTask) => void;
  onMilestoneDelete: (milestoneId: string) => void;
  onMilestoneUpdate: (milestone: TaskMilestone) => void;
  onMilestoneSkillsChange: (skills: SkillWithMastery[]) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const MilestoneCard = ({
  milestone,
  skills,
  subTaskSkillsMap,
  onSubTaskUpdate,
  onSubTaskDelete,
  onSubTaskCreate,
  onMilestoneDelete,
  onMilestoneUpdate,
  onMilestoneSkillsChange,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: MilestoneCardProps) => {
  const [expanded, setExpanded] = useState(true);
  const [addingSubTask, setAddingSubTask] = useState(false);
  const [newSubTaskName, setNewSubTaskName] = useState('');
  const [loading, setLoading] = useState(false);

  const completed = milestone.completedSubTasks;
  const total = milestone.totalSubTasks;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAddSubTask = async () => {
    if (!newSubTaskName.trim()) return;
    setLoading(true);
    try {
      const newTask = await createSubTaskApi({
        milestoneId: milestone.id,
        title: newSubTaskName.trim(),
        estimatedMinutes: 30,
      });
      onSubTaskCreate(newTask);
      setNewSubTaskName('');
      setAddingSubTask(false);
      toast.success('子任务已添加');
    } catch (error) {
      logger.error('添加子任务失败', error);
      toast.error('添加失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/60 overflow-hidden transition-all duration-300 hover:border-primary/30">
      <CardContent className="p-0">
        {/* Header */}
        <div
          className="flex items-start gap-3 p-4 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div
            className="flex-1 min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MilestoneHeader
              milestone={milestone}
              skills={skills}
              onMilestoneDelete={onMilestoneDelete}
              onMilestoneUpdate={onMilestoneUpdate}
              onMilestoneSkillsChange={onMilestoneSkillsChange}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
              expanded={expanded}
              progress={progress}
              completed={completed}
              total={total}
            />
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex-1 max-w-[200px]">
                <Progress value={progress} className="h-1.5" />
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {completed}/{total}
              </span>
            </div>
          </div>

          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* Sub-tasks */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border/40">
                {milestone.subTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    暂无子任务
                  </p>
                ) : (
                  milestone.subTasks.map((st) => (
                    <SubTaskItem
                      key={st.id}
                      subTask={st}
                      skills={subTaskSkillsMap[st.id] ?? []}
                      onUpdate={onSubTaskUpdate}
                      onDelete={onSubTaskDelete}
                    />
                  ))
                )}

                {addingSubTask ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                    <Input
                      value={newSubTaskName}
                      onChange={(e) => setNewSubTaskName(e.target.value)}
                      placeholder="输入子任务名称"
                      className="h-8 text-sm flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSubTask();
                        if (e.key === 'Escape') {
                          setAddingSubTask(false);
                          setNewSubTaskName('');
                        }
                      }}
                    />
                    <Button size="sm" onClick={handleAddSubTask} disabled={!newSubTaskName.trim() || loading}>
                      添加
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingSubTask(false);
                        setNewSubTaskName('');
                      }}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setAddingSubTask(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    添加子任务
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default MilestoneCard;
