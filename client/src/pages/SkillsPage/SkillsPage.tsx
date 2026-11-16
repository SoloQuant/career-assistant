import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Layers,
  CheckCircle2,
  Gauge,
  Code2,
  Database,
  BarChart3,
  Brain,
  LineChart,
  Cpu,
  Landmark,
  TrendingUp,
  Briefcase,
  Languages,
  Users,
  Award,
  Sparkles,
} from 'lucide-react';
import type {
  Skill,
  KnowledgePoint,
  CreateSkillDto,
  UpdateSkillDto,
} from '@shared/api.interface';
import { SKILL_CATEGORIES } from '@shared/api.interface';
import {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
} from '@/api/skills';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Slider } from '@/components/ui/slider';
import RelatedTasksSection from './RelatedTasksSection';

interface SkillDialogForm {
  name: string;
  category: string;
  description: string;
  knowledgePoints: KnowledgePoint[];
}

const ALL_CATEGORY_KEY = 'all';

function calcMastery(points: KnowledgePoint[]): number {
  if (points.length === 0) return 0;
  const mastered = points.filter((p: KnowledgePoint) => p.mastered).length;
  return Math.floor((mastered / points.length) * 100);
}

function getCategoryLabel(key: string): string {
  const found = SKILL_CATEGORIES.find((c) => c.key === key);
  return found ? found.label : key;
}

function getMasteryColor(value: number): string {
  if (value < 40) return 'hsl(0 84% 60%)';
  if (value < 70) return 'hsl(38 90% 55%)';
  return 'hsl(160 70% 50%)';
}

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  programming_language: Code2,
  bigdata_framework: Cpu,
  database: Database,
  machine_learning: Brain,
  visualization: BarChart3,
  data_it_other: Layers,
  finance: Landmark,
  economics_business: TrendingUp,
  office_skills: Briefcase,
  language_communication: Languages,
  soft_skill: Users,
  certification: Award,
};

function getCategoryIcon(key: string): React.ComponentType<{ className?: string }> {
  return CATEGORY_ICON_MAP[key] ?? Layers;
}

const CATEGORY_COLOR_MAP: Record<string, string> = {
  programming_language: 'hsl(190 90% 55%)',
  bigdata_framework: 'hsl(240 70% 65%)',
  database: 'hsl(160 70% 50%)',
  machine_learning: 'hsl(280 70% 65%)',
  visualization: 'hsl(340 80% 65%)',
  data_it_other: 'hsl(200 60% 55%)',
  finance: 'hsl(45 85% 55%)',
  economics_business: 'hsl(30 85% 60%)',
  office_skills: 'hsl(140 60% 55%)',
  language_communication: 'hsl(200 70% 60%)',
  soft_skill: 'hsl(260 65% 60%)',
  certification: 'hsl(50 90% 55%)',
};

function getCategoryColor(key: string): string {
  return CATEGORY_COLOR_MAP[key] ?? 'hsl(190 90% 55%)';
}

function emptyForm(): SkillDialogForm {
  return {
    name: '',
    category: SKILL_CATEGORIES[0]?.key ?? '',
    description: '',
    knowledgePoints: [],
  };
}

const SkillsPage = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY_KEY);

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [form, setForm] = useState<SkillDialogForm>(emptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const data: Skill[] = await getSkills();
      setSkills(data);
    } catch (error) {
      logger.error('加载技能列表失败', error);
      toast.error('加载技能列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  const categoriesWithAll = useMemo(
    () => [
      { key: ALL_CATEGORY_KEY, label: '全部' },
      ...SKILL_CATEGORIES,
    ],
    [],
  );

  const filteredSkills = useMemo(() => {
    if (activeCategory === ALL_CATEGORY_KEY) return skills;
    return skills.filter((s: Skill) => s.category === activeCategory);
  }, [skills, activeCategory]);

  const stats = useMemo(() => {
    const total = skills.length;
    const assessed = skills.filter(
      (s: Skill) => s.masteryLevel > 0,
    ).length;
    const avgMastery =
      total > 0
        ? Math.floor(
            skills.reduce((acc: number, s: Skill) => acc + s.masteryLevel, 0) /
              total,
          )
        : 0;
    return { total, assessed, avgMastery };
  }, [skills]);

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleToggleKnowledge = useCallback(
    async (skillId: string, pointIndex: number) => {
      setSavingId(skillId);
      const prevSkills = skills;
      const updated = skills.map((s: Skill) => {
        if (s.id !== skillId) return s;
        const newPoints = s.knowledgePoints.map(
          (p: KnowledgePoint, i: number) =>
            i === pointIndex ? { ...p, mastered: !p.mastered } : p,
        );
        return {
          ...s,
          knowledgePoints: newPoints,
          masteryLevel: calcMastery(newPoints),
        };
      });
      setSkills(updated);

      const targetSkill = updated.find((s: Skill) => s.id === skillId);
      if (!targetSkill) {
        setSavingId(null);
        return;
      }

      try {
        await updateSkill(skillId, {
          knowledgePoints: targetSkill.knowledgePoints,
        });
      } catch (error) {
        logger.error('更新知识点掌握状态失败', error);
        toast.error('保存失败');
        setSkills(prevSkills);
      } finally {
        setSavingId(null);
      }
    },
    [skills],
  );

  const openCreateDialog = () => {
    setEditingSkill(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEditDialog = (skill: Skill) => {
    setEditingSkill(skill);
    setForm({
      name: skill.name,
      category: skill.category,
      description: skill.description,
      knowledgePoints: skill.knowledgePoints.map((p: KnowledgePoint) => ({
        ...p,
      })),
    });
    setDialogOpen(true);
  };

  const handleFormChange = <K extends keyof SkillDialogForm>(
    key: K,
    value: SkillDialogForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddKnowledgePoint = () => {
    setForm((prev) => ({
      ...prev,
      knowledgePoints: [
        ...prev.knowledgePoints,
        { name: '', mastered: false },
      ],
    }));
  };

  const handleRemoveKnowledgePoint = (index: number) => {
    setForm((prev) => ({
      ...prev,
      knowledgePoints: prev.knowledgePoints.filter(
        (_: KnowledgePoint, i: number) => i !== index,
      ),
    }));
  };

  const handleKnowledgePointNameChange = (index: number, name: string) => {
    setForm((prev) => ({
      ...prev,
      knowledgePoints: prev.knowledgePoints.map(
        (p: KnowledgePoint, i: number) =>
          i === index ? { ...p, name } : p,
      ),
    }));
  };

  const handleDialogSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('请输入技能名称');
      return;
    }
    if (!form.category) {
      toast.error('请选择技能分类');
      return;
    }
    const validPoints = form.knowledgePoints.filter(
      (p: KnowledgePoint) => p.name.trim().length > 0,
    );

    setSubmitting(true);
    try {
      if (editingSkill) {
        const dto: UpdateSkillDto = {
          name: form.name.trim(),
          category: form.category,
          description: form.description,
          knowledgePoints: validPoints,
        };
        const updated: Skill = await updateSkill(editingSkill.id, dto);
        setSkills((prev) =>
          prev.map((s: Skill) => (s.id === editingSkill.id ? updated : s)),
        );
        toast.success('技能已更新');
      } else {
        const dto: CreateSkillDto = {
          name: form.name.trim(),
          category: form.category,
          description: form.description,
          knowledgePoints: validPoints,
        };
        const created: Skill = await createSkill(dto);
        setSkills((prev) => [created, ...prev]);
        toast.success('技能已创建');
      }
      setDialogOpen(false);
    } catch (error) {
      logger.error('保存技能失败', error);
      toast.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSkill(deleteTarget.id);
      setSkills((prev) =>
        prev.filter((s: Skill) => s.id !== deleteTarget.id),
      );
      toast.success('技能已删除');
      setDeleteTarget(null);
    } catch (error) {
      logger.error('删除技能失败', error);
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6" data-ai-section-type="card-list">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">技能评估</h2>
          <p className="text-sm text-muted-foreground mt-1">
            评估你的技能掌握度，追踪学习进度
          </p>
        </div>
        <Button onClick={openCreateDialog} data-ai-section-type="button">
          <Plus className="h-4 w-4" />
          新增技能
        </Button>
      </div>

      {/* 统计卡片 */}
      {!loading && (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          data-ai-section-type="card-stat"
        >
          <Card className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(0_0_0_0.3)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总技能数</p>
                  <p className="mt-1 text-3xl font-bold font-mono text-primary">
                    {stats.total}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition-all group-hover:scale-110">
                  <Layers className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(0_0_0_0.3)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已评估</p>
                  <p className="mt-1 text-3xl font-bold font-mono text-primary">
                    {stats.assessed}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition-all group-hover:scale-110">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(0_0_0_0.3)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">平均掌握度</p>
                  <p className="mt-1 text-3xl font-bold font-mono text-primary">
                    {stats.avgMastery}%
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition-all group-hover:scale-110">
                  <Gauge className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 分类 Tabs */}
      <Tabs defaultValue={ALL_CATEGORY_KEY} value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="w-full flex-wrap h-auto bg-muted/50 p-1">
          {categoriesWithAll.map((cat) => (
            <TabsTrigger
              key={cat.key}
              value={cat.key}
              className="flex-shrink-0 px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i: number) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-2 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">暂无技能，点击右上角「新增技能」开始添加</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill: Skill) => {
            const isExpanded = expandedId === skill.id;
            const totalPoints = skill.knowledgePoints.length;
            const masteredCount = skill.knowledgePoints.filter(
              (p: KnowledgePoint) => p.mastered,
            ).length;
            const CategoryIcon = getCategoryIcon(skill.category);
            const categoryColor = getCategoryColor(skill.category);
            const masteryColor = getMasteryColor(skill.masteryLevel);

            return (
              <Card
                key={skill.id}
                className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(0_0_0_0.3)] cursor-pointer"
                onClick={() => handleToggleExpand(skill.id)}
              >
                <CardContent className="p-5">
                  {/* 顶部：图标 + 名称 + 标签 */}
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white transition-all group-hover:scale-110"
                      style={{ backgroundColor: categoryColor }}
                    >
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className="text-base font-semibold truncate mb-1">
                        {skill.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className="border-border bg-background/50 text-xs"
                        style={{ borderColor: `${categoryColor}55`, color: categoryColor }}
                      >
                        {getCategoryLabel(skill.category)}
                      </Badge>
                    </div>
                  </div>

                  {/* 中部：环形进度 + 文字 */}
                  <div className="flex items-center gap-4 mb-3">
                    <ProgressRing
                      value={skill.masteryLevel}
                      size={64}
                      strokeWidth={6}
                      color={masteryColor}
                      trackColor="hsl(215 30% 22% / 60%)"
                      label={undefined}
                      showValue={true}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1">
                        掌握 {masteredCount}/{totalPoints} 个知识点
                      </p>
                      <Progress
                        value={skill.masteryLevel}
                        className="h-1.5"
                        style={{
                          // override progress indicator color via inline style fallback
                        } as React.CSSProperties}
                      />
                      {savingId === skill.id && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          保存中
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 底部操作行 */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          收起
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          展开知识点
                        </>
                      )}
                    </span>
                    <div
                      className="flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(skill)}
                        data-ai-section-type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">编辑</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(skill)}
                        data-ai-section-type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">删除</span>
                      </Button>
                    </div>
                  </div>

                  {/* 展开面板 */}
                  {isExpanded && (
                    <div
                      className="mt-4 pt-4 border-t border-border/50 space-y-3"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        animation: 'skill-expand 0.25s ease-out',
                      }}
                    >
                      <style>{`
                        @keyframes skill-expand {
                          from { opacity: 0; transform: translateY(-4px); }
                          to { opacity: 1; transform: translateY(0); }
                        }
                      `}</style>
                      {skill.knowledgePoints.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          暂无知识点，点击编辑添加
                        </p>
                      ) : (
                        skill.knowledgePoints.map(
                          (point: KnowledgePoint, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-sm group/kp"
                            >
                              <Checkbox
                                id={`kp-${skill.id}-${idx}`}
                                checked={point.mastered}
                                onCheckedChange={() =>
                                  handleToggleKnowledge(skill.id, idx)
                                }
                              />
                              <label
                                htmlFor={`kp-${skill.id}-${idx}`}
                                className={`cursor-pointer flex-1 transition-colors ${
                                  point.mastered
                                    ? 'line-through text-muted-foreground'
                                    : 'hover:text-foreground/80'
                                }`}
                              >
                                {point.name}
                              </label>
                            </div>
                          ),
                        )
                      )}

                      {/* 自评滑块 */}
                      <div className="pt-2 border-t border-border/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">
                            自评掌握度
                          </span>
                          <span
                            className="text-xs font-mono font-semibold"
                            style={{ color: masteryColor }}
                          >
                            {skill.selfRating ?? skill.masteryLevel}%
                          </span>
                        </div>
                        <Slider
                          value={[skill.selfRating ?? skill.masteryLevel]}
                          max={100}
                          step={1}
                          onValueChange={(val: number[]) => {
                            const newVal = val[0] ?? 0;
                            // optimistic update locally, then save
                            const prevSkills = skills;
                            const updated = skills.map((s: Skill) => {
                              if (s.id !== skill.id) return s;
                              return { ...s, selfRating: newVal };
                            });
                            setSkills(updated);
                            setSavingId(skill.id);
                            void updateSkill(skill.id, {
                              selfRating: newVal,
                            })
                              .then(() => {
                                setSavingId(null);
                              })
                              .catch((error: unknown) => {
                                logger.error(
                                  '更新自评掌握度失败',
                                  error as Error,
                                );
                                toast.error('保存失败');
                                setSkills(prevSkills);
                                setSavingId(null);
                              });
                          }}
                          disabled={savingId === skill.id}
                        />
                       </div>

                       {/* 关联任务 */}
                       <div className="pt-3 border-t border-border/30">
                         <div className="flex items-center gap-1.5 mb-2">
                           <Sparkles className="h-3.5 w-3.5 text-primary" />
                           <span className="text-xs font-medium">关联任务</span>
                         </div>
                         <RelatedTasksSection skillId={skill.id} />
                       </div>
                     </div>
                   )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSkill ? '编辑技能' : '新增技能'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">技能名称</label>
              <Input
                placeholder="例如：Python"
                value={form.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">分类</label>
              <Select
                value={form.category}
                onValueChange={(val) => handleFormChange('category', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">描述（可选）</label>
              <Textarea
                placeholder="简要描述该技能的学习目标或范围"
                value={form.description}
                onChange={(e) =>
                  handleFormChange('description', e.target.value)
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">知识点清单</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddKnowledgePoint}
                  type="button"
                  data-ai-section-type="button"
                >
                  <Plus className="h-3 w-3" />
                  添加
                </Button>
              </div>
              <div className="space-y-2">
                {form.knowledgePoints.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    尚未添加知识点，点击「添加」开始
                  </p>
                ) : (
                  form.knowledgePoints.map(
                    (point: KnowledgePoint, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder={`知识点 ${idx + 1}`}
                          value={point.name}
                          onChange={(e) =>
                            handleKnowledgePointNameChange(idx, e.target.value)
                          }
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveKnowledgePoint(idx)}
                          type="button"
                          data-ai-section-type="button"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="sr-only">删除</span>
                        </Button>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button" data-ai-section-type="button">
                取消
              </Button>
            </DialogClose>
            <Button
              onClick={handleDialogSubmit}
              disabled={submitting}
              data-ai-section-type="button"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {editingSkill ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除技能「{deleteTarget?.name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive text-destructive-foreground border-destructive-border"
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 进度条渐变：通过全局样式覆盖 indicator */}
      <style>{`
        [data-slot="progress-indicator"] {
          background: linear-gradient(90deg, hsl(190, 90%, 55%) 0%, hsl(160, 70%, 50%) 100%);
        }
      `}</style>
    </div>
  );
};

export default SkillsPage;
