import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  LayoutGrid,
  List,
  Clock,
  MapPin,
  Trash2,
  CheckCircle2,
  Edit2,
  AlertCircle,
  BookOpen,
  Briefcase,
  Send,
  MoreHorizontal,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  getEvents,
  getUpcomingEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getMonthStats,
} from '@/api/calendar';
import type {
  CalendarEventItem,
  CreateCalendarEventRequest,
} from '@shared/api.interface';

const EVENT_TYPE_OPTIONS = [
  { value: 'study_task', label: '学习任务', color: 'bg-blue-500' },
  { value: 'interview', label: '面试', color: 'bg-emerald-500' },
  { value: 'application_deadline', label: '投递截止', color: 'bg-amber-500' },
  { value: 'other', label: '其他', color: 'bg-slate-500' },
];

const EVENT_TYPE_LABEL: Record<string, string> = EVENT_TYPE_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);

const EVENT_TYPE_COLOR: Record<string, string> = EVENT_TYPE_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.color;
    return acc;
  },
  {} as Record<string, string>,
);

const STATUS_LABEL: Record<string, string> = {
  pending: '待办',
  completed: '已完成',
  cancelled: '已取消',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));

const formatDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const CalendarPage = () => {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-based
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  const [monthStats, setMonthStats] = useState<{
    totalEvents: number;
    typeBreakdown: { eventType: string; count: number }[];
    completedCount: number;
  } | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formEventType, setFormEventType] = useState('study_task');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'pending' | 'completed'>('pending');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formReminder, setFormReminder] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  // Fetch events
  const fetchEvents = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const startDate = `${year}-${pad(month + 1)}-01`;
      const lastDay = new Date(year, month + 1, 0);
      const endDate = `${year}-${pad(month + 1)}-${pad(lastDay.getDate())}`;
      const res = await getEvents({ startDate, endDate });
      setEvents(res.items || []);
    } catch (err) {
      logger.error('fetch calendar events failed', err);
      toast.error('加载日程失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUpcoming = useCallback(async () => {
    setUpcomingLoading(true);
    try {
      const res = await getUpcomingEvents(5);
      setUpcomingEvents(res.items || []);
    } catch (err) {
      logger.error('fetch upcoming events failed', err);
    } finally {
      setUpcomingLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (year: number, month: number) => {
    try {
      const res = await getMonthStats(year, month + 1);
      setMonthStats(res);
    } catch (err) {
      logger.error('fetch month stats failed', err);
    }
  }, []);

  useEffect(() => {
    void fetchEvents(currentYear, currentMonth);
    void fetchStats(currentYear, currentMonth);
  }, [currentYear, currentMonth, fetchEvents, fetchStats]);

  useEffect(() => {
    void fetchUpcoming();
  }, [fetchUpcoming]);

  const goPrevMonth = (): void => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goNextMonth = (): void => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToday = (): void => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startWeekday = firstDay.getDay(); // 0=Sun

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      days.push({ date: d, isCurrentMonth: false, dateStr: formatDate(d) });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(currentYear, currentMonth, i);
      days.push({ date: d, isCurrentMonth: true, dateStr: formatDate(d) });
    }

    // Next month days to fill 6 rows * 7 cols = 42
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      days.push({ date: d, isCurrentMonth: false, dateStr: formatDate(d) });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const ev of events) {
      const list = map.get(ev.eventDate) || [];
      list.push(ev);
      map.set(ev.eventDate, list);
    }
    return map;
  }, [events]);

  const handleDayClick = (dateStr: string): void => {
    setSelectedDate(dateStr);
    setEditingEvent(null);
    resetForm(dateStr);
    setDialogOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, ev: CalendarEventItem): void => {
    e.stopPropagation();
    setEditingEvent(ev);
    setSelectedDate(ev.eventDate);
    fillForm(ev);
    setDialogOpen(true);
  };

  const handleAddClick = (): void => {
    const todayStr = formatDate(new Date());
    setSelectedDate(todayStr);
    setEditingEvent(null);
    resetForm(todayStr);
    setDialogOpen(true);
  };

  const resetForm = (dateStr: string): void => {
    setFormTitle('');
    setFormEventType('study_task');
    setFormDate(dateStr);
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormLocation('');
    setFormDescription('');
    setFormStatus('pending');
    setFormPriority('medium');
    setFormAllDay(false);
    setFormReminder('30');
  };

  const fillForm = (ev: CalendarEventItem): void => {
    setFormTitle(ev.title);
    setFormEventType(ev.eventType);
    setFormDate(ev.eventDate);
    setFormStartTime(ev.startTime || '09:00');
    setFormEndTime(ev.endTime || '10:00');
    setFormLocation(ev.location || '');
    setFormDescription(ev.description || '');
    setFormStatus(ev.status === 'completed' ? 'completed' : 'pending');
    setFormPriority(ev.priority);
    setFormAllDay(ev.isAllDay);
    setFormReminder(String(ev.reminderMinutesBefore ?? 30));
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) {
      toast.error('请输入事件标题');
      return;
    }
    if (!formDate) {
      toast.error('请选择日期');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateCalendarEventRequest = {
        title: formTitle.trim(),
        eventType: formEventType,
        eventDate: formDate,
        startTime: formAllDay ? undefined : formStartTime,
        endTime: formAllDay ? undefined : formEndTime,
        location: formLocation.trim() || undefined,
        description: formDescription.trim() || undefined,
        priority: formPriority,
        isAllDay: formAllDay,
        reminderMinutesBefore: Number(formReminder) || undefined,
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id, {
          ...payload,
          status: formStatus === 'completed' ? 'completed' : 'pending',
        } as Partial<CreateCalendarEventRequest> & { status?: string });
        toast.success('事件已更新');
      } else {
        await createEvent(payload);
        toast.success('事件已创建');
      }
      setDialogOpen(false);
      void fetchEvents(currentYear, currentMonth);
      void fetchUpcoming();
      void fetchStats(currentYear, currentMonth);
    } catch (err) {
      logger.error('save event failed', err);
      toast.error(editingEvent ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    try {
      await deleteEvent(editingEvent.id);
      toast.success('已删除');
      setDialogOpen(false);
      void fetchEvents(currentYear, currentMonth);
      void fetchUpcoming();
      void fetchStats(currentYear, currentMonth);
    } catch (err) {
      logger.error('delete event failed', err);
      toast.error('删除失败');
    }
  };

  const handleMarkComplete = async () => {
    if (!editingEvent) return;
    try {
      await updateEvent(editingEvent.id, {
        status: 'completed',
      } as unknown as Partial<CreateCalendarEventRequest>);
      toast.success('已标记完成');
      setDialogOpen(false);
      void fetchEvents(currentYear, currentMonth);
      void fetchUpcoming();
      void fetchStats(currentYear, currentMonth);
    } catch (err) {
      logger.error('update event status failed', err);
      toast.error('操作失败');
    }
  };

  const isToday = (dateStr: string): boolean => {
    return dateStr === formatDate(today);
  };

  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];

  // List view - group events by date
  const groupedEvents = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    const sorted = [...events].sort((a, b) => {
      if (a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
    for (const ev of sorted) {
      const list = map.get(ev.eventDate) || [];
      list.push(ev);
      map.set(ev.eventDate, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [events]);

  const completionRate = monthStats && monthStats.totalEvents > 0
    ? Math.round((monthStats.completedCount / monthStats.totalEvents) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">日程日历</h1>
            <p className="text-sm text-muted-foreground">管理你的学习与求职日程</p>
          </div>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="h-4 w-4" />
          添加事件
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* 主区域 */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[140px] text-center">
                <h2 className="text-lg font-semibold">
                  {currentYear} 年 {currentMonth + 1} 月
                </h2>
              </div>
              <Button variant="outline" size="icon" onClick={goNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToday}>
                今天
              </Button>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="gap-1"
              >
                <LayoutGrid className="h-4 w-4" />
                月视图
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-1"
              >
                <List className="h-4 w-4" />
                列表视图
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : viewMode === 'month' ? (
              <div className="select-none">
                {/* Weekday header */}
                <div className="grid grid-cols-7 border-b bg-muted/30">
                  {weekdayLabels.map((w) => (
                    <div
                      key={w}
                      className="py-2 text-center text-xs font-medium text-muted-foreground"
                    >
                      {w}
                    </div>
                  ))}
                </div>
                {/* Days grid */}
                <div className="grid grid-cols-7">
                  {calendarDays.map(({ date, isCurrentMonth, dateStr }) => {
                    const dayEvents = eventsByDate.get(dateStr) || [];
                    const dayNum = date.getDate();
                    const todayFlag = isToday(dateStr);
                    return (
                      <div
                        key={dateStr}
                        onClick={() => handleDayClick(dateStr)}
                        className={`group min-h-24 cursor-pointer border-b border-r p-1 transition-colors hover:bg-muted/50 ${
                          !isCurrentMonth ? 'bg-muted/20 text-muted-foreground/50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between px-1">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                              todayFlag
                                ? 'bg-primary text-primary-foreground'
                                : ''
                            }`}
                          >
                            {dayNum}
                          </span>
                        </div>
                        <div className="mt-1 space-y-1">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <div
                              key={ev.id}
                              onClick={(e) => handleEventClick(e, ev)}
                              className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${
                                EVENT_TYPE_COLOR[ev.eventType] || 'bg-slate-500'
                              } ${ev.status === 'completed' ? 'opacity-50 line-through' : ''}`}
                              title={ev.title}
                            >
                              {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="truncate px-1.5 text-[10px] text-muted-foreground">
                              +{dayEvents.length - 2} 更多
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto p-4">
                {groupedEvents.length > 0 ? (
                  <div className="space-y-4">
                    {groupedEvents.map(([dateStr, dayEvents]) => (
                      <div key={dateStr}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {dateStr}
                          </span>
                          <Badge variant="secondary">{dayEvents.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {dayEvents.map((ev) => (
                            <div
                              key={ev.id}
                              onClick={(e) => handleEventClick(e, ev)}
                              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-muted/30"
                            >
                              <div
                                className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${
                                  EVENT_TYPE_COLOR[ev.eventType] || 'bg-slate-500'
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`truncate text-sm font-medium ${
                                    ev.status === 'completed'
                                      ? 'text-muted-foreground line-through'
                                      : ''
                                  }`}
                                >
                                  {ev.title}
                                </p>
                                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                  {!ev.isAllDay && ev.startTime && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {ev.startTime}
                                      {ev.endTime ? ` - ${ev.endTime}` : ''}
                                    </span>
                                  )}
                                  {ev.location && (
                                    <span className="flex items-center gap-1 truncate">
                                      <MapPin className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{ev.location}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline">
                                {EVENT_TYPE_LABEL[ev.eventType] || ev.eventType}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      本月暂无日程，点击「添加事件」创建
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧边栏 */}
        <div className="space-y-6">
          {/* 本月统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">本月统计</CardTitle>
              <CardDescription>
                {currentYear} 年 {currentMonth + 1} 月
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-primary/10 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {monthStats?.totalEvents ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">总事件数</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {completionRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">完成率</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">类型分布</p>
                {monthStats?.typeBreakdown && monthStats.typeBreakdown.length > 0 ? (
                  <div className="space-y-1.5">
                    {monthStats.typeBreakdown.map((item) => (
                      <div key={item.eventType} className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            EVENT_TYPE_COLOR[item.eventType] || 'bg-slate-500'
                          }`}
                        />
                        <span className="flex-1 text-sm">
                          {EVENT_TYPE_LABEL[item.eventType] || item.eventType}
                        </span>
                        <span className="text-sm font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无数据</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 近期待办 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">近期待办</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {upcomingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-2 rounded-lg p-2 hover:bg-muted/50 cursor-pointer"
                      onClick={(e) => handleEventClick(e, ev)}
                    >
                      <div
                        className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                          EVENT_TYPE_COLOR[ev.eventType] || 'bg-slate-500'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">{ev.eventDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-xs text-muted-foreground">暂无待办事项</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 事件编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? '编辑事件' : '添加事件'}</DialogTitle>
            <DialogDescription>
              {selectedDate && `日期：${selectedDate}`}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="ev-title">事件标题</Label>
              <Input
                id="ev-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="输入事件标题"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ev-type">类型</Label>
                <Select value={formEventType} onValueChange={setFormEventType}>
                  <SelectTrigger id="ev-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-priority">优先级</Label>
                <Select
                  value={formPriority}
                  onValueChange={(v) =>
                    setFormPriority(v as 'low' | 'medium' | 'high')
                  }
                >
                  <SelectTrigger id="ev-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ev-date">日期</Label>
              <Input
                id="ev-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ev-allday"
                checked={formAllDay}
                onChange={(e) => setFormAllDay(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="ev-allday" className="cursor-pointer">
                全天事件
              </Label>
            </div>

            {!formAllDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ev-start">开始时间</Label>
                  <Input
                    id="ev-start"
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-end">结束时间</Label>
                  <Input
                    id="ev-end"
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ev-location">地点</Label>
              <Input
                id="ev-location"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="可选"
              />
            </div>

            {editingEvent && (
              <div className="space-y-2">
                <Label htmlFor="ev-status">状态</Label>
                <Select
                  value={formStatus}
                  onValueChange={(v) =>
                    setFormStatus(v as 'pending' | 'completed')
                  }
                >
                  <SelectTrigger id="ev-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待办</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ev-reminder">提前提醒（分钟）</Label>
              <Input
                id="ev-reminder"
                type="number"
                value={formReminder}
                onChange={(e) => setFormReminder(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ev-desc">描述</Label>
              <Textarea
                id="ev-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="可选，填写详细信息"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <div>
              {editingEvent && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="mr-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </Button>
                  {formStatus !== 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkComplete}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      标记完成
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? '保存中...' : editingEvent ? '保存修改' : '创建'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
