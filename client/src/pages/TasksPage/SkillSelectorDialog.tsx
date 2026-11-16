import { useState, useMemo, useEffect } from 'react';
import { Search, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Layers,
  Code2,
  Cpu,
  Database,
  Brain,
  BarChart3,
  Landmark,
  TrendingUp,
  Briefcase,
  Languages,
  Users,
  Award,
} from 'lucide-react';
import { listAllSkills } from '@/api/task-group';
import type { SkillWithMastery } from '@shared/api.interface';
import { SKILL_CATEGORIES } from '@shared/api.interface';

const ALL_CATEGORY_KEY = 'all';

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

interface SkillSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  selectedIds: string[];
  title?: string;
}

const SkillSelectorDialog = ({
  open,
  onClose,
  onConfirm,
  selectedIds,
  title = '选择关联技能',
}: SkillSelectorDialogProps) => {
  const [allSkills, setAllSkills] = useState<SkillWithMastery[]>([]);
  const [loading, setLoading] = useState(false);
  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY_KEY);

  useEffect(() => {
    if (open) {
      setLocalSelected(selectedIds);
      setSearch('');
      setActiveCategory(ALL_CATEGORY_KEY);
      if (allSkills.length === 0) {
        void loadSkills();
      }
    }
  }, [open, selectedIds]);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const skills = await listAllSkills();
      setAllSkills(skills);
    } catch (error) {
      logger.error('加载技能列表失败', error);
      toast.error('加载技能列表失败');
    } finally {
      setLoading(false);
    }
  };

  const categoriesWithAll = useMemo(
    () => [{ key: ALL_CATEGORY_KEY, label: '全部' }, ...SKILL_CATEGORIES],
    [],
  );

  const filteredSkills = useMemo(() => {
    let result = allSkills;
    if (activeCategory !== ALL_CATEGORY_KEY) {
      result = result.filter((s) => s.category === activeCategory);
    }
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(kw));
    }
    return result;
  }, [allSkills, activeCategory, search]);

  const skillsByCategory = useMemo(() => {
    if (activeCategory !== ALL_CATEGORY_KEY) return null;
    const map = new Map<string, SkillWithMastery[]>();
    for (const s of filteredSkills) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return map;
  }, [filteredSkills, activeCategory]);

  const toggleSkill = (id: string) => {
    setLocalSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = () => {
    onConfirm(localSelected);
    onClose();
  };

  const getCategoryLabel = (key: string): string => {
    const found = SKILL_CATEGORIES.find((c) => c.key === key);
    return found ? found.label : key;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-xs">
            已选择 <span className="text-primary font-medium">{localSelected.length}</span> 项技能
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索技能名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearch('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

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

          <div className="flex-1 overflow-y-auto pr-1 -mr-1 min-h-0">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground text-sm">加载中...</div>
            ) : allSkills.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                暂无技能，先去技能管理页面添加技能吧
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                没有匹配的技能
              </div>
            ) : activeCategory === ALL_CATEGORY_KEY && skillsByCategory ? (
              <div className="space-y-4">
                {SKILL_CATEGORIES.map((cat) => {
                  const list = skillsByCategory.get(cat.key) ?? [];
                  if (list.length === 0) return null;
                  const CategoryIcon = getCategoryIcon(cat.key);
                  const color = getCategoryColor(cat.key);
                  return (
                    <div key={cat.key}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex h-4 w-4" style={{ color }}>
                          <CategoryIcon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium" style={{ color }}>
                          {cat.label}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {list.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {list.map((skill) => {
                          const isSelected = localSelected.includes(skill.id);
                          return (
                            <button
                              key={skill.id}
                              type="button"
                              onClick={() => toggleSkill(skill.id)}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/10 text-foreground'
                                  : 'border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card/80 text-foreground/80'
                              }`}
                            >
                              <div
                                className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                  isSelected
                                    ? 'bg-primary border-primary text-primary-foreground'
                                    : 'border-muted-foreground/30'
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                              <span className="text-sm truncate flex-1">{skill.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredSkills.map((skill) => {
                  const isSelected = localSelected.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card/80 text-foreground/80'
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="text-sm truncate flex-1">{skill.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            确认（{localSelected.length}）
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SkillSelectorDialog;
