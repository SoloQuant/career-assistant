import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Sparkles,
  Star,
  StarOff,
  Pencil,
  X,
  Loader2,
  User,
  GraduationCap,
  Briefcase,
  FolderKanban,
  Award,
  MessageSquareText,
} from 'lucide-react';
import type {
  ResumeTemplate,
  UserResume,
  ResumePersonalInfo,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeProjectItem,
  ResumeSkillItem,
  ResumeCertificateItem,
  CreateResumeRequest,
  UpdateResumeRequest,
} from '@shared/api.interface';
import {
  getTemplates,
  getResumeList,
  getResume,
  createResume,
  updateResume,
  deleteResume,
  setDefault as apiSetDefault,
  exportResume as apiExportResume,
} from '@/api/resume';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Skeleton } from '@/components/ui/skeleton';

type SectionKey =
  | 'personal'
  | 'education'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'certificates'
  | 'selfEval';

const SKILL_LEVELS = [
  { value: 'beginner', label: '入门' },
  { value: 'intermediate', label: '熟练' },
  { value: 'advanced', label: '精通' },
  { value: 'expert', label: '专家' },
];

const DEGREE_OPTIONS = ['高中', '大专', '本科', '硕士', '博士', '其他'];

function emptyPersonalInfo(): ResumePersonalInfo {
  return {
    name: '',
    phone: '',
    email: '',
    city: '',
    jobIntention: '',
    avatarUrl: '',
  };
}

function emptyEducation(): ResumeEducationItem {
  return { school: '', major: '', degree: '', startDate: '', endDate: '', description: '' };
}

function emptyExperience(): ResumeExperienceItem {
  return { company: '', position: '', startDate: '', endDate: '', description: '' };
}

function emptyProject(): ResumeProjectItem {
  return { name: '', role: '', startDate: '', endDate: '', description: '', techStack: [] };
}

function emptySkill(): ResumeSkillItem {
  return { name: '', level: 'intermediate' };
}

function emptyCertificate(): ResumeCertificateItem {
  return { name: '', issuer: '', date: '' };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr;
}

const ResumePage = () => {
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [resumes, setResumes] = useState<UserResume[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingResume, setLoadingResume] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentResume, setCurrentResume] = useState<UserResume | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    personal: true,
    education: true,
    experience: true,
    projects: true,
    skills: true,
    certificates: true,
    selfEval: true,
  });

  const [newResumeDialogOpen, setNewResumeDialogOpen] = useState<boolean>(false);
  const [newResumeTitle, setNewResumeTitle] = useState<string>('');
  const [newResumeTemplateId, setNewResumeTemplateId] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  const [deleteTarget, setDeleteTarget] = useState<UserResume | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const [exportContent, setExportContent] = useState<string>('');
  const [exportFilename, setExportFilename] = useState<string>('');
  const [exporting, setExporting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const [generating, setGenerating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Load templates & list on mount
  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoadingList(true);
      try {
        const [tplRes, listRes] = await Promise.all([
          getTemplates(),
          getResumeList(),
        ]);
        setTemplates(tplRes.items);
        setResumes(listRes.items);
        if (tplRes.items.length > 0 && !newResumeTemplateId) {
          setNewResumeTemplateId(tplRes.items[0].id);
        }
        if (listRes.items.length > 0) {
          const defaultOne = listRes.items.find((r: UserResume) => r.isDefault);
          const first = defaultOne ?? listRes.items[0];
          setSelectedId(first.id);
        }
      } catch (error) {
        logger.error('加载简历数据失败', error);
        toast.error('加载失败');
      } finally {
        setLoadingList(false);
      }
    };
    void load();
  }, []);

  // Load selected resume detail
  useEffect(() => {
    if (!selectedId) return;
    const load = async (): Promise<void> => {
      setLoadingResume(true);
      try {
        const data: UserResume = await getResume(selectedId);
        setCurrentResume(data);
      } catch (error) {
        logger.error('加载简历详情失败', error);
        toast.error('加载简历详情失败');
      } finally {
        setLoadingResume(false);
      }
    };
    void load();
  }, [selectedId]);

  const templateMap = useMemo(() => {
    const m: Record<string, ResumeTemplate> = {};
    for (const t of templates) m[t.id] = t;
    return m;
  }, [templates]);

  const getTemplateName = (templateId?: string): string => {
    if (!templateId) return '默认模板';
    return templateMap[templateId]?.name ?? '未知模板';
  };

  const toggleSection = (key: SectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ============ Field updaters ============

  const updateResumeField = <K extends keyof UpdateResumeRequest>(
    key: K,
    value: UpdateResumeRequest[K],
  ) => {
    if (!currentResume) return;
    setCurrentResume((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updatePersonal = (
    key: keyof ResumePersonalInfo,
    value: string,
  ) => {
    if (!currentResume) return;
    setCurrentResume((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        personalInfo: { ...prev.personalInfo, [key]: value },
      };
    });
  };

  // Generic list helpers — internal casts are safe because each call site
  // passes a key matching the item type.
  type ListKey = 'education' | 'experience' | 'projects' | 'skills' | 'certificates';

  const updateListItem = <K extends ListKey>(
    key: K,
    index: number,
    patch: object,
  ) => {
    if (!currentResume) return;
    setCurrentResume((prev) => {
      if (!prev) return prev;
      const list = [...(prev[key] as unknown as object[])];
      list[index] = { ...list[index], ...patch };
      return { ...prev, [key]: list } as unknown as UserResume;
    });
  };

  const addListItem = <K extends ListKey>(key: K, item: object) => {
    if (!currentResume) return;
    setCurrentResume((prev) => {
      if (!prev) return prev;
      const list = [...(prev[key] as unknown as object[]), item];
      return { ...prev, [key]: list } as unknown as UserResume;
    });
  };

  const removeListItem = <K extends ListKey>(key: K, index: number) => {
    if (!currentResume) return;
    setCurrentResume((prev) => {
      if (!prev) return prev;
      const list = (prev[key] as unknown as object[]).filter(
        (_: object, i: number) => i !== index,
      );
      return { ...prev, [key]: list } as unknown as UserResume;
    });
  };

  const moveListItem = <K extends ListKey>(
    key: K,
    index: number,
    dir: -1 | 1,
  ) => {
    if (!currentResume) return;
    const list = currentResume[key] as unknown as object[];
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= list.length) return;
    setCurrentResume((prev) => {
      if (!prev) return prev;
      const arr = [...(prev[key] as unknown as object[])];
      const [removed] = arr.splice(index, 1);
      arr.splice(newIndex, 0, removed);
      return { ...prev, [key]: arr } as unknown as UserResume;
    });
  };

  // ============ Save ============

  const handleSave = useCallback(async () => {
    if (!currentResume || !selectedId) return;
    setSaving(true);
    try {
      const data: UpdateResumeRequest = {
        title: currentResume.title,
        templateId: currentResume.templateId,
        personalInfo: currentResume.personalInfo,
        education: currentResume.education,
        experience: currentResume.experience,
        projects: currentResume.projects,
        skills: currentResume.skills,
        certificates: currentResume.certificates,
        selfEvaluation: currentResume.selfEvaluation,
      };
      const updated: UserResume = await updateResume(selectedId, data);
      setCurrentResume(updated);
      setResumes((prev) =>
        prev.map((r: UserResume) => (r.id === selectedId ? updated : r)),
      );
      toast.success('已保存');
    } catch (error) {
      logger.error('保存简历失败', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [currentResume, selectedId]);

  // ============ Create ============

  const openNewResumeDialog = () => {
    setNewResumeTitle('');
    if (templates.length > 0 && !newResumeTemplateId) {
      setNewResumeTemplateId(templates[0].id);
    }
    setNewResumeDialogOpen(true);
  };

  const handleCreateResume = async () => {
    if (!newResumeTitle.trim()) {
      toast.error('请输入简历标题');
      return;
    }
    setCreating(true);
    try {
      const dto: CreateResumeRequest = {
        title: newResumeTitle.trim(),
        templateId: newResumeTemplateId || undefined,
      };
      const created: UserResume = await createResume(dto);
      setResumes((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setNewResumeDialogOpen(false);
      toast.success('简历已创建');
    } catch (error) {
      logger.error('创建简历失败', error);
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  // ============ Generate from profile ============

  const handleGenerateFromProfile = async () => {
    setGenerating(true);
    try {
      const dto: CreateResumeRequest = {
        title: '个人资料生成简历',
        generateFromProfile: true,
        templateId: templates[0]?.id,
      };
      const created: UserResume = await createResume(dto);
      setResumes((prev) => [created, ...prev]);
      setSelectedId(created.id);
      toast.success('已从个人资料生成简历');
    } catch (error) {
      logger.error('从个人资料生成失败', error);
      toast.error('生成失败');
    } finally {
      setGenerating(false);
    }
  };

  // ============ Delete ============

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteResume(deleteTarget.id);
      setResumes((prev) => prev.filter((r: UserResume) => r.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) {
        const remaining = resumes.filter((r: UserResume) => r.id !== deleteTarget.id);
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
        setCurrentResume(null);
      }
      setDeleteTarget(null);
      toast.success('简历已删除');
    } catch (error) {
      logger.error('删除简历失败', error);
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // ============ Set default ============

  const handleSetDefault = async (id: string) => {
    try {
      const updated: UserResume = await apiSetDefault(id);
      setResumes((prev) =>
        prev.map((r: UserResume) => ({ ...r, isDefault: r.id === id ? true : false })),
      );
      if (selectedId === id) {
        setCurrentResume((prev) => (prev ? { ...prev, isDefault: true } : prev));
      }
      toast.success('已设为默认');
      void updated;
    } catch (error) {
      logger.error('设为默认失败', error);
      toast.error('设置失败');
    }
  };

  // ============ Export ============

  const handleExport = async () => {
    if (!selectedId) return;
    setExporting(true);
    setExportDialogOpen(true);
    setExportContent('');
    try {
      const result = await apiExportResume(selectedId);
      setExportContent(result.content);
      setExportFilename(result.filename);
    } catch (error) {
      logger.error('导出简历失败', error);
      toast.error('导出失败');
      setExportDialogOpen(false);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportContent);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error('复制失败', error);
      toast.error('复制失败');
    }
  };

  const handleDownloadMd = () => {
    try {
      const blob = new Blob([exportContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFilename || 'resume.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('已下载');
    } catch (error) {
      logger.error('下载失败', error);
      toast.error('下载失败');
    }
  };

  // ============ Render ============

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)] min-h-[600px]">
      {/* Left sidebar: resume list */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                我的简历
              </h3>
              <Button size="sm" onClick={openNewResumeDialog} data-ai-section-type="button">
                <Plus className="h-4 w-4" />
                新建
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleGenerateFromProfile}
              disabled={generating}
              data-ai-section-type="button"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              从个人资料生成
            </Button>
          </CardContent>
        </Card>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loadingList ? (
            Array.from({ length: 3 }).map((_, i: number) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </CardContent>
              </Card>
            ))
          ) : resumes.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              暂无简历，点击「新建」开始
            </div>
          ) : (
            resumes.map((r: UserResume) => (
              <Card
                key={r.id}
                className={`cursor-pointer transition-all hover:-translate-y-0.5 ${
                  selectedId === r.id
                    ? 'border-primary shadow-md ring-1 ring-primary/30'
                    : 'hover:border-primary/40'
                }`}
                onClick={() => setSelectedId(r.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{r.title}</p>
                        {r.isDefault && (
                          <Badge variant="default" className="shrink-0 text-[10px] h-4 px-1">
                            默认
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {getTemplateName(r.templateId)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(r.id);
                      }}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (r.isDefault) return;
                        void handleSetDefault(r.id);
                      }}
                      disabled={r.isDefault}
                    >
                      {r.isDefault ? (
                        <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-3 w-3 mr-1" />
                      )}
                      默认
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(r);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Right: editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {loadingResume || !currentResume ? (
          <Card className="flex-1">
            <CardContent className="p-8">
              {loadingResume ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-16">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>选择或创建一份简历开始编辑</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top bar */}
            <Card className="mb-3">
              <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={currentResume.title}
                    onChange={(e) => updateResumeField('title', e.target.value)}
                    className="text-lg font-semibold h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-40">
                    <Select
                      value={currentResume.templateId || ''}
                      onValueChange={(val) => updateResumeField('templateId', val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="选择模板" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t: ResumeTemplate) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    保存
                  </Button>
                  <Button size="sm" onClick={handleExport} data-ai-section-type="button">
                    <Download className="h-4 w-4 mr-1" />
                    导出
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Editor sections */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1" data-ai-section-type="card-list">
              {/* Personal Info */}
              <Card>
                <CardHeader
                  className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                  onClick={() => toggleSection('personal')}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">基本信息</h4>
                  </div>
                  {expandedSections.personal ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                {expandedSections.personal && (
                  <CardContent className="pt-0 pb-4 px-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">姓名</Label>
                      <Input
                        id="name"
                        value={currentResume.personalInfo.name}
                        onChange={(e) => updatePersonal('name', e.target.value)}
                        placeholder="请输入姓名"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="jobIntention">求职意向</Label>
                      <Input
                        id="jobIntention"
                        value={currentResume.personalInfo.jobIntention}
                        onChange={(e) => updatePersonal('jobIntention', e.target.value)}
                        placeholder="如：前端开发工程师"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">电话</Label>
                      <Input
                        id="phone"
                        value={currentResume.personalInfo.phone}
                        onChange={(e) => updatePersonal('phone', e.target.value)}
                        placeholder="手机号码"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">邮箱</Label>
                      <Input
                        id="email"
                        value={currentResume.personalInfo.email}
                        onChange={(e) => updatePersonal('email', e.target.value)}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="city">城市</Label>
                      <Input
                        id="city"
                        value={currentResume.personalInfo.city}
                        onChange={(e) => updatePersonal('city', e.target.value)}
                        placeholder="所在城市"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Education */}
              <Card>
                <CardHeader
                  className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                  onClick={() => toggleSection('education')}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">
                      教育经历
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        {currentResume.education.length} 条
                      </span>
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        addListItem('education', emptyEducation());
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      添加
                    </Button>
                    {expandedSections.education ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {expandedSections.education && (
                  <CardContent className="pt-0 pb-4 px-4 space-y-3">
                    {currentResume.education.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        暂无教育经历，点击「添加」开始
                      </p>
                    ) : (
                      currentResume.education.map(
                        (item: ResumeEducationItem, idx: number) => (
                          <div
                            key={idx}
                            className="border border-border/70 rounded-lg p-3 space-y-3 bg-muted/20"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                                <span className="text-xs">#{idx + 1}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => moveListItem('education', idx, -1)}
                                  disabled={idx === 0}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => moveListItem('education', idx, 1)}
                                  disabled={idx === currentResume.education.length - 1}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  onClick={() => removeListItem('education', idx)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">学校</Label>
                                <Input
                                  value={item.school}
                                  onChange={(e) =>
                                    updateListItem('education', idx, { school: e.target.value })
                                  }
                                  placeholder="学校名称"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">专业</Label>
                                <Input
                                  value={item.major}
                                  onChange={(e) =>
                                    updateListItem('education', idx, { major: e.target.value })
                                  }
                                  placeholder="专业名称"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">学历</Label>
                                <Select
                                  value={item.degree}
                                  onValueChange={(val) =>
                                    updateListItem('education', idx, { degree: val })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="选择学历" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DEGREE_OPTIONS.map((d: string) => (
                                      <SelectItem key={d} value={d}>
                                        {d}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">开始</Label>
                                  <Input
                                    value={item.startDate}
                                    onChange={(e) =>
                                      updateListItem('education', idx, { startDate: e.target.value })
                                    }
                                    placeholder="如 2020-09"
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">结束</Label>
                                  <Input
                                    value={item.endDate}
                                    onChange={(e) =>
                                      updateListItem('education', idx, { endDate: e.target.value })
                                    }
                                    placeholder="如 2024-06"
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">描述（可选）</Label>
                              <Textarea
                                value={item.description}
                                onChange={(e) =>
                                  updateListItem('education', idx, { description: e.target.value })
                                }
                                placeholder="GPA、获奖情况、主要课程等"
                                className="min-h-[60px] text-sm resize-none"
                              />
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Experience */}
              <Card>
                <CardHeader
                  className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                  onClick={() => toggleSection('experience')}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">
                      工作/实习经历
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        {currentResume.experience.length} 条
                      </span>
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        addListItem('experience', emptyExperience());
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      添加
                    </Button>
                    {expandedSections.experience ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {expandedSections.experience && (
                  <CardContent className="pt-0 pb-4 px-4 space-y-3">
                    {currentResume.experience.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        暂无工作/实习经历
                      </p>
                    ) : (
                      currentResume.experience.map(
                        (item: ResumeExperienceItem, idx: number) => (
                          <div
                            key={idx}
                            className="border border-border/70 rounded-lg p-3 space-y-3 bg-muted/20"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                                <span className="text-xs">#{idx + 1}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => moveListItem('experience', idx, -1)}
                                  disabled={idx === 0}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => moveListItem('experience', idx, 1)}
                                  disabled={idx === currentResume.experience.length - 1}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  onClick={() => removeListItem('experience', idx)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">公司</Label>
                                <Input
                                  value={item.company}
                                  onChange={(e) =>
                                    updateListItem('experience', idx, { company: e.target.value })
                                  }
                                  placeholder="公司名称"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">职位</Label>
                                <Input
                                  value={item.position}
                                  onChange={(e) =>
                                    updateListItem('experience', idx, { position: e.target.value })
                                  }
                                  placeholder="职位名称"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">开始时间</Label>
                                <Input
                                  value={item.startDate}
                                  onChange={(e) =>
                                    updateListItem('experience', idx, { startDate: e.target.value })
                                  }
                                  placeholder="如 2023-07"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">结束时间</Label>
                                <Input
                                  value={item.endDate}
                                  onChange={(e) =>
                                    updateListItem('experience', idx, { endDate: e.target.value })
                                  }
                                  placeholder="至今 / 2024-06"
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">工作描述</Label>
                              <Textarea
                                value={item.description}
                                onChange={(e) =>
                                  updateListItem('experience', idx, { description: e.target.value })
                                }
                                placeholder="描述你的工作内容和成果..."
                                className="min-h-[80px] text-sm resize-none"
                              />
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Projects */}
              <Card>
                <CardHeader
                  className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                  onClick={() => toggleSection('projects')}
                >
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">
                      项目经历
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        {currentResume.projects.length} 条
                      </span>
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        addListItem('projects', emptyProject());
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      添加
                    </Button>
                    {expandedSections.projects ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {expandedSections.projects && (
                  <CardContent className="pt-0 pb-4 px-4 space-y-3">
                    {currentResume.projects.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        暂无项目经历
                      </p>
                    ) : (
                      currentResume.projects.map(
                        (item: ResumeProjectItem, idx: number) => (
                          <div
                            key={idx}
                            className="border border-border/70 rounded-lg p-3 space-y-3 bg-muted/20"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                                <span className="text-xs">#{idx + 1}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => moveListItem('projects', idx, -1)}
                                  disabled={idx === 0}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => moveListItem('projects', idx, 1)}
                                  disabled={idx === currentResume.projects.length - 1}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  onClick={() => removeListItem('projects', idx)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">项目名</Label>
                                <Input
                                  value={item.name}
                                  onChange={(e) =>
                                    updateListItem('projects', idx, { name: e.target.value })
                                  }
                                  placeholder="项目名称"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">角色</Label>
                                <Input
                                  value={item.role}
                                  onChange={(e) =>
                                    updateListItem('projects', idx, { role: e.target.value })
                                  }
                                  placeholder="担任角色"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">开始时间</Label>
                                <Input
                                  value={item.startDate}
                                  onChange={(e) =>
                                    updateListItem('projects', idx, { startDate: e.target.value })
                                  }
                                  placeholder="如 2023-03"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">结束时间</Label>
                                <Input
                                  value={item.endDate}
                                  onChange={(e) =>
                                    updateListItem('projects', idx, { endDate: e.target.value })
                                  }
                                  placeholder="如 2023-09"
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">技术栈（逗号分隔）</Label>
                              <Input
                                value={item.techStack.join(', ')}
                                onChange={(e) =>
                                  updateListItem('projects', idx, {
                                    techStack: e.target.value
                                      .split(',')
                                      .map((s: string) => s.trim())
                                      .filter(Boolean),
                                  })
                                }
                                placeholder="React, TypeScript, Node.js"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">项目描述</Label>
                              <Textarea
                                value={item.description}
                                onChange={(e) =>
                                  updateListItem('projects', idx, { description: e.target.value })
                                }
                                placeholder="项目背景、你的职责与成果..."
                                className="min-h-[80px] text-sm resize-none"
                              />
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader
                  className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                  onClick={() => toggleSection('skills')}
                >
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">
                      技能
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        {currentResume.skills.length} 项
                      </span>
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        addListItem('skills', emptySkill());
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      添加
                    </Button>
                    {expandedSections.skills ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {expandedSections.skills && (
                  <CardContent className="pt-0 pb-4 px-4">
                    {currentResume.skills.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        暂无技能，点击「添加」开始
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {currentResume.skills.map(
                          (item: ResumeSkillItem, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 pl-3 pr-1 py-1 bg-primary/10 text-primary rounded-full text-sm border border-primary/20 group"
                            >
                              <span className="font-medium">{item.name}</span>
                              <Select
                                value={item.level}
                                onValueChange={(val) =>
                                  updateListItem('skills', idx, { level: val })
                                }
                              >
                                <SelectTrigger className="h-6 w-16 text-xs border-0 bg-transparent p-0 hover:bg-primary/20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SKILL_LEVELS.map((l) => (
                                    <SelectItem key={l.value} value={l.value}>
                                      {l.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-primary/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeListItem('skills', idx)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Certificates */}
              <Card>
                <CardHeader
                  className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                  onClick={() => toggleSection('certificates')}
                >
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">
                      证书
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        {currentResume.certificates.length} 条
                      </span>
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        addListItem('certificates', emptyCertificate());
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      添加
                    </Button>
                    {expandedSections.certificates ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {expandedSections.certificates && (
                  <CardContent className="pt-0 pb-4 px-4 space-y-2">
                    {currentResume.certificates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        暂无证书
                      </p>
                    ) : (
                      currentResume.certificates.map(
                        (item: ResumeCertificateItem, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 border border-border/70 rounded-lg bg-muted/20"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <Input
                                value={item.name}
                                onChange={(e) =>
                                  updateListItem('certificates', idx, { name: e.target.value })
                                }
                                placeholder="证书名称"
                                className="h-8 text-sm"
                              />
                              <Input
                                value={item.issuer}
                                onChange={(e) =>
                                  updateListItem('certificates', idx, { issuer: e.target.value })
                                }
                                placeholder="颁发机构"
                                className="h-8 text-sm"
                              />
                              <Input
                                value={item.date}
                                onChange={(e) =>
                                  updateListItem('certificates', idx, { date: e.target.value })
                                }
                                placeholder="获得时间"
                                className="h-8 text-sm"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                              onClick={() => removeListItem('certificates', idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ),
                      )
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Self Evaluation */}
              <Card>
                <CardHeader
                  className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
                  onClick={() => toggleSection('selfEval')}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">自我评价</h4>
                  </div>
                  {expandedSections.selfEval ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                {expandedSections.selfEval && (
                  <CardContent className="pt-0 pb-4 px-4">
                    <Textarea
                      value={currentResume.selfEvaluation}
                      onChange={(e) => updateResumeField('selfEvaluation', e.target.value)}
                      placeholder="介绍一下你的核心优势、性格特点、职业目标等..."
                      className="min-h-[120px] resize-none"
                    />
                  </CardContent>
                )}
              </Card>

              <div className="h-4" />
            </div>
          </>
        )}
      </div>

      {/* New Resume Dialog */}
      <Dialog open={newResumeDialogOpen} onOpenChange={setNewResumeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建简历</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newTitle">简历标题</Label>
              <Input
                id="newTitle"
                value={newResumeTitle}
                onChange={(e) => setNewResumeTitle(e.target.value)}
                placeholder="请输入简历标题"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>选择模板</Label>
              <Select
                value={newResumeTemplateId}
                onValueChange={setNewResumeTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择模板" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t: ResumeTemplate) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">取消</Button>
            </DialogClose>
            <Button onClick={handleCreateResume} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除简历「{deleteTarget?.title}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              导出 Markdown
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col min-h-[300px]">
            {exporting ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex-1 overflow-auto border border-border rounded-lg bg-muted/30 p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap text-foreground/90">
                  {exportContent}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter className="flex sm:justify-between flex-row gap-2">
            <Button
              variant="secondary"
              onClick={handleCopyToClipboard}
              disabled={exporting || !exportContent}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  复制到剪贴板
                </>
              )}
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="secondary">关闭</Button>
              </DialogClose>
              <Button
                onClick={handleDownloadMd}
                disabled={exporting || !exportContent}
                data-ai-section-type="button"
              >
                <Download className="h-4 w-4 mr-1" />
                下载 .md 文件
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResumePage;
