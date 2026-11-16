import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Copy,
  Check,
  FileText,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  Clock,
  CircleDot,
  User,
  Briefcase,
  Award,
  Target,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getProfile } from '@/api/profile';
import { getSkills } from '@/api/skills';
import type { Profile, Skill } from '@shared/api.interface';

type TimelineStatus = 'completed' | 'in_progress' | 'upcoming';

interface TimelineStage {
  id: number;
  title: string;
  timeRange: string;
  status: TimelineStatus;
  description: string;
}

const TIMELINE_STAGES: TimelineStage[] = [
  {
    id: 1,
    title: '提前批',
    timeRange: '6月 - 8月',
    status: 'completed',
    description: '大厂核心岗位提前开放，竞争激烈但机会多',
  },
  {
    id: 2,
    title: '正式批网申',
    timeRange: '8月上 - 12月',
    status: 'in_progress',
    description: '秋招主战场，各企业全面开放网申通道',
  },
  {
    id: 3,
    title: '笔试',
    timeRange: '8月下 - 10月',
    status: 'in_progress',
    description: '线上笔试集中期，行测+专业知识+编程题',
  },
  {
    id: 4,
    title: '面试',
    timeRange: '9月 - 10月',
    status: 'upcoming',
    description: '技术面+HR面+主管面，多轮面试集中爆发',
  },
  {
    id: 5,
    title: 'Offer发放',
    timeRange: '9月 - 11月',
    status: 'upcoming',
    description: '首批Offer陆续发放，sp offer谈判期',
  },
];

const JOB_TIPS = [
  {
    title: '简历要量化',
    content: '用数据说话，"提升了30%性能"比"优化了性能"更有说服力',
    icon: <Target className="h-4 w-4" />,
  },
  {
    title: '投递有策略',
    content: '分批次投递：保底档 → 主攻档 → 冲刺档，保持节奏',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    title: '笔试勤刷题',
    content: 'LeetCode Hot 100 + 企业真题，每天保持手感',
    icon: <Award className="h-4 w-4" />,
  },
  {
    title: '面试要复盘',
    content: '每次面试后立即记录问题和回答，查漏补缺',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    title: '信息差制胜',
    content: '多关注牛客/脉脉/官网，内推比海投效率高10倍',
    icon: <Lightbulb className="h-4 w-4" />,
  },
];

function buildResumeContent(profile: Profile, skills: Skill[]): string {
  const lines: string[] = [];

  lines.push('═'.repeat(50));
  lines.push('  个 人 简 历');
  lines.push('═'.repeat(50));
  lines.push('');

  // 基本信息
  lines.push('【基本信息】');
  lines.push(`姓名：${profile.name || '（待补充）'}`);
  lines.push(`学校：${profile.school || '（待补充）'}`);
  lines.push(
    `学院/专业：${profile.department || ''} ${profile.major || ''}`.trim() ||
      '学院/专业：（待补充）'
  );
  lines.push(`年级：${profile.grade || '（待补充）'}`);
  lines.push(`所在城市：${profile.city || '（待补充）'}`);
  lines.push(`联系电话：${profile.contact || '（待补充）'}`);
  lines.push(`邮箱：${profile.email || '（待补充）'}`);
  lines.push('');

  // 求职意向
  lines.push('【求职意向】');
  lines.push(profile.jobIntention || '（待补充，例如：大数据开发工程师 / 意向城市：北京）');
  lines.push('');

  // 技能清单
  lines.push('【技能清单】');
  if (skills.length === 0) {
    lines.push('  （暂无技能数据，建议先在"技能管理"中添加）');
  } else {
    const byCategory = new Map<string, Skill[]>();
    for (const s of skills) {
      const list = byCategory.get(s.category) ?? [];
      list.push(s);
      byCategory.set(s.category, list);
    }
    const categoryOrder = [
      'programming_language',
      'bigdata_framework',
      'database',
      'machine_learning',
      'visualization',
      'soft_skill',
    ];
    const categoryLabels: Record<string, string> = {
      programming_language: '编程语言',
      bigdata_framework: '大数据框架',
      database: '数据库',
      machine_learning: '机器学习',
      visualization: '可视化',
      soft_skill: '综合能力',
    };
    for (const cat of categoryOrder) {
      const list = byCategory.get(cat);
      if (!list || list.length === 0) continue;
      lines.push(`  ▸ ${categoryLabels[cat] || cat}：`);
      for (const sk of list) {
        const stars = '★'.repeat(Math.max(1, Math.min(5, Math.round(sk.selfRating / 20)))) +
          '☆'.repeat(5 - Math.max(1, Math.min(5, Math.round(sk.selfRating / 20))));
        lines.push(`    - ${sk.name}  ${stars}  ${sk.description || ''}`.trimEnd());
      }
    }
  }
  lines.push('');

  // 个人简介
  lines.push('【个人简介】');
  lines.push(profile.bio || '  （待补充：用2-3句话概括你的核心优势、技术方向和职业目标）');
  lines.push('');

  // 相关经历
  lines.push('【实习/项目经历】');
  lines.push('  ⚑ 建议在此处补充 2-3 段相关经历，每段包含：');
  lines.push('    · 公司/项目名称 + 时间 + 角色');
  lines.push('    · 你做了什么（用动词开头：设计/开发/优化/主导...）');
  lines.push('    · 取得了什么成果（尽量量化：提升X%、处理Y条数据、支撑Z业务）');
  lines.push('');

  lines.push('═'.repeat(50));
  lines.push('  以上为简历框架，建议根据目标岗位进一步定制');
  lines.push('═'.repeat(50));

  return lines.join('\n');
}

const JobHuntingPage = () => {
  const [resumeText, setResumeText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generateError, setGenerateError] = useState<string>('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError('');
    setCopied(false);
    try {
      const [profile, skills] = await Promise.all([getProfile(), getSkills()]);
      const content = buildResumeContent(profile, skills);
      setResumeText(content);
    } catch (error: unknown) {
      logger.error('生成简历失败', error as Error);
      setGenerateError('获取数据失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!resumeText) return;
    try {
      await navigator.clipboard.writeText(resumeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      logger.error('复制失败', error as Error);
    }
  };

  // Find the first in_progress stage as "current"
  const currentStageIdx = TIMELINE_STAGES.findIndex(
    (s) => s.status === 'in_progress',
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">求职期助手</h2>
          <p className="text-sm text-muted-foreground">
            2027届秋招时间线 · 一键生成简历框架 · 求职小贴士
          </p>
        </div>
      </div>

      {/* Horizontal Timeline */}
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            2027届秋招时间线
          </CardTitle>
          <CardDescription>
            当前时间：2026年9月 · 把握黄金招聘期
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Horizontal line background */}
            <div className="absolute top-5 left-6 right-6 h-0.5 bg-border" />
            {/* Progress line overlay */}
            <div
              className="absolute top-5 left-6 h-0.5 bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
              style={{
                width: `calc(${(currentStageIdx / (TIMELINE_STAGES.length - 1)) * 100}% * (100% - 48px) / 100% + 24px)`,
              }}
            />
            {/* Stage nodes */}
            <div className="relative flex justify-between">
              {TIMELINE_STAGES.map((stage: TimelineStage, idx: number) => {
                const isCompleted = stage.status === 'completed';
                const isActive = stage.status === 'in_progress';
                const isCurrent = idx === currentStageIdx;

                return (
                  <div
                    key={stage.id}
                    className="flex flex-col items-center gap-2 flex-1 px-1"
                  >
                    {/* Dot */}
                    <div className="relative">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 z-10 transition-all duration-300 ${
                          isCompleted
                            ? 'bg-primary border-primary text-white'
                            : isActive
                            ? 'bg-primary border-primary text-white ring-4 ring-primary/20 shadow-lg shadow-primary/30'
                            : 'bg-background border-border text-muted-foreground'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : isActive ? (
                          <CircleDot className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      {isCurrent && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <Badge className="bg-primary text-primary-foreground border-none text-[10px] px-1.5 py-0">
                            你在这里
                          </Badge>
                        </div>
                      )}
                    </div>
                    {/* Title */}
                    <span
                      className={`text-xs font-semibold text-center ${
                        isCompleted || isActive ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {stage.title}
                    </span>
                    {/* Time */}
                    <span className="text-[10px] text-muted-foreground text-center">
                      {stage.timeRange}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 左侧：时间线详情 + 小贴士 */}
        <div className="space-y-6 lg:col-span-3">
          {/* 阶段详情卡（纵向） */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">各阶段详情</CardTitle>
              <CardDescription>了解秋招每个阶段的重点任务</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                <ul className="space-y-4">
                  {TIMELINE_STAGES.map((stage: TimelineStage) => {
                    const isCompleted = stage.status === 'completed';
                    const isActive = stage.status === 'in_progress';
                    return (
                      <li key={stage.id} className="relative pl-8">
                        <span
                          className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                            isCompleted
                              ? 'bg-primary border-primary'
                              : isActive
                              ? 'bg-primary border-primary ring-4 ring-primary/10'
                              : 'bg-background border-border'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          ) : isActive ? (
                            <CircleDot className="h-3 w-3 text-white" />
                          ) : (
                            <Clock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </span>
                        <div
                          className={`rounded-lg border p-3 transition-all ${
                            isActive
                              ? 'border-primary/30 bg-primary/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{stage.title}</span>
                            <Badge
                              variant={
                                isCompleted
                                  ? 'default'
                                  : isActive
                                  ? 'default'
                                  : 'outline'
                              }
                              className={
                                isCompleted
                                  ? 'bg-primary/80 hover:bg-primary/80 text-white'
                                  : isActive
                                  ? 'bg-primary hover:bg-primary text-white'
                                  : ''
                              }
                            >
                              {isCompleted ? '已完成' : isActive ? '进行中' : '即将开始'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {stage.timeRange}
                          </p>
                          <p className="mt-1 text-sm">{stage.description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 求职小贴士 */}
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-[hsl(38_90%_55%)]" />
                求职小贴士
              </CardTitle>
              <CardDescription>秋招路上的实用建议</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {JOB_TIPS.map((tip, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-md hover:border-primary/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(38_90%_55%)]/15 text-[hsl(38_90%_55%)]">
                        {tip.icon}
                      </span>
                      <span className="font-medium">{tip.title}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {tip.content}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：简历生成 */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="w-full h-1 bg-gradient-to-r from-primary/60 to-primary" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                简历生成
              </CardTitle>
              <CardDescription>
                基于你的个人资料和技能，一键生成简历框架
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    生成简历
                  </>
                )}
              </Button>

              {generateError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {generateError}
                </div>
              )}

              {resumeText && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">简历预览</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[hsl(160_70%_50%)]" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          复制
                        </>
                      )}
                    </Button>
                  </div>
                  {/* Resume preview card - paper-like */}
                  <div className="max-h-[520px] overflow-auto rounded-lg bg-white text-slate-800 p-5 shadow-xl ring-1 ring-black/5 font-mono text-[12.5px] leading-relaxed dark:bg-slate-100">
                    <pre className="whitespace-pre-wrap break-words">
                      {resumeText}
                    </pre>
                  </div>
                </div>
              )}

              {!resumeText && !isGenerating && !generateError && (
                <div className="rounded-lg border-2 border-dashed border-border bg-secondary/20 p-8 text-center transition-all hover:border-primary/30">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <p className="mt-3 text-sm font-medium">
                    点击上方按钮生成简历
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    将自动整合你的个人资料与技能信息
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default JobHuntingPage;
