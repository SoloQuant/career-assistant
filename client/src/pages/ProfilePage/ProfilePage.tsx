import { useState, useEffect } from 'react';
import type { Profile, ProfileUpdateDto } from '@shared/api.interface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressRing } from '@/components/ui/progress-ring';
import {
  Pencil,
  X,
  Check,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  User,
  Building,
  BookOpen,
  Calendar,
  FileText,
  Quote,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getProfile, updateProfile } from '@/api/profile';

interface ProfileFieldProps {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  textarea?: boolean;
  className?: string;
}

const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value,
  editing,
  onChange,
  icon,
  textarea = false,
  className = '',
}) => {
  if (!editing) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <p className="text-sm font-medium text-foreground">
          {value || <span className="text-muted-foreground/60">未填写</span>}
        </p>
      </div>
    );
  }

  if (textarea) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </label>
        <Textarea
          value={value}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange(e.target.value)
          }
          rows={4}
          className="resize-none"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </label>
      <Input
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
      />
    </div>
  );
};

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  editing?: boolean;
  onChange?: (value: string) => void;
  textarea?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  label,
  value,
  editing = false,
  onChange,
  textarea = false,
}) => {
  const displayValue = value || '未填写';
  const isEmpty = !value;

  return (
    <Card className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(0_0_0_0.3)]">
      <CardContent className="p-5">
        {!editing ? (
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary transition-all duration-300 group-hover:bg-primary/25 group-hover:scale-110">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p
                className={`truncate text-base font-semibold ${
                  isEmpty ? 'text-muted-foreground/60' : 'text-foreground'
                }`}
              >
                {displayValue}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                {icon}
              </div>
              <span>{label}</span>
            </div>
            {textarea ? (
              <Textarea
                value={value}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  onChange?.(e.target.value)
                }
                rows={3}
                className="resize-none"
              />
            ) : (
              <Input
                value={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange?.(e.target.value)
                }
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [editData, setEditData] = useState<ProfileUpdateDto>({});
  const [successVisible, setSuccessVisible] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled: boolean = false;

    const load = async (): Promise<void> => {
      setLoading(true);
      setErrorMsg('');
      try {
        const data: Profile = await getProfile();
        if (!cancelled) {
          setProfile(data);
        }
      } catch (error: unknown) {
        logger.error('加载个人资料失败', error as Error);
        if (!cancelled) {
          setErrorMsg('加载失败，请刷新页面重试');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleEdit = (): void => {
    if (!profile) return;
    setEditData({
      name: profile.name,
      school: profile.school,
      department: profile.department,
      major: profile.major,
      grade: profile.grade,
      city: profile.city,
      jobIntention: profile.jobIntention,
      contact: profile.contact,
      email: profile.email,
      bio: profile.bio,
    });
    setEditing(true);
    setSuccessVisible(false);
  };

  const handleCancel = (): void => {
    setEditing(false);
    setEditData({});
    setErrorMsg('');
  };

  const handleSave = async (): Promise<void> => {
    if (!profile) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const updated: Profile = await updateProfile(editData);
      setProfile(updated);
      setEditing(false);
      setEditData({});
      setSuccessVisible(true);
      window.setTimeout(() => {
        setSuccessVisible(false);
      }, 3000);
    } catch (error: unknown) {
      logger.error('保存个人资料失败', error as Error);
      setErrorMsg('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ProfileUpdateDto, value: string): void => {
    setEditData((prev: ProfileUpdateDto) => ({ ...prev, [field]: value }));
  };

  const getDisplayValue = (field: keyof Profile): string => {
    if (editing) {
      return (editData[field] as string) ?? '';
    }
    return profile?.[field] ?? '';
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i: number) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-3 w-16 mb-3" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName: string = getDisplayValue('name') || '未命名';
  const displayJob: string = getDisplayValue('jobIntention') || '暂未设置求职意向';
  const displaySchool: string = getDisplayValue('school') || '未填写';
  const displayMajor: string = getDisplayValue('major') || '未填写';
  const displayGrade: string = getDisplayValue('grade') || '未填写';

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* 顶部横幅 */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50">
        {/* 渐变背景 + 网格装饰 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at top left, hsl(210 60% 20%) 0%, hsl(220 50% 10%) 50%, hsl(230 40% 8%) 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(125,211,252,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* 光斑装饰 */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl"
          style={{ background: 'hsl(190 90% 55% / 15%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-10 left-1/4 h-40 w-40 rounded-full blur-3xl"
          style={{ background: 'hsl(240 70% 60% / 12%)' }}
        />

        <div className="relative h-52 px-6 md:px-10">
          <div className="flex h-full items-center justify-between gap-6">
            {/* 左侧：头像 + 信息 */}
            <div className="flex items-center gap-5 md:gap-6">
              <div className="relative">
                <div
                  className="absolute -inset-1 rounded-full blur-md opacity-70"
                  style={{ background: 'hsl(190 90% 55%)' }}
                />
                <div
                  className="relative flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-primary"
                  style={{
                    background:
                      'radial-gradient(circle, hsl(200 50% 15%) 0%, hsl(220 40% 10%) 100%)',
                    boxShadow:
                      '0 0 0 4px hsl(190 90% 55%), 0 0 20px hsl(190 90% 55% / 50%)',
                  }}
                >
                  {displayName.charAt(0).toUpperCase() || (
                    <User className="h-10 w-10" />
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {displayName}
                </h1>
                <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  {displaySchool} · {displayMajor} · {displayGrade}
                </p>
                <Badge
                  className="border-primary/30 bg-primary/15 text-primary hover:bg-primary/20"
                  variant="outline"
                >
                  <Briefcase className="mr-1.5 h-3 w-3" />
                  {displayJob}
                </Badge>
              </div>
            </div>

            {/* 右侧：进度环 + 编辑按钮 */}
            <div className="flex items-center gap-6">
              <div className="hidden sm:block">
                <ProgressRing
                  value={35}
                  size={120}
                  strokeWidth={8}
                  color="hsl(190 90% 55%)"
                  trackColor="hsl(215 30% 22% / 60%)"
                  label="求职进度"
                />
              </div>

              {/* 编辑按钮组 */}
              {!editing ? (
                <Button
                  onClick={handleEdit}
                  size="sm"
                  className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 backdrop-blur-sm shadow-lg shadow-primary/10"
                  variant="outline"
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  编辑
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={saving}
                    className="backdrop-blur-sm"
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    取消
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Check className="mr-1.5 h-4 w-4" />
                    {saving ? '保存中...' : '保存'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 成功 / 错误提示 */}
      {successVisible && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
          <Check className="h-4 w-4" />
          保存成功
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <X className="h-4 w-4" />
          {errorMsg}
        </div>
      )}

      {/* 基本信息分组 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">基本信息</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            icon={<Building className="h-5 w-5" />}
            label="学校"
            value={getDisplayValue('school')}
            editing={editing}
            onChange={(v: string) => updateField('school', v)}
          />
          <InfoCard
            icon={<BookOpen className="h-5 w-5" />}
            label="院系"
            value={getDisplayValue('department')}
            editing={editing}
            onChange={(v: string) => updateField('department', v)}
          />
          <InfoCard
            icon={<GraduationCap className="h-5 w-5" />}
            label="专业"
            value={getDisplayValue('major')}
            editing={editing}
            onChange={(v: string) => updateField('major', v)}
          />
          <InfoCard
            icon={<Calendar className="h-5 w-5" />}
            label="年级"
            value={getDisplayValue('grade')}
            editing={editing}
            onChange={(v: string) => updateField('grade', v)}
          />
          <InfoCard
            icon={<MapPin className="h-5 w-5" />}
            label="所在城市"
            value={getDisplayValue('city')}
            editing={editing}
            onChange={(v: string) => updateField('city', v)}
          />
          <InfoCard
            icon={<User className="h-5 w-5" />}
            label="姓名"
            value={getDisplayValue('name')}
            editing={editing}
            onChange={(v: string) => updateField('name', v)}
          />
        </div>
      </div>

      {/* 联系方式分组 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <MessageCircle className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">联系方式</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            icon={<Mail className="h-5 w-5" />}
            label="邮箱"
            value={getDisplayValue('email')}
            editing={editing}
            onChange={(v: string) => updateField('email', v)}
          />
          <InfoCard
            icon={<Phone className="h-5 w-5" />}
            label="联系电话"
            value={getDisplayValue('contact')}
            editing={editing}
            onChange={(v: string) => updateField('contact', v)}
          />
          <InfoCard
            icon={<Briefcase className="h-5 w-5" />}
            label="求职意向"
            value={getDisplayValue('jobIntention')}
            editing={editing}
            onChange={(v: string) => updateField('jobIntention', v)}
          />
        </div>
      </div>

      {/* 个人简介 */}
      <Card className="overflow-hidden border border-border/60 transition-all duration-300 hover:border-primary/30">
        <CardContent className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Quote className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">个人简介</h2>
          </div>
          {!editing ? (
            <div className="relative pl-4">
              <Quote
                className="absolute -left-1 -top-1 h-6 w-6 text-primary/20"
                strokeWidth={1.5}
              />
              <p className="text-sm leading-relaxed text-foreground/90 relative z-10">
                {getDisplayValue('bio') || (
                  <span className="text-muted-foreground/60">
                    暂无个人简介，点击编辑来介绍一下自己吧～
                  </span>
                )}
              </p>
            </div>
          ) : (
            <Textarea
              value={getDisplayValue('bio')}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateField('bio', e.target.value)
              }
              rows={4}
              className="resize-none"
            />
          )}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground/50 pt-2 pb-4">
        v1.5 · 2026.09.08
      </div>
    </div>
  );
};

export default ProfilePage;
