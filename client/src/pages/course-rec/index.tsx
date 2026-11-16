import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Search,
  BookOpen,
  Clock,
  Users,
  Star,
  ExternalLink,
  Filter,
  Award,
  ChevronDown,
  ChevronUp,
  Target,
  Sparkles,
  Route,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import {
  getCourses,
  getPersonalizedCourses,
  getLearningPaths,
} from '@/api/course-rec';
import type { CourseItem } from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const CHART_THEME = 'ud';

const SKILL_OPTIONS = [
  { value: 'all', label: '全部技能' },
  { value: 'Python', label: 'Python' },
  { value: 'SQL', label: 'SQL' },
  { value: 'Excel', label: 'Excel' },
  { value: 'Tableau', label: 'Tableau' },
  { value: 'Spark', label: 'Spark' },
  { value: 'Hadoop', label: 'Hadoop' },
  { value: 'Java', label: 'Java' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'React', label: 'React' },
  { value: 'Machine Learning', label: '机器学习' },
  { value: 'Deep Learning', label: '深度学习' },
  { value: 'Statistics', label: '统计学' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: '全部分类' },
  { value: 'programming', label: '编程语言' },
  { value: 'data_analysis', label: '数据分析' },
  { value: 'big_data', label: '大数据' },
  { value: 'machine_learning', label: '机器学习' },
  { value: 'visualization', label: '可视化' },
  { value: 'database', label: '数据库' },
  { value: 'business', label: '商业思维' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: '全部难度' },
  { value: 'beginner', label: '入门' },
  { value: 'intermediate', label: '进阶' },
  { value: 'hard', label: '高级' },
];

const PLATFORM_OPTIONS = [
  { value: 'all', label: '全部平台' },
  { value: 'Coursera', label: 'Coursera' },
  { value: 'Udemy', label: 'Udemy' },
  { value: 'edX', label: 'edX' },
  { value: '极客时间', label: '极客时间' },
  { value: '网易云课堂', label: '网易云课堂' },
  { value: 'B站', label: 'B 站' },
  { value: '慕课网', label: '慕课网' },
];

const SORT_OPTIONS = [
  { value: 'hot', label: '热度最高' },
  { value: 'rating', label: '评分最高' },
  { value: 'duration', label: '时长最短' },
  { value: 'latest', label: '最新发布' },
];

const JOB_OPTIONS = [
  { value: 'data_analyst', label: '数据分析师' },
  { value: 'data_engineer', label: '数据工程师' },
  { value: 'data_scientist', label: '数据科学家' },
  { value: 'backend_engineer', label: '后端工程师' },
  { value: 'frontend_engineer', label: '前端工程师' },
  { value: 'product_manager', label: '产品经理' },
];

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '入门',
  intermediate: '进阶',
  hard: '高级',
};

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  intermediate: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-rose-100 text-rose-700 border-rose-200',
};

// ---------- Course Card ----------
const CourseCard = ({ course }: { course: CourseItem }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="flex flex-col border-border/60 bg-card/80 backdrop-blur transition-all hover:shadow-md">
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold">{course.title}</h3>
          {course.isFree ? (
            <Badge variant="default" className="shrink-0 bg-emerald-500">
              免费
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">
              付费
            </Badge>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1 border-primary/30 bg-primary/5 text-primary"
          >
            <BookOpen className="h-3 w-3" />
            {course.platform}
          </Badge>
          {course.difficulty && (
            <Badge
              variant="outline"
              className={DIFFICULTY_COLOR[course.difficulty] || ''}
            >
              {DIFFICULTY_LABEL[course.difficulty] || course.difficulty}
            </Badge>
          )}
        </div>

        {course.tags && course.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {course.tags.slice(0, 3).map((tag: string) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-transparent bg-muted/60 px-1.5 py-0 text-[10px] font-normal"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          {course.estimatedHours !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {course.estimatedHours}h
            </span>
          )}
          {course.rating !== undefined && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {course.rating.toFixed(1)}
            </span>
          )}
          {course.studentCount !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {course.studentCount.toLocaleString()}
            </span>
          )}
        </div>

        {course.instructor && (
          <div className="mt-2 text-xs text-muted-foreground">
            讲师：{course.instructor}
          </div>
        )}

        {expanded && course.description && (
          <p className="mt-3 text-xs text-foreground/70">
            {course.description}
          </p>
        )}

        <div className="mt-auto pt-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? '收起' : '展开'}
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            <Button size="sm" className="flex-1 text-xs" asChild>
              <UniversalLink
                to={course.platformUrl || '#'}
                target="_blank"
                rel="noreferrer"
              >
                去学习
                <ExternalLink className="h-3 w-3" />
              </UniversalLink>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------- All Courses Tab ----------
const AllCoursesTab = () => {
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('all');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [isFree, setIsFree] = useState('all');
  const [sortBy, setSortBy] = useState('hot');
  const [items, setItems] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(12);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        pageSize: number;
        skillName?: string;
        category?: string;
        difficulty?: string;
        platform?: string;
        isFree?: boolean;
        sortBy?: string;
      } = { page, pageSize };
      if (search.trim()) params.skillName = search.trim();
      if (skill !== 'all') params.skillName = skill;
      if (category !== 'all') params.category = category;
      if (difficulty !== 'all') params.difficulty = difficulty;
      if (platform !== 'all') params.platform = platform;
      if (isFree !== 'all') params.isFree = isFree === 'yes';
      if (sortBy) params.sortBy = sortBy;

      const res = await getCourses(params);
      setItems(res?.items || []);
      setTotal(res?.total || 0);
    } catch (err) {
      logger.error('fetch courses failed', err);
      toast.error('加载课程数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, skill, category, difficulty, platform, isFree, sortBy]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-60">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索课程..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select value={skill} onValueChange={(v) => { setSkill(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="技能方向" />
              </SelectTrigger>
              <SelectContent>
                {SKILL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setPage(1); }}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="难度" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={platform} onValueChange={(v) => { setPlatform(v); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="平台" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={isFree} onValueChange={(v) => { setIsFree(v); setPage(1); }}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="是否免费" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="yes">免费</SelectItem>
                <SelectItem value="no">付费</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm text-muted-foreground">
              共 {total} 门课程
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i: number) => (
            <Card key={i} className="border-border/60 bg-card/80">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-3 h-4 w-1/2" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
                <Skeleton className="mt-6 h-8 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-base font-medium">暂无课程</p>
            <p className="mt-1 text-sm text-muted-foreground">
              没有找到符合条件的课程，试试调整筛选条件
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((course: CourseItem) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > pageSize && (
        <div className="flex items-center justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={items.length < pageSize}
          >
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
};

// ---------- Personalized Tab ----------
const PersonalizedTab = () => {
  const [targetJob, setTargetJob] = useState('data_analyst');
  const [items, setItems] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const skillGaps = useMemo(
    () => ({
      data_analyst: ['SQL', 'Python', 'Excel', 'Tableau', '统计学'],
      data_engineer: ['Spark', 'Hadoop', 'Java', 'Hive', 'Flink'],
      data_scientist: ['机器学习', '深度学习', 'Python', '统计学', 'SQL'],
      backend_engineer: ['Java', 'MySQL', 'Redis', 'Spring', '分布式系统'],
      frontend_engineer: ['JavaScript', 'React', 'TypeScript', 'CSS', 'Vue'],
      product_manager: ['用户研究', '数据分析', '项目管理', 'Axure', '商业分析'],
    }),
    [],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPersonalizedCourses({
        page: 1,
        pageSize: 10,
        targetJob,
      });
      setItems(res?.items || []);
    } catch (err) {
      logger.error('fetch personalized courses failed', err);
      toast.error('加载推荐课程失败');
    } finally {
      setLoading(false);
    }
  }, [targetJob]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const gaps = skillGaps[targetJob as keyof typeof skillGaps] || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold">为我推荐</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  基于你的技能缺口和目标岗位，智能匹配最适合的学习资源
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">目标岗位</Label>
              <Select value={targetJob} onValueChange={setTargetJob}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">你的技能缺口：</span>
            {gaps.map((g: string) => (
              <Badge
                key={g}
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-700"
              >
                <Target className="mr-1 h-3 w-3" />
                {g}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Course List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i: number) => (
            <Card key={i} className="border-border/60 bg-card/80">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="mt-3 h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Award className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-base font-medium">暂无推荐</p>
            <p className="mt-1 text-sm text-muted-foreground">
              完善你的技能档案，获取更精准的推荐
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((course: CourseItem, idx: number) => (
            <Card
              key={course.id}
              className="border-border/60 bg-card/80 backdrop-blur transition-all hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium">{course.title}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant="outline"
                            className="gap-1 border-primary/30 bg-primary/5 text-primary"
                          >
                            <BookOpen className="h-3 w-3" />
                            {course.platform}
                          </Badge>
                          {course.difficulty && (
                            <span>
                              {DIFFICULTY_LABEL[course.difficulty] ||
                                course.difficulty}
                            </span>
                          )}
                          {course.estimatedHours !== undefined && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {course.estimatedHours}h
                            </span>
                          )}
                          {course.rating !== undefined && (
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {course.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" asChild>
                        <UniversalLink
                          to={course.platformUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                        >
                          去学习
                          <ExternalLink className="h-3 w-3" />
                        </UniversalLink>
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">
                        为什么推荐：
                      </span>
                      {course.tags &&
                        course.tags.slice(0, 3).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700"
                          >
                            弥补 {tag} 缺口
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Learning Paths Tab ----------
const LearningPathsTab = () => {
  const [paths, setPaths] = useState<
    {
      name: string;
      description: string;
      skillSequence: string[];
      totalHours: number;
      difficulty: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getLearningPaths();
        setPaths(res?.paths || []);
      } catch (err) {
        logger.error('fetch learning paths failed', err);
        toast.error('加载学习路径失败');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
              <Route className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold">学习路径</h3>
              <p className="text-sm text-muted-foreground">
                系统化的技能成长路线，按步骤循序渐进掌握目标岗位所需能力
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i: number) => (
            <Card key={i} className="border-border/60 bg-card/80">
              <CardContent className="p-5">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : paths.length === 0 ? (
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Route className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-base font-medium">暂无学习路径</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {paths.map((path, idx: number) => (
            <Card
              key={idx}
              className="border-border/60 bg-card/80 backdrop-blur transition-all hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{path.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {path.description}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      DIFFICULTY_COLOR[path.difficulty] ||
                      'bg-muted text-muted-foreground'
                    }
                  >
                    {DIFFICULTY_LABEL[path.difficulty] || path.difficulty}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    共 {path.totalHours} 小时
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {path.skillSequence.length} 个阶段
                  </span>
                </div>

                <Separator className="my-4" />

                <button
                  onClick={() =>
                    setExpandedIdx(expandedIdx === idx ? null : idx)
                  }
                  className="flex w-full items-center justify-between text-sm text-primary hover:underline"
                >
                  <span>{expandedIdx === idx ? '收起路径' : '展开路径详情'}</span>
                  {expandedIdx === idx ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {expandedIdx === idx && (
                  <div className="mt-4 space-y-2">
                    {path.skillSequence.map((skill: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{skill}</div>
                          <div className="text-xs text-muted-foreground">
                            第 {i + 1} 阶段
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-transparent bg-background"
                        >
                          核心技能
                        </Badge>
                      </div>
                    ))}
                    <Button className="w-full" variant="outline">
                      开始学习
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Main Page ----------
const CourseRecPage = () => {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">课程推荐</h1>
        <p className="text-sm text-muted-foreground">
          精选优质课程资源，助力你的技能成长
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            <BookOpen className="mr-1.5 h-4 w-4" />
            全部课程
          </TabsTrigger>
          <TabsTrigger value="recommend">
            <Sparkles className="mr-1.5 h-4 w-4" />
            为我推荐
          </TabsTrigger>
          <TabsTrigger value="paths">
            <Route className="mr-1.5 h-4 w-4" />
            学习路径
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <AllCoursesTab />
        </TabsContent>

        <TabsContent value="recommend" className="mt-4">
          <PersonalizedTab />
        </TabsContent>

        <TabsContent value="paths" className="mt-4">
          <LearningPathsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseRecPage;
