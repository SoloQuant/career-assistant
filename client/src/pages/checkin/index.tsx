import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Calendar,
  Flame,
  Trophy,
  Clock,
  Plus,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Smile,
  Meh,
  Frown,
  Zap,
  Coffee,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type {
  StudyCheckin,
  CreateCheckinRequest,
  UpdateCheckinRequest,
  CheckinStats,
  CheckinCalendarResponse,
  CheckinListResponse,
} from '@shared/api.interface';
import {
  getTodayCheckin,
  getCheckinStats,
  getCheckinCalendar,
  getCheckinList,
  createCheckin,
  updateCheckin,
  deleteCheckin,
} from '@/api/checkin';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

type MoodType = 'great' | 'good' | 'normal' | 'tired' | 'bad';

interface CheckinFormData {
  durationMinutes: number;
  content: string;
  relatedSkills: string[];
  mood: MoodType;
}

const MOOD_OPTIONS: { value: MoodType; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }[] = [
  { value: 'great', label: '超棒', icon: Sparkles, color: 'hsl(160 70% 50%)' },
  { value: 'good', label: '不错', icon: Smile, color: 'hsl(200 80% 60%)' },
  { value: 'normal', label: '一般', icon: Meh, color: 'hsl(45 85% 55%)' },
  { value: 'tired', label: '疲惫', icon: Coffee, color: 'hsl(30 85% 60%)' },
  { value: 'bad', label: '低落', icon: Frown, color: 'hsl(0 70% 60%)' },
];

const DEFAULT_SKILLS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Python',
  'SQL',
  '数据结构',
  '算法',
  '英语',
  '设计模式',
];

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

function getMoodLabel(mood: MoodType): string {
  const found = MOOD_OPTIONS.find((m) => m.value === mood);
  return found ? found.label : mood;
}

function getMoodIcon(mood: MoodType): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  const found = MOOD_OPTIONS.find((m) => m.value === mood);
  return found ? found.icon : Meh;
}

function getMoodColor(mood: MoodType): string {
  const found = MOOD_OPTIONS.find((m) => m.value === mood);
  return found ? found.color : 'hsl(45 85% 55%)';
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

const CheckinPage = () => {
  const today = useMemo(() => new Date(), []);

  // 统计数据
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // 今日打卡
  const [todayCheckin, setTodayCheckin] = useState<StudyCheckin | null>(null);
  const [todayLoading, setTodayLoading] = useState<boolean>(true);

  // 日历
  const [calendarYear, setCalendarYear] = useState<number>(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(today.getMonth());
  const [calendarData, setCalendarData] = useState<CheckinCalendarResponse | null>(null);
  const [calendarLoading, setCalendarLoading] = useState<boolean>(true);

  // 打卡列表
  const [checkinList, setCheckinList] = useState<StudyCheckin[]>([]);
  const [listTotal, setListTotal] = useState<number>(0);
  const [listPage, setListPage] = useState<number>(1);
  const [listPageSize] = useState<number>(10);
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listHasMore, setListHasMore] = useState<boolean>(false);

  // 打卡表单（今日展开式编辑）
  const [formExpanded, setFormExpanded] = useState<boolean>(false);
  const [formData, setFormData] = useState<CheckinFormData>({
    durationMinutes: 60,
    content: '',
    relatedSkills: [],
    mood: 'good',
  });
  const [skillInput, setSkillInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // 日期详情对话框
  const [dateDialogOpen, setDateDialogOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateCheckin, setSelectedDateCheckin] = useState<StudyCheckin | null>(null);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<StudyCheckin | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // ========== 数据获取 ==========

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data: CheckinStats = await getCheckinStats();
      setStats(data);
    } catch (error) {
      logger.error('加载打卡统计失败', error);
      toast.error('加载统计数据失败');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchToday = useCallback(async () => {
    setTodayLoading(true);
    try {
      const data: StudyCheckin | null = await getTodayCheckin();
      setTodayCheckin(data);
      if (data) {
        setFormData({
          durationMinutes: data.durationMinutes,
          content: data.content,
          relatedSkills: data.relatedSkills ?? [],
          mood: data.mood,
        });
      }
    } catch (error) {
      logger.error('加载今日打卡失败', error);
    } finally {
      setTodayLoading(false);
    }
  }, []);

  const fetchCalendar = useCallback(async (year: number, month: number) => {
    setCalendarLoading(true);
    try {
      const data: CheckinCalendarResponse = await getCheckinCalendar(year, month);
      setCalendarData(data);
    } catch (error) {
      logger.error('加载打卡日历失败', error);
      toast.error('加载日历失败');
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const fetchList = useCallback(async (page: number, pageSize: number, append: boolean = false) => {
    setListLoading(true);
    try {
      const data: CheckinListResponse = await getCheckinList(page, pageSize);
      if (append) {
        setCheckinList((prev) => [...prev, ...data.items]);
      } else {
        setCheckinList(data.items);
      }
      setListTotal(data.total);
      setListHasMore(page * pageSize < data.total);
      setListPage(page);
    } catch (error) {
      logger.error('加载打卡记录失败', error);
      toast.error('加载记录失败');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
    void fetchToday();
    void fetchCalendar(calendarYear, calendarMonth);
    void fetchList(1, listPageSize, false);
  }, [fetchStats, fetchToday, fetchCalendar, fetchList, calendarYear, calendarMonth, listPageSize]);

  // ========== 日历计算 ==========

  const calendarDays = useMemo(() => {
    const year = calendarYear;
    const month = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: { date: Date; inMonth: boolean; isToday: boolean }[] = [];

    // 上月填充
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i -= 1) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date: d, inMonth: false, isToday: isSameDay(d, today) });
    }

    // 本月
    for (let i = 1; i <= daysInMonth; i += 1) {
      const d = new Date(year, month, i);
      days.push({ date: d, inMonth: true, isToday: isSameDay(d, today) });
    }

    // 下月填充（补足6行=42格）
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i += 1) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, inMonth: false, isToday: isSameDay(d, today) });
    }

    return days;
  }, [calendarYear, calendarMonth, today]);

  const checkedInMap = useMemo(() => {
    const map = new Map<string, number>();
    if (calendarData) {
      calendarData.days.forEach((d) => {
        if (d.checkedIn) {
          map.set(d.date, d.durationMinutes);
        }
      });
    }
    return map;
  }, [calendarData]);

  // 连续打卡日期集合（用于渐变标识）
  const streakDatesSet = useMemo(() => {
    if (!calendarData || calendarData.days.length === 0) return new Set<string>();
    const sortedDays = [...calendarData.days]
      .filter((d) => d.checkedIn)
      .sort((a, b) => a.date.localeCompare(b.date));

    const streakSet = new Set<string>();
    let currentStreak: string[] = [];

    const isConsecutive = (date1: string, date2: string): boolean => {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      return diff === 1;
    };

    for (let i = 0; i < sortedDays.length; i += 1) {
      if (i === 0 || !isConsecutive(sortedDays[i - 1].date, sortedDays[i].date)) {
        if (currentStreak.length >= 2) {
          currentStreak.forEach((d) => streakSet.add(d));
        }
        currentStreak = [sortedDays[i].date];
      } else {
        currentStreak.push(sortedDays[i].date);
      }
    }
    if (currentStreak.length >= 2) {
      currentStreak.forEach((d) => streakSet.add(d));
    }

    return streakSet;
  }, [calendarData]);

  // ========== 月份切换 ==========

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear(calendarYear - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear(calendarYear + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  // ========== 今日打卡表单 ==========

  const resetForm = () => {
    if (todayCheckin) {
      setFormData({
        durationMinutes: todayCheckin.durationMinutes,
        content: todayCheckin.content,
        relatedSkills: todayCheckin.relatedSkills ?? [],
        mood: todayCheckin.mood,
      });
    } else {
      setFormData({
        durationMinutes: 60,
        content: '',
        relatedSkills: [],
        mood: 'good',
      });
    }
    setSkillInput('');
  };

  const handleOpenCheckinForm = () => {
    resetForm();
    setIsEditing(false);
    setFormExpanded(true);
  };

  const handleEditCheckin = () => {
    resetForm();
    setIsEditing(true);
    setFormExpanded(true);
  };

  const handleCancelForm = () => {
    setFormExpanded(false);
    resetForm();
  };

  const handleToggleSkill = (skill: string) => {
    setFormData((prev) => {
      if (prev.relatedSkills.includes(skill)) {
        return { ...prev, relatedSkills: prev.relatedSkills.filter((s) => s !== skill) };
      }
      return { ...prev, relatedSkills: [...prev.relatedSkills, skill] };
    });
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (formData.relatedSkills.includes(trimmed)) {
      setSkillInput('');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      relatedSkills: [...prev.relatedSkills, trimmed],
    }));
    setSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      relatedSkills: prev.relatedSkills.filter((s) => s !== skill),
    }));
  };

  const handleSubmitCheckin = async () => {
    if (!formData.durationMinutes || formData.durationMinutes <= 0) {
      toast.error('请输入有效的学习时长');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('请填写学习内容');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && todayCheckin) {
        const dto: UpdateCheckinRequest = {
          durationMinutes: formData.durationMinutes,
          content: formData.content.trim(),
          relatedSkills: formData.relatedSkills,
          mood: formData.mood,
        };
        const updated: StudyCheckin = await updateCheckin(todayCheckin.id, dto);
        setTodayCheckin(updated);
        toast.success('打卡已更新');
      } else {
        const dto: CreateCheckinRequest = {
          checkinDate: formatDateKey(today),
          durationMinutes: formData.durationMinutes,
          content: formData.content.trim(),
          relatedSkills: formData.relatedSkills,
          mood: formData.mood,
        };
        const created: StudyCheckin = await createCheckin(dto);
        setTodayCheckin(created);
        toast.success('打卡成功！继续加油 💪');
      }
      setFormExpanded(false);
      // 刷新关联数据
      void fetchStats();
      void fetchCalendar(calendarYear, calendarMonth);
      void fetchList(1, listPageSize, false);
    } catch (error) {
      logger.error('保存打卡失败', error);
      toast.error('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ========== 日期点击查看 ==========

  const handleDateClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    // 在列表里查找对应日期的打卡记录
    const found = checkinList.find((c) => c.checkinDate === dateKey);
    setSelectedDateCheckin(found ?? null);
    setDateDialogOpen(true);
  };

  // ========== 删除打卡 ==========

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCheckin(deleteTarget.id);
      toast.success('打卡已删除');
      setCheckinList((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setListTotal((prev) => prev - 1);
      if (todayCheckin && todayCheckin.id === deleteTarget.id) {
        setTodayCheckin(null);
        setFormExpanded(false);
      }
      void fetchStats();
      void fetchCalendar(calendarYear, calendarMonth);
      setDeleteTarget(null);
    } catch (error) {
      logger.error('删除打卡失败', error);
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // ========== 加载更多 ==========

  const handleLoadMore = () => {
    if (listLoading || !listHasMore) return;
    void fetchList(listPage + 1, listPageSize, true);
  };

  // ========== 渲染 ==========

  const totalHours = stats ? (stats.totalMinutes / 60).toFixed(1) : '0';
  const monthLabel = `${calendarYear}年${calendarMonth + 1}月`;

  return (
    <div className="space-y-6">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">学习打卡</h2>
          <p className="text-sm text-muted-foreground mt-1">
            记录每一天的学习，见证你的成长
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        data-ai-section-type="card-stat"
      >
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i: number) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0_0_0_0.3)] overflow-hidden border-0 bg-gradient-to-br from-[hsl(190_90%_55%)] to-[hsl(240_70%_65%)] text-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-white/80">总打卡天数</p>
                    <p className="mt-1 text-3xl font-bold font-mono">
                      {stats?.totalDays ?? 0}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm transition-all group-hover:scale-110">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0_0_0_0.3)] overflow-hidden border-0 bg-gradient-to-br from-[hsl(16_100%_65%)] to-[hsl(0_84%_60%)] text-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-white/80">当前连续</p>
                    <p className="mt-1 text-3xl font-bold font-mono">
                      {stats?.currentStreak ?? 0}
                      <span className="text-base font-medium ml-1">天</span>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm transition-all group-hover:scale-110">
                    <Flame className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0_0_0_0.3)] overflow-hidden border-0 bg-gradient-to-br from-[hsl(50_90%_55%)] to-[hsl(30_85%_60%)] text-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-white/80">最长连续</p>
                    <p className="mt-1 text-3xl font-bold font-mono">
                      {stats?.longestStreak ?? 0}
                      <span className="text-base font-medium ml-1">天</span>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm transition-all group-hover:scale-110">
                    <Trophy className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0_0_0_0.3)] overflow-hidden border-0 bg-gradient-to-br from-[hsl(160_70%_50%)] to-[hsl(190_90%_55%)] text-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-white/80">累计学习时长</p>
                    <p className="mt-1 text-3xl font-bold font-mono">
                      {totalHours}
                      <span className="text-base font-medium ml-1">小时</span>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm transition-all group-hover:scale-110">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 打卡日历 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">打卡日历</h3>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[90px] text-center">
                  {monthLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {calendarLoading ? (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 42 }).map((_, i: number) => (
                  <Skeleton key={i} className="h-12 rounded-md" />
                ))}
              </div>
            ) : (
              <>
                {/* 星期头 */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {WEEK_DAYS.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                {/* 日期格子 */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((dayInfo, index: number) => {
                    const dateKey = formatDateKey(dayInfo.date);
                    const checkedIn = checkedInMap.has(dateKey);
                    const isInStreak = streakDatesSet.has(dateKey);
                    const duration = checkedInMap.get(dateKey) ?? 0;

                    return (
                      <button
                        key={index}
                        onClick={() => handleDateClick(dateKey)}
                        className={[
                          'relative h-12 rounded-md flex flex-col items-center justify-center text-sm transition-all',
                          dayInfo.inMonth ? '' : 'text-muted-foreground/40',
                          dayInfo.isToday
                            ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background'
                            : '',
                          checkedIn
                            ? 'bg-gradient-to-br from-[hsl(160_70%_50%)] to-[hsl(190_90%_55%)] text-white font-medium hover:opacity-90 cursor-pointer shadow-sm'
                            : 'hover:bg-muted cursor-pointer',
                          isInStreak && checkedIn
                            ? 'from-[hsl(140_65%_55%)] to-[hsl(190_90%_55%)]'
                            : '',
                        ].join(' ')}
                      >
                        <span className={dayInfo.isToday && !checkedIn ? 'font-bold text-primary' : ''}>
                          {dayInfo.date.getDate()}
                        </span>
                        {checkedIn && duration > 0 && (
                          <span className="text-[10px] opacity-80 font-normal">
                            {duration >= 60
                              ? `${Math.floor(duration / 60)}h`
                              : `${duration}m`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* 图例 */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-[hsl(160_70%_50%)] to-[hsl(190_90%_55%)]" />
                    <span>已打卡</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded ring-2 ring-primary ring-offset-1 dark:ring-offset-background" />
                    <span>今日</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-[hsl(140_65%_55%)] to-[hsl(190_90%_55%)]" />
                    <span>连续打卡</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 今日打卡卡片 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">今日打卡</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDateKey(today)}
            </p>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : todayCheckin ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">已打卡</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">学习时长：</span>
                    <span className="font-medium">
                      {todayCheckin.durationMinutes} 分钟
                    </span>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">学习内容：</p>
                    <p className="text-foreground whitespace-pre-wrap line-clamp-4">
                      {todayCheckin.content}
                    </p>
                  </div>

                  {todayCheckin.relatedSkills && todayCheckin.relatedSkills.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1.5">相关技能：</p>
                      <div className="flex flex-wrap gap-1.5">
                        {todayCheckin.relatedSkills.map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    {(() => {
                      const MoodIcon = getMoodIcon(todayCheckin.mood);
                      return (
                        <>
                          <MoodIcon
                            className="h-4 w-4"
                            style={{ color: getMoodColor(todayCheckin.mood) }}
                          />
                          <span className="text-muted-foreground">心情：</span>
                          <span className="font-medium">
                            {getMoodLabel(todayCheckin.mood)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditCheckin}
                    className="flex-1"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    编辑
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTarget(todayCheckin)}
                    className="flex-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </Button>
                </div>
              </div>
            ) : formExpanded ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">学习时长（分钟）</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        durationMinutes: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    placeholder="请输入学习时长"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">学习内容</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="记录今天学了什么..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">相关技能</label>
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="输入技能名称后回车添加"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddSkill}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.relatedSkills.map((skill: string) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => handleRemoveSkill(skill)}
                      >
                        {skill} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {DEFAULT_SKILLS.filter(
                      (s) => !formData.relatedSkills.includes(s),
                    ).map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="cursor-pointer opacity-60 hover:opacity-100"
                        onClick={() => handleToggleSkill(skill)}
                      >
                        + {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">今日心情</label>
                  <div className="flex gap-2">
                    {MOOD_OPTIONS.map((mood) => {
                      const MoodIcon = mood.icon;
                      const isSelected = formData.mood === mood.value;
                      return (
                        <button
                          key={mood.value}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, mood: mood.value }))
                          }
                          className={[
                            'flex-1 flex flex-col items-center gap-1 py-2 rounded-md border transition-all',
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-muted-foreground/30',
                          ].join(' ')}
                        >
                          <MoodIcon
                            className="h-5 w-5"
                            style={{ color: mood.color }}
                          />
                          <span className="text-xs">{mood.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelForm}
                    className="flex-1"
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleSubmitCheckin}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    确认打卡
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  今天还没有打卡，开始记录你的学习吧
                </p>
                <Button onClick={handleOpenCheckinForm} className="w-full">
                  <Plus className="h-4 w-4" />
                  立即打卡
                </Button>
              </div>
            )}

            {/* 编辑已打卡内容的展开表单 */}
            {todayCheckin && formExpanded && isEditing && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">学习时长（分钟）</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        durationMinutes: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">学习内容</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, content: e.target.value }))
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">相关技能</label>
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="输入技能名称后回车添加"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddSkill}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.relatedSkills.map((skill: string) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => handleRemoveSkill(skill)}
                      >
                        {skill} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {DEFAULT_SKILLS.filter(
                      (s) => !formData.relatedSkills.includes(s),
                    ).map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="cursor-pointer opacity-60 hover:opacity-100"
                        onClick={() => handleToggleSkill(skill)}
                      >
                        + {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">今日心情</label>
                  <div className="flex gap-2">
                    {MOOD_OPTIONS.map((mood) => {
                      const MoodIcon = mood.icon;
                      const isSelected = formData.mood === mood.value;
                      return (
                        <button
                          key={mood.value}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, mood: mood.value }))
                          }
                          className={[
                            'flex-1 flex flex-col items-center gap-1 py-2 rounded-md border transition-all',
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-muted-foreground/30',
                          ].join(' ')}
                        >
                          <MoodIcon
                            className="h-5 w-5"
                            style={{ color: mood.color }}
                          />
                          <span className="text-xs">{mood.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelForm}
                    className="flex-1"
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleSubmitCheckin}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    保存修改
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 打卡记录列表 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">打卡记录</h3>
            </div>
            <span className="text-sm text-muted-foreground">
              共 {listTotal} 条记录
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {listLoading && checkinList.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i: number) => (
                <div key={i} className="space-y-2 p-4 rounded-lg border">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : checkinList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">暂无打卡记录</p>
              <p className="text-xs mt-1">点击「立即打卡」开始你的第一次打卡</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkinList.map((item: StudyCheckin) => {
                const MoodIcon = getMoodIcon(item.mood);
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border hover:border-primary/30 hover:bg-muted/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-sm">
                            {item.checkinDate}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.durationMinutes} 分钟
                          </Badge>
                          <div
                            className="flex items-center gap-1 text-xs"
                            style={{ color: getMoodColor(item.mood) }}
                          >
                            <MoodIcon className="h-3.5 w-3.5" />
                            <span>{getMoodLabel(item.mood)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {item.content}
                        </p>
                        {item.relatedSkills && item.relatedSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {item.relatedSkills
                              .slice(0, 5)
                              .map((skill: string) => (
                                <Badge
                                  key={skill}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            {item.relatedSkills.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.relatedSkills.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDateClick(item.checkinDate)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {listHasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={listLoading}
                  >
                    {listLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    加载更多
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 日期详情对话框 */}
      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate} 打卡详情
            </DialogTitle>
          </DialogHeader>
          {selectedDateCheckin ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">已打卡</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">学习时长：</span>
                <span className="font-medium">
                  {selectedDateCheckin.durationMinutes} 分钟
                </span>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">学习内容：</p>
                <p className="whitespace-pre-wrap">{selectedDateCheckin.content}</p>
              </div>
              {selectedDateCheckin.relatedSkills && selectedDateCheckin.relatedSkills.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">相关技能：</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDateCheckin.relatedSkills.map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                {(() => {
                  const MoodIcon = getMoodIcon(selectedDateCheckin.mood);
                  return (
                    <>
                      <MoodIcon
                        className="h-4 w-4"
                        style={{ color: getMoodColor(selectedDateCheckin.mood) }}
                      />
                      <span className="text-muted-foreground">心情：</span>
                      <span className="font-medium">
                        {getMoodLabel(selectedDateCheckin.mood)}
                      </span>
                    </>
                  );
                })()}
              </div>
              <div className="flex gap-2 pt-2">
                <DialogClose asChild>
                  <Button variant="outline" className="flex-1">关闭</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setDeleteTarget(selectedDateCheckin);
                    setDateDialogOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">当天没有打卡记录</p>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">关闭</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
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
              确定要删除 {deleteTarget?.checkinDate} 的打卡记录吗？此操作不可撤销。
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
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CheckinPage;
