import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface PreviewMilestoneData {
  name: string;
  description: string;
  subTasks: Array<{ name: string; description: string; estimatedMinutes: number }>;
}

interface MilestoneEditorProps {
  milestones: PreviewMilestoneData[];
  onChange: (milestones: PreviewMilestoneData[]) => void;
}

const MilestoneEditor = ({ milestones, onChange }: MilestoneEditorProps) => {
  const addMilestone = () => {
    onChange([
      ...milestones,
      { name: '', description: '', subTasks: [{ name: '', description: '', estimatedMinutes: 30 }] },
    ]);
  };

  const removeMilestone = (idx: number) => {
    onChange(milestones.filter((_, i) => i !== idx));
  };

  const updateMilestone = (idx: number, field: 'name' | 'description', value: string) => {
    onChange(
      milestones.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
    );
  };

  const moveMilestone = (idx: number, direction: 'up' | 'down') => {
    const arr = [...milestones];
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange(arr);
  };

  const addSubTask = (mIdx: number) => {
    onChange(
      milestones.map((m, i) =>
        i === mIdx
          ? { ...m, subTasks: [...m.subTasks, { name: '', description: '', estimatedMinutes: 30 }] }
          : m,
      ),
    );
  };

  const removeSubTask = (mIdx: number, sIdx: number) => {
    onChange(
      milestones.map((m, i) =>
        i === mIdx ? { ...m, subTasks: m.subTasks.filter((_, j) => j !== sIdx) } : m,
      ),
    );
  };

  const updateSubTask = (
    mIdx: number,
    sIdx: number,
    field: 'name' | 'description' | 'estimatedMinutes',
    value: string | number,
  ) => {
    onChange(
      milestones.map((m, i) =>
        i === mIdx
          ? {
              ...m,
              subTasks: m.subTasks.map((st, j) =>
                j === sIdx ? { ...st, [field]: value } : st,
              ),
            }
          : m,
      ),
    );
  };

  const moveSubTask = (mIdx: number, sIdx: number, direction: 'up' | 'down') => {
    onChange(
      milestones.map((m, i) => {
        if (i !== mIdx) return m;
        const arr = [...m.subTasks];
        const target = direction === 'up' ? sIdx - 1 : sIdx + 1;
        if (target < 0 || target >= arr.length) return m;
        [arr[sIdx], arr[target]] = [arr[target], arr[sIdx]];
        return { ...m, subTasks: arr };
      }),
    );
  };

  const totalSubTasks = milestones.reduce((sum, m) => sum + m.subTasks.length, 0);
  const totalMinutes = milestones.reduce(
    (sum, m) => sum + m.subTasks.reduce((s, st) => s + (st.estimatedMinutes || 0), 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline" className="text-xs">
          {milestones.length} 个里程碑
        </Badge>
        <Badge variant="outline" className="text-xs">
          {totalSubTasks} 个子任务
        </Badge>
        <Badge variant="outline" className="text-xs">
          预计 {(totalMinutes / 60).toFixed(1)} 小时
        </Badge>
      </div>

      <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
        {milestones.map((m, mIdx) => (
          <Card key={mIdx} className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="pt-2 text-muted-foreground cursor-grab">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">
                      里程碑 {mIdx + 1}
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveMilestone(mIdx, 'up')}
                        disabled={mIdx === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveMilestone(mIdx, 'down')}
                        disabled={mIdx === milestones.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeMilestone(mIdx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={m.name}
                    onChange={(e) => updateMilestone(mIdx, 'name', e.target.value)}
                    placeholder="里程碑名称"
                    className="font-medium"
                  />
                  <Textarea
                    value={m.description}
                    onChange={(e) => updateMilestone(mIdx, 'description', e.target.value)}
                    placeholder="里程碑描述（可选）"
                    rows={2}
                  />

                  <div className="space-y-2 mt-2">
                    {m.subTasks.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
                      >
                        <div className="text-muted-foreground cursor-grab">
                          <GripVertical className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <Input
                            value={st.name}
                            onChange={(e) =>
                              updateSubTask(mIdx, sIdx, 'name', e.target.value)
                            }
                            placeholder="子任务名称"
                            className="text-sm h-8"
                          />
                          <div className="flex gap-2">
                            <Input
                              value={st.description}
                              onChange={(e) =>
                                updateSubTask(mIdx, sIdx, 'description', e.target.value)
                              }
                              placeholder="子任务描述（可选）"
                              className="text-sm h-8 flex-1"
                            />
                            <Input
                              type="number"
                              min="1"
                              value={st.estimatedMinutes}
                              onChange={(e) =>
                                updateSubTask(
                                  mIdx,
                                  sIdx,
                                  'estimatedMinutes',
                                  Number(e.target.value) || 0,
                                )
                              }
                              className="text-sm h-8 w-24"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveSubTask(mIdx, sIdx, 'up')}
                            disabled={sIdx === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveSubTask(mIdx, sIdx, 'down')}
                            disabled={sIdx === m.subTasks.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeSubTask(mIdx, sIdx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => addSubTask(mIdx)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      添加子任务
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={addMilestone}
        >
          <Plus className="h-4 w-4 mr-2" />
          添加里程碑
        </Button>
      </div>
    </div>
  );
};

export default MilestoneEditor;
