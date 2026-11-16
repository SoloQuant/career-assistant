import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  ArrowLeft,
  Plus,
  Loader2,
  AlertCircle,
  Sparkles,
  PartyPopper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import MilestoneCard from './MilestoneCard';
import GroupHeader from './GroupHeader';
import {
  getGroup,
  getGroupSkills,
  createMilestone,
  reorderMilestones,
} from '@/api/task-group';
import type {
  TaskGroup,
  TaskMilestone,
  TaskSubTask,
  TaskGroupSkillsResult,
  SkillWithMastery,
} from '@shared/api.interface';

const TaskGroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<TaskGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [skillsData, setSkillsData] = useState<TaskGroupSkillsResult | null>(null);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [groupData, skills] = await Promise.all([
        getGroup(id),
        getGroupSkills(id).catch((err) => {
          logger.error('加载技能关联失败', err);
          return null;
        }),
      ]);
      setGroup(groupData);
      setSkillsData(skills);
      setAllDone(groupData.totalSubTasks > 0 && groupData.completedSubTasks === groupData.totalSubTasks);
    } catch (err) {
      setError('加载任务详情失败');
      logger.error('加载任务详情失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSubTaskUpdate = (updatedSubTask: TaskSubTask) => {
    if (!group) return;
    const newMilestones: TaskMilestone[] = group.milestones.map((m) => {
      if (m.id !== updatedSubTask.milestoneId) return m;
      const newSubTasks: TaskSubTask[] = m.subTasks.map((st) =>
        st.id === updatedSubTask.id ? updatedSubTask : st,
      );
      const completed = newSubTasks.filter((st) => st.isCompleted).length;
      const total = newSubTasks.length;
      return {
        ...m,
        subTasks: newSubTasks,
        completedSubTasks: completed,
        totalSubTasks: total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
    const totalCompleted = newMilestones.reduce((s, m) => s + m.completedSubTasks, 0);
    const totalSubTasks = newMilestones.reduce((s, m) => s + m.totalSubTasks, 0);
    const newProgress = totalSubTasks > 0 ? Math.round((totalCompleted / totalSubTasks) * 100) : 0;
    setGroup({
      ...group,
      milestones: newMilestones,
      completedSubTasks: totalCompleted,
      totalSubTasks,
      progress: newProgress,
    });
    setAllDone(totalSubTasks > 0 && totalCompleted === totalSubTasks);
  };

  const handleSubTaskDelete = (subTaskId: string) => {
    if (!group) return;
    const newMilestones: TaskMilestone[] = group.milestones.map((m) => {
      const newSubTasks = m.subTasks.filter((st) => st.id !== subTaskId);
      if (newSubTasks.length === m.subTasks.length) return m;
      const completed = newSubTasks.filter((st) => st.isCompleted).length;
      const total = newSubTasks.length;
      return {
        ...m,
        subTasks: newSubTasks,
        completedSubTasks: completed,
        totalSubTasks: total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
    const totalCompleted = newMilestones.reduce((s, m) => s + m.completedSubTasks, 0);
    const totalSubTasks = newMilestones.reduce((s, m) => s + m.totalSubTasks, 0);
    setGroup({
      ...group,
      milestones: newMilestones,
      completedSubTasks: totalCompleted,
      totalSubTasks,
      progress: totalSubTasks > 0 ? Math.round((totalCompleted / totalSubTasks) * 100) : 0,
    });
  };

  const handleSubTaskCreate = (newSubTask: TaskSubTask) => {
    if (!group) return;
    const newMilestones: TaskMilestone[] = group.milestones.map((m) => {
      if (m.id !== newSubTask.milestoneId) return m;
      const newSubTasks = [...m.subTasks, newSubTask];
      const completed = newSubTasks.filter((st) => st.isCompleted).length;
      const total = newSubTasks.length;
      return {
        ...m,
        subTasks: newSubTasks,
        completedSubTasks: completed,
        totalSubTasks: total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
    const totalCompleted = newMilestones.reduce((s, m) => s + m.completedSubTasks, 0);
    const totalSubTasks = newMilestones.reduce((s, m) => s + m.totalSubTasks, 0);
    setGroup({
      ...group,
      milestones: newMilestones,
      completedSubTasks: totalCompleted,
      totalSubTasks,
      progress: totalSubTasks > 0 ? Math.round((totalCompleted / totalSubTasks) * 100) : 0,
    });
  };

  const handleMilestoneDelete = (milestoneId: string) => {
    if (!group) return;
    const newMilestones = group.milestones.filter((m) => m.id !== milestoneId);
    const totalCompleted = newMilestones.reduce((s, m) => s + m.completedSubTasks, 0);
    const totalSubTasks = newMilestones.reduce((s, m) => s + m.totalSubTasks, 0);
    setGroup({
      ...group,
      milestones: newMilestones,
      totalMilestones: newMilestones.length,
      completedSubTasks: totalCompleted,
      totalSubTasks,
      progress: totalSubTasks > 0 ? Math.round((totalCompleted / totalSubTasks) * 100) : 0,
    });
  };

  const handleMilestoneUpdate = (updated: TaskMilestone) => {
    if (!group) return;
    const newMilestones = group.milestones.map((m) =>
      m.id === updated.id ? { ...m, title: updated.title, description: updated.description } : m,
    );
    setGroup({ ...group, milestones: newMilestones });
  };

  const handleMilestoneSkillsChange = (milestoneId: string, skills: SkillWithMastery[]) => {
    if (!skillsData) return;
    setSkillsData({
      ...skillsData,
      milestoneSkillsMap: {
        ...skillsData.milestoneSkillsMap,
        [milestoneId]: skills,
      },
    });
  };

  const handleGroupSkillsChange = (skills: SkillWithMastery[]) => {
    if (!skillsData) return;
    setSkillsData({ ...skillsData, groupSkills: skills });
  };

  const moveMilestone = async (idx: number, direction: 'up' | 'down') => {
    if (!group) return;
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= group.milestones.length) return;

    const newMilestones = [...group.milestones];
    [newMilestones[idx], newMilestones[target]] = [newMilestones[target], newMilestones[idx]];
    setGroup({ ...group, milestones: newMilestones });

    try {
      await reorderMilestones({
        orders: newMilestones.map((m, i) => ({ id: m.id, sortOrder: i })),
      });
    } catch (error) {
      logger.error('里程碑排序失败', error);
      toast.error('排序失败');
      const revert = [...group.milestones];
      setGroup({ ...group, milestones: revert });
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneName.trim() || !group) return;
    setMilestoneLoading(true);
    try {
      const newMs = await createMilestone({
        groupId: group.id,
        title: newMilestoneName.trim(),
        sortOrder: group.milestones.length,
      });
      setGroup({
        ...group,
        milestones: [...group.milestones, { ...newMs, subTasks: [] }],
        totalMilestones: group.totalMilestones + 1,
      });
      setNewMilestoneName('');
      setAddingMilestone(false);
      toast.success('里程碑已添加');
    } catch (error) {
      logger.error('添加里程碑失败', error);
      toast.error('添加失败');
    } finally {
      setMilestoneLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  if (error || !group) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">加载失败</p>
            <p className="text-sm">{error || '任务不存在'}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchData}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isAllDone = group.totalSubTasks > 0 && group.completedSubTasks === group.totalSubTasks;
  const groupSkills = skillsData?.groupSkills ?? [];
  const milestoneSkillsMap = skillsData?.milestoneSkillsMap ?? {};
  const subTaskSkillsMap = skillsData?.subTaskSkillsMap ?? {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 relative"
    >
      {/* Confetti effect when all done */}
      {isAllDone && allDone && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <div className="text-5xl">🎉</div>
            <div className="text-sm font-medium text-primary mt-1">太棒了，全部完成！</div>
          </motion.div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/tasks" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          返回任务列表
        </Link>
      </div>

      {/* Header info */}
      <Card className="overflow-hidden border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-6">
          <GroupHeader
            group={group}
            groupSkills={groupSkills}
            onGroupSkillsChange={handleGroupSkillsChange}
          />
        </CardContent>
      </Card>

      {/* Milestones section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            里程碑
            <Badge variant="outline" className="text-xs">
              {group.milestones.length}
            </Badge>
          </h2>
        </div>

        {group.milestones.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <PartyPopper className="mx-auto h-10 w-10 mb-3 opacity-40" />
              <p>还没有里程碑，开始添加第一个吧</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {group.milestones.map((m, idx) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                skills={milestoneSkillsMap[m.id] ?? []}
                subTaskSkillsMap={subTaskSkillsMap}
                onSubTaskUpdate={handleSubTaskUpdate}
                onSubTaskDelete={handleSubTaskDelete}
                onSubTaskCreate={handleSubTaskCreate}
                onMilestoneDelete={handleMilestoneDelete}
                onMilestoneUpdate={handleMilestoneUpdate}
                onMilestoneSkillsChange={(skills) => handleMilestoneSkillsChange(m.id, skills)}
                onMoveUp={() => moveMilestone(idx, 'up')}
                onMoveDown={() => moveMilestone(idx, 'down')}
                canMoveUp={idx > 0}
                canMoveDown={idx < group.milestones.length - 1}
              />
            ))}
          </div>
        )}

        {addingMilestone ? (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-card/50">
            <Input
              value={newMilestoneName}
              onChange={(e) => setNewMilestoneName(e.target.value)}
              placeholder="输入里程碑名称"
              className="h-9 flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddMilestone();
                if (e.key === 'Escape') {
                  setAddingMilestone(false);
                  setNewMilestoneName('');
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleAddMilestone}
              disabled={!newMilestoneName.trim() || milestoneLoading}
            >
              {milestoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '添加'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAddingMilestone(false);
                setNewMilestoneName('');
              }}
            >
              取消
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setAddingMilestone(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            添加里程碑
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default TaskGroupDetailPage;
