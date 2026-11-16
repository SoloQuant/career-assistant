import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Loader2, Pencil, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MilestoneEditorWithSkills from './MilestoneEditorWithSkills';
import { type PreviewMilestoneData } from './MilestoneEditor';
import {
  createGroupWithSkills,
  splitPreviewWithSkills,
  listAllSkills,
} from '@/api/task-group';
import SkillSelectorDialog from './SkillSelectorDialog';
import type {
  CreateTaskSplitDto,
  TaskSkillPreview,
  CreateTaskGroupDto,
  TaskGroup,
  SkillWithMastery,
} from '@shared/api.interface';

interface TaskSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (group: TaskGroup) => void;
}

type SplitStep = 'input' | 'loading' | 'preview';

const TaskSplitDialog = ({ open, onOpenChange, onCreated }: TaskSplitDialogProps) => {
  const [step, setStep] = useState<SplitStep>('input');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [relatedSkills, setRelatedSkills] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [milestones, setMilestones] = useState<PreviewMilestoneData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [allSkills, setAllSkills] = useState<SkillWithMastery[]>([]);
  const [overallSkillNames, setOverallSkillNames] = useState<string[]>([]);
  const [milestoneSkillNames, setMilestoneSkillNames] = useState<string[][]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [skillsLoaded, setSkillsLoaded] = useState(false);

  useEffect(() => {
    if (open && !skillsLoaded) {
      listAllSkills()
        .then((data) => {
          setAllSkills(data);
          setSkillsLoaded(true);
        })
        .catch((err) => {
          logger.error('加载技能列表失败', err);
        });
    }
  }, [open, skillsLoaded]);

  const nameToIdMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allSkills) {
      map.set(s.name.toLowerCase(), s.id);
    }
    return map;
  }, [allSkills]);

  const resetForm = () => {
    setStep('input');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setRelatedSkills('');
    setDueDate('');
    setMilestones([]);
    setSubmitting(false);
    setOverallSkillNames([]);
    setMilestoneSkillNames([]);
    setSelectedSkillIds([]);
  };

  const handleOpenChange = (openVal: boolean) => {
    if (!openVal) {
      resetForm();
    }
    onOpenChange(openVal);
  };

  const buildSplitDto = (): CreateTaskSplitDto => {
    const skills = relatedSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      relatedSkills: skills.length > 0 ? skills : undefined,
      dueDate: dueDate || undefined,
    };
  };

  const deriveSkillIds = (names: string[]): string[] => {
    const ids: string[] = [];
    for (const n of names) {
      const id = nameToIdMap.get(n.toLowerCase());
      if (id) ids.push(id);
    }
    return ids;
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error('请输入任务名称');
      return;
    }
    setStep('loading');
    try {
      const result: TaskSkillPreview = await splitPreviewWithSkills(buildSplitDto());
      setMilestones(result.milestones.map((m) => ({
        name: m.name,
        description: m.description,
        subTasks: m.subTasks.map((st) => ({
          name: st.name,
          description: st.description,
          estimatedMinutes: st.estimatedMinutes,
        })),
      })));
      setOverallSkillNames(result.overallSkillNames ?? []);
      setMilestoneSkillNames(result.milestones.map((m) => m.skillNames ?? []));
      const ids = deriveSkillIds(result.overallSkillNames ?? []);
      setSelectedSkillIds(ids);
      setStep('preview');
    } catch (error) {
      logger.error('AI 拆分失败', error);
      toast.error('AI 拆分失败，请重试');
      setStep('input');
    }
  };

  const handleRegenerate = async () => {
    setStep('loading');
    try {
      const result = await splitPreviewWithSkills(buildSplitDto());
      setMilestones(result.milestones.map((m) => ({
        name: m.name,
        description: m.description,
        subTasks: m.subTasks.map((st) => ({
          name: st.name,
          description: st.description,
          estimatedMinutes: st.estimatedMinutes,
        })),
      })));
      setOverallSkillNames(result.overallSkillNames ?? []);
      setMilestoneSkillNames(result.milestones.map((m) => m.skillNames ?? []));
      const ids = deriveSkillIds(result.overallSkillNames ?? []);
      setSelectedSkillIds(ids);
      setStep('preview');
      toast.success('已重新生成');
    } catch (error) {
      logger.error('重新生成失败', error);
      toast.error('重新生成失败');
      setStep('preview');
    }
  };

  const handleSkillConfirm = (ids: string[]) => {
    setSelectedSkillIds(ids);
  };

  const handleConfirm = async () => {
    if (milestones.length === 0) {
      toast.error('至少需要一个里程碑');
      return;
    }
    const dto: CreateTaskGroupDto = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
      dueDate: dueDate || undefined,
      milestones: milestones.map((m, mIdx) => ({
        title: m.name,
        description: m.description || undefined,
        sortOrder: mIdx,
        subTasks: m.subTasks.map((st, stIdx) => ({
          title: st.name,
          description: st.description || undefined,
          estimatedMinutes: st.estimatedMinutes,
          sortOrder: stIdx,
        })),
      })),
    };
    setSubmitting(true);
    try {
      const group = await createGroupWithSkills(dto);
      toast.success('总任务创建成功');
      onCreated?.(group);
      handleOpenChange(false);
    } catch (error) {
      logger.error('创建总任务失败', error);
      toast.error('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSkillNames = useMemo(() => {
    const idToName = new Map(allSkills.map((s) => [s.id, s.name]));
    return selectedSkillIds.map((id) => idToName.get(id) ?? '').filter(Boolean);
  }, [selectedSkillIds, allSkills]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === 'input' && '智能拆分任务'}
            {step === 'loading' && 'AI 正在智能拆分任务...'}
            {step === 'preview' && '预览与编辑拆分结果'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step !== 'input'
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/20 text-primary'
            }`}
          >
            1
          </div>
          <span className={step === 'input' ? 'text-foreground font-medium' : ''}>输入信息</span>
          <div className="h-px flex-1 bg-border" />
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 'preview'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            2
          </div>
          <span className={step === 'preview' ? 'text-foreground font-medium' : ''}>预览编辑</span>
        </div>

        {step === 'input' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="split-title">任务名称 *</Label>
              <Input
                id="split-title"
                placeholder="例如：完成前端项目重构"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="split-desc">任务描述</Label>
              <Textarea
                id="split-desc"
                placeholder="详细描述你的任务，AI 会根据描述智能拆分为里程碑和子任务"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="split-priority">优先级</Label>
                <Select
                  value={priority}
                  onValueChange={(val) => setPriority(val as 'low' | 'medium' | 'high')}
                >
                  <SelectTrigger id="split-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高优先级</SelectItem>
                    <SelectItem value="medium">中优先级</SelectItem>
                    <SelectItem value="low">低优先级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="split-due">预计完成时间</Label>
                <Input
                  id="split-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="split-skills">关联技能（可选）</Label>
              <Input
                id="split-skills"
                placeholder="多个技能用逗号分隔，如 React, TypeScript"
                value={relatedSkills}
                onChange={(e) => setRelatedSkills(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="py-16 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <Loader2 className="h-12 w-12 text-primary animate-spin relative" />
            </div>
            <p className="text-lg font-medium">AI 正在智能拆分任务...</p>
            <p className="text-sm text-muted-foreground">
              正在分析任务内容，为你生成里程碑和子任务
            </p>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            {/* Overall skill section */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">总任务关联技能</span>
                  {selectedSkillIds.length > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {selectedSkillIds.length} 项
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setSkillDialogOpen(true)}
                >
                  编辑技能
                </Button>
              </div>
              {selectedSkillNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSkillNames.map((name, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-[11px] border-primary/40 text-primary bg-primary/10"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : overallSkillNames.length > 0 ? (
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1.5">
                    {overallSkillNames.map((name, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-[11px] border-muted-foreground/20 text-muted-foreground"
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    AI 建议技能（尚未匹配到技能库，点击「编辑技能」手动选择）
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  尚未选择关联技能，点击「编辑技能」添加
                </p>
              )}
            </div>

            <MilestoneEditorWithSkills
              milestones={milestones}
              milestoneSkillNames={milestoneSkillNames}
              onChange={setMilestones}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleGenerate} disabled={!title.trim()}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI 智能拆分
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleRegenerate} disabled={submitting}>
                重新生成
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={submitting || milestones.length === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    确认创建
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>

        <SkillSelectorDialog
          open={skillDialogOpen}
          onClose={() => setSkillDialogOpen(false)}
          onConfirm={handleSkillConfirm}
          selectedIds={selectedSkillIds}
          title="选择关联技能"
        />
      </DialogContent>
    </Dialog>
  );
};

export default TaskSplitDialog;
