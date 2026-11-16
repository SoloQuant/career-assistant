import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  MapPinIcon,
  BanknoteIcon,
  CheckIcon,
  XIcon,
  ExternalLinkIcon,
  SparklesIcon,
  Building2Icon,
  SearchIcon,
  BriefcaseIcon,
} from 'lucide-react';
import type { JobItem } from '@shared/api.interface';
import { JOB_SOURCE_OPTIONS } from '@shared/api.interface';
import { getRecommendedJobs } from '@/api/jobs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ProgressRing } from '@/components/ui/progress-ring';

const JOB_TYPE_OPTIONS = [
  { key: 'all', label: '全部类型' },
  { key: 'full_time', label: '全职' },
  { key: 'internship', label: '实习' },
  { key: 'campus', label: '校招' },
];

const CITY_OPTIONS = [
  { key: 'all', label: '全部城市' },
  { key: 'dalian', label: '大连' },
  { key: 'other', label: '全国其他' },
];

const SALARY_OPTIONS = [
  { key: 'all', label: '不限薪资' },
  { key: '0-10', label: '10K 以下' },
  { key: '10-20', label: '10-20K' },
  { key: '20-30', label: '20-30K' },
  { key: '30-50', label: '30-50K' },
  { key: '50-999', label: '50K 以上' },
];

const SOURCE_OPTIONS = JOB_SOURCE_OPTIONS;

function getMatchInfo(score: number | undefined): {
  color: string;
  label: string;
  level: 'high' | 'medium' | 'low';
} {
  if (score === undefined) {
    return { color: 'hsl(215 20% 65%)', label: '暂无匹配', level: 'low' };
  }
  if (score >= 80) {
    return { color: 'hsl(190 90% 55%)', label: '高匹配', level: 'high' };
  }
  if (score >= 60) {
    return { color: 'hsl(210 90% 65%)', label: '中匹配', level: 'medium' };
  }
  return { color: 'hsl(215 20% 65%)', label: '待提升', level: 'low' };
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: '全职',
  internship: '实习',
  campus: '校招',
};

// Generate a deterministic gradient from company name
function getCompanyGradient(name: string): { from: string; to: string } {
  const gradients = [
    { from: '#22d3ee', to: '#0ea5e9' },
    { from: '#a78bfa', to: '#7c3aed' },
    { from: '#4ade80', to: '#16a34a' },
    { from: '#fb923c', to: '#ea580c' },
    { from: '#f472b6', to: '#db2777' },
    { from: '#facc15', to: '#d97706' },
    { from: '#38bdf8', to: '#0284c7' },
    { from: '#f87171', to: '#dc2626' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

const JobsPage = () => {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [salaryFilter, setSalaryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const data = await getRecommendedJobs({
          source: sourceFilter !== 'all' ? sourceFilter : undefined,
        });
        setJobs(data);
      } catch (error) {
        logger.error('加载岗位推荐失败', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [sourceFilter]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (job: JobItem) =>
          job.title.toLowerCase().includes(kw) ||
          job.company.toLowerCase().includes(kw),
      );
    }

    if (cityFilter === 'dalian') {
      result = result.filter((job: JobItem) => job.city.includes('大连'));
    } else if (cityFilter === 'other') {
      result = result.filter((job: JobItem) => !job.city.includes('大连'));
    }

    if (typeFilter !== 'all') {
      result = result.filter((job: JobItem) => job.jobType === typeFilter);
    }

    if (salaryFilter !== 'all') {
      const [minStr, maxStr] = salaryFilter.split('-');
      const minK = Number(minStr);
      const maxK = Number(maxStr);
      result = result.filter((job: JobItem) => {
        const jMin = job.salaryMin ?? 0;
        const jMax = job.salaryMax ?? 999;
        return jMin < maxK && jMax > minK;
      });
    }

    if (sourceFilter !== 'all') {
      result = result.filter((job: JobItem) => job.source === sourceFilter);
    }

    result.sort((a: JobItem, b: JobItem) => {
      const scoreA = a.matchScore ?? 0;
      const scoreB = b.matchScore ?? 0;
      return scoreB - scoreA;
    });

    return result;
  }, [jobs, keyword, cityFilter, typeFilter, salaryFilter, sourceFilter]);

  const handleApply = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            岗位推荐
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            基于你的技能画像智能匹配优质岗位
          </p>
        </div>
        <Badge
          variant="outline"
          className="gap-1 border-primary/30 text-primary bg-primary/5"
        >
          <SparklesIcon className="h-3 w-3" />
          智能匹配
        </Badge>
      </div>

      {/* 筛选栏 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  关键词搜索
                </Label>
                <div className="relative group">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    placeholder="搜索岗位名称或公司关键词..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="pl-9 transition-all duration-200 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:w-[720px] md:grid-cols-4">
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    城市
                  </Label>
                  <Select
                    value={cityFilter}
                    onValueChange={setCityFilter}
                  >
                    <SelectTrigger className="w-full transition-all duration-200 focus:ring-primary/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    职位类型
                  </Label>
                  <Select
                    value={typeFilter}
                    onValueChange={setTypeFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    薪资范围
                  </Label>
                  <Select
                    value={salaryFilter}
                    onValueChange={setSalaryFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SALARY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    来源平台
                  </Label>
                  <Select
                    value={sourceFilter}
                    onValueChange={setSourceFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 结果数量 */}
      {!loading && filteredJobs.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground"
        >
          共找到 <span className="font-mono font-semibold text-foreground">{filteredJobs.length}</span> 个匹配岗位
        </motion.p>
      )}

      {/* 岗位卡片列表 */}
      {loading ? (
        <div className="space-y-3" data-ai-section-type="card-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/40">
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <Skeleton className="h-[60px] w-[60px] shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-[56px] w-[56px] shrink-0 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-border/60">
            <CardContent className="p-10">
              <Empty>
                <EmptyMedia variant="icon">
                  <BriefcaseIcon className="h-12 w-12 text-muted-foreground" />
                </EmptyMedia>
                <EmptyContent>
                  <EmptyTitle>没有找到匹配的岗位</EmptyTitle>
                  <EmptyDescription>
                    试试调整筛选条件，或者稍后再来查看最新岗位
                  </EmptyDescription>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-3" data-ai-section-type="card-list">
          <AnimatePresence mode="popLayout">
            {filteredJobs.map((job: JobItem, index: number) => {
              const matchInfo = getMatchInfo(job.matchScore);
              const isHighMatch = matchInfo.level === 'high';
              const gradient = getCompanyGradient(job.company);
              const initials = job.company.charAt(0);

              return (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{
                    duration: 0.35,
                    delay: Math.min(index * 0.03, 0.3),
                  }}
                >
                  <Card
                    className={`relative overflow-hidden border-border/60 bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-lg ${
                      isHighMatch
                        ? 'border-primary/40 shadow-md shadow-primary/10 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/15'
                        : ''
                    }`}
                  >
                    {/* High match left accent bar */}
                    {isHighMatch && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-cyan-400 to-primary" />
                    )}

                    <CardContent className={`p-5 ${isHighMatch ? 'pl-6' : ''}`}>
                      <div className="flex items-start gap-4">
                        {/* Company logo placeholder */}
                        <div
                          className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white shadow-md"
                          style={{
                            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                            boxShadow: `0 4px 12px ${gradient.from}40`,
                          }}
                        >
                          {initials}
                        </div>

                        {/* Main content */}
                        <div className="min-w-0 flex-1">
                          {/* Title row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-semibold text-foreground">
                                {job.title}
                              </h3>
                              <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                                <Building2Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{job.company}</span>
                              </div>
                            </div>
                          </div>

                          {/* Location + salary row */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
                              {job.city}
                            </span>
                            <span className="flex items-center gap-1 font-mono text-base font-bold text-primary">
                              <BanknoteIcon className="h-4 w-4 shrink-0" />
                              {job.salary}
                            </span>
                          </div>

                          {/* Tags row */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <Badge variant="secondary" className="text-xs">
                              {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {job.source}
                            </Badge>
                            {job.requiredSkills &&
                              job.requiredSkills.length > 0 &&
                              job.requiredSkills
                                .slice(0, 3)
                                .map((skill: string, idx: number) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs border-primary/20 text-primary/80"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                            {job.requiredSkills &&
                              job.requiredSkills.length > 3 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-muted-foreground"
                                >
                                  +{job.requiredSkills.length - 3}
                                </Badge>
                              )}
                          </div>

                          {/* Match reasons preview */}
                          {job.matchReasons &&
                            job.matchReasons.length > 0 && (
                              <div className="mt-3">
                                <ul className="space-y-1">
                                  {job.matchReasons
                                    .slice(0, 1)
                                    .map(
                                      (reason: string, idx: number) => (
                                        <li
                                          key={idx}
                                          className="flex items-start gap-1.5 text-xs text-muted-foreground"
                                        >
                                          <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                                          <span className="truncate">
                                            {reason}
                                          </span>
                                        </li>
                                      ),
                                    )}
                                </ul>
                              </div>
                            )}
                        </div>

                        {/* Match score ring + apply button */}
                        <div className="flex shrink-0 flex-col items-center gap-2">
                          <ProgressRing
                            value={job.matchScore ?? 0}
                            size={56}
                            strokeWidth={5}
                            color={matchInfo.color}
                            trackColor="hsl(217 33% 20%)"
                            showValue
                          />
                          <Badge
                            variant={
                              isHighMatch
                                ? 'default'
                                : matchInfo.level === 'medium'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {matchInfo.label}
                          </Badge>
                          <Button
                            size="sm"
                            variant={isHighMatch ? 'default' : 'outline'}
                            onClick={() => handleApply(job.applyUrl)}
                            className="w-full gap-1 text-xs"
                          >
                            投递
                            <ExternalLinkIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default JobsPage;
