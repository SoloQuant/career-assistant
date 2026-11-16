import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  GraduationCap,
  Newspaper,
  Briefcase,
  BarChart3,
  CheckSquare,
  Send,
  BookOpen,
  Target,
  Sun,
  Moon,
  CalendarDays,
  Bell,
  TrendingUp,
  Zap,
  Download,
  LayoutDashboard,
  Route,
  FileText,
  Brain,
  MessageSquare,
  Flame,
  HelpCircle,
  Mic,
  PenTool,
  Building2,
  BookMarked,
  LineChart,
  DollarSign,
  CalendarCheck,
  StickyNote,
  Award,
  Building,
  Gauge,
  Network,
  ListChecks,
  Bot,
  BellRing,
  Trophy,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { PWAInstallToast } from '@/components/PWAInstallToast';
import { useNewsRefresh } from '@/hooks/useNewsRefresh';
import { useEffect, useState } from 'react';

const navItems = [
  {
    group: '首页概览',
    items: [{ path: '/', label: '仪表盘', icon: LayoutDashboard }],
  },
  {
    group: '个人成长',
    items: [
      { path: '/profile', label: '个人资料', icon: User },
      { path: '/skills', label: '技能评估', icon: GraduationCap },
      { path: '/tasks', label: '任务管理', icon: CheckSquare },
      { path: '/checkin', label: '学习打卡', icon: Flame },
      { path: '/career-path', label: '职业路径', icon: Route },
      { path: '/knowledge-graph', label: '知识图谱', icon: Network },
      { path: '/learning-plan', label: '学习计划', icon: ListChecks },
      { path: '/growth-report', label: '成长报告', icon: LineChart },
    ],
  },
  {
    group: '求职就业',
    items: [
      { path: '/jobs', label: '岗位推荐', icon: Briefcase },
      { path: '/job-push', label: '新岗位推送', icon: BellRing },
      { path: '/applications', label: '投递记录', icon: Send },
      { path: '/job-hunting', label: '求职期助手', icon: Target },
      { path: '/career-assistant', label: '智能求职助手', icon: Bot },
      { path: '/resume', label: '简历生成', icon: FileText },
      { path: '/interview', label: '面试题库', icon: Brain },
      { path: '/mock-interview', label: '模拟面试', icon: Mic },
      { path: '/written-exam', label: '笔试模拟', icon: PenTool },
      { path: '/company-review', label: '公司评价', icon: Building2 },
      { path: '/wrong-question', label: '错题本', icon: BookMarked },
    ],
  },
  {
    group: '学习资源',
    items: [
      { path: '/news', label: '资讯推荐', icon: Newspaper },
      { path: '/finance-news', label: '财经新闻', icon: TrendingUp },
      {
        path: '/important-news',
        label: '重要消息',
        icon: Zap,
        badgeKey: 'important' as const,
      },
      { path: '/resources', label: '学习资源', icon: BookOpen },
      { path: '/course-rec', label: '课程推荐', icon: GraduationCap },
    ],
  },
  {
    group: '数据分析',
    items: [
      { path: '/industry-trend', label: '行业趋势', icon: BarChart3 },
      { path: '/competitiveness', label: '竞争力分析', icon: Gauge },
      { path: '/city-cost', label: '城市成本对比', icon: Building },
      { path: '/job-competition', label: '岗位竞争度', icon: Award },
    ],
  },
  {
    group: '实用工具',
    items: [
      { path: '/salary-calc', label: '薪资计算器', icon: DollarSign },
      { path: '/calendar', label: '日程日历', icon: CalendarCheck },
      { path: '/note', label: '笔记功能', icon: StickyNote },
    ],
  },
  {
    group: '智能助手',
    items: [{ path: '/ai-chat', label: 'AI 对话', icon: MessageSquare }],
  },
  {
    group: '比赛参赛',
    items: [{ path: '/competition', label: '比赛参赛', icon: Trophy }],
  },
];

const MOCK_TODO_COUNT = 3;
const CURRENT_STAGE = '秋招正式批';
const MOCK_USER_NAME = '张伟';

function formatDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdayMap[date.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

function formatTime(isoString: string): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '--:--';
  }
}

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { status, fetchStats } = useNewsRefresh();
  const currentDate = formatDate(new Date());
  const [guideOpen, setGuideOpen] = useState(false);

  // 页面加载时立即获取一次统计，之后每 5 分钟刷新
  useEffect(() => {
    fetchStats();
    const timer = setInterval(() => {
      fetchStats();
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchStats]);

  const currentLabel =
    navItems
      .flatMap((g) => g.items)
      .find(
        (i) =>
          i.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(i.path)
      )?.label || '职业发展系统';

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-white font-bold text-lg dark:from-cyan-400 dark:to-cyan-600">
                职
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-base">职业发展系统</span>
                <span className="text-xs text-muted-foreground">
                  大数据技术 · 2027届
                </span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            {navItems.map((group) => (
              <SidebarGroup key={group.group}>
                <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                     {group.items.map((item) => {
                       const Icon = item.icon;
                       const isActive =
                         item.path === '/'
                           ? location.pathname === '/'
                           : location.pathname.startsWith(item.path);
                       const showBadge =
                         item.badgeKey === 'important' &&
                         status.todayImportantCount > 0;
                       return (
                         <SidebarMenuItem key={item.path}>
                           <SidebarMenuButton
                             asChild
                             isActive={isActive}
                             tooltip={item.label}
                           >
                             <NavLink
                               to={item.path}
                               className="flex items-center gap-2 w-full"
                             >
                               <Icon className="size-4 shrink-0" />
                               <span className="flex-1 truncate">
                                 {item.label}
                               </span>
                               {showBadge && (
                                 <Badge
                                   variant="destructive"
                                   className="h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full"
                                 >
                                   {status.todayImportantCount > 99
                                     ? '99+'
                                     : status.todayImportantCount}
                                 </Badge>
                               )}
                             </NavLink>
                           </SidebarMenuButton>
                         </SidebarMenuItem>
                       );
                     })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
           </SidebarContent>
           <SidebarFooter>
             <SidebarMenu>
               <SidebarMenuItem>
                 <SidebarMenuButton asChild tooltip="桌面安装">
                   <NavLink
                     to="/desktop-install"
                     className="flex items-center gap-2 w-full"
                   >
                     <Download className="size-4 shrink-0 text-cyan-400" />
                     <span className="flex-1 truncate">安装到桌面</span>
                   </NavLink>
                 </SidebarMenuButton>
               </SidebarMenuItem>
             </SidebarMenu>
           </SidebarFooter>
         </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-md">
            <SidebarTrigger />
            <div className="flex-1 flex items-center gap-3">
              <h1 className="text-lg font-semibold">{currentLabel}</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* 日期 */}
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-4" />
                <span>{currentDate}</span>
              </div>

              {/* 最后更新时间 */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>最后更新：{formatTime(status.lastRefreshAt)}</span>
              </div>

              {/* 通知按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate('/important-news')}
                aria-label="重要消息"
              >
                <Bell className="size-5" />
                {status.todayImportantCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {status.todayImportantCount > 99
                      ? '99+'
                      : status.todayImportantCount}
                  </span>
                )}
              </Button>

              {/* 当前阶段徽章 */}
              <Badge
                variant="secondary"
                className="hidden sm:inline-flex bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
              >
                {CURRENT_STAGE}
              </Badge>

              {/* 待办任务徽章 */}
              <Button
                variant="ghost"
                size="sm"
                className="relative gap-2 h-9 px-3"
              >
                <CheckSquare className="size-4" />
                <span className="hidden sm:inline text-sm">
                  {MOCK_TODO_COUNT} 待办
                </span>
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold sm:hidden">
                  {MOCK_TODO_COUNT}
                </span>
              </Button>

              {/* 主题切换 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="切换主题"
              >
                {theme === 'dark' ? (
                  <Sun className="size-5" />
                ) : (
                  <Moon className="size-5" />
                )}
              </Button>

              {/* PWA 安装 */}
              <PWAInstallButton guideOpen={guideOpen} onGuideOpenChange={setGuideOpen} />

              {/* 用户 */}
              <div className="flex items-center gap-2 pl-2 border-l">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-white text-sm font-semibold">
                  {MOCK_USER_NAME.charAt(0)}
                </div>
                <span className="hidden md:inline text-sm font-medium">
                  {MOCK_USER_NAME}
                </span>
              </div>
            </div>
          </header>

          <div className="flex-1 p-6 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
             </AnimatePresence>
           </div>
           <PWAInstallToast onShowGuide={() => setGuideOpen(true)} />
         </main>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
