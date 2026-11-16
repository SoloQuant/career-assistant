import { useEffect, useRef, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  MessageSquarePlus,
  Send,
  Sparkles,
  Briefcase,
  GraduationCap,
  Users,
  ClipboardList,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { careerAssistant } from '@/api';
import type {
  CareerAssistantSession,
  CareerAssistantMessage,
  CareerAssistantAdviceSummary,
} from '@shared/api.interface';

const SESSION_TYPE_TABS: Array<{
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { type: 'application_reminder', label: '投递提醒', icon: <Briefcase className="w-3.5 h-3.5" />, color: 'bg-blue-500' },
  { type: 'skill_improvement', label: '技能提升', icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'bg-emerald-500' },
  { type: 'interview_prep', label: '面试准备', icon: <Users className="w-3.5 h-3.5" />, color: 'bg-amber-500' },
  { type: 'interview_review', label: '面试复盘', icon: <ClipboardList className="w-3.5 h-3.5" />, color: 'bg-violet-500' },
  { type: 'general', label: '综合咨询', icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'bg-slate-500' },
];

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

const CareerAssistantPage: React.FC = () => {
  const [sessions, setSessions] = useState<CareerAssistantSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(true);
  const [adviceSummary, setAdviceSummary] = useState<CareerAssistantAdviceSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CareerAssistantMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSessions = async (): Promise<void> => {
    setSessionsLoading(true);
    try {
      const res = await careerAssistant.getSessions();
      setSessions(res.items);
      if (res.items.length > 0 && !activeSessionId) {
        setActiveSessionId(res.items[0].id);
      }
    } catch (error) {
      logger.error('加载会话列表失败', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadAdviceSummary = async (): Promise<void> => {
    try {
      const summary = await careerAssistant.getAdviceSummary();
      setAdviceSummary(summary);
    } catch (error) {
      logger.error('加载建议摘要失败', error);
    }
  };

  useEffect(() => {
    void loadSessions();
    void loadAdviceSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = async (sessionId: string): Promise<void> => {
    setMessagesLoading(true);
    try {
      const res = await careerAssistant.getSessionMessages(sessionId);
      setMessages(res.items);
      // Mark as read
      const session = sessions.find((s: CareerAssistantSession) => s.id === sessionId);
      if (session && !session.isRead) {
        await careerAssistant.markSessionAsRead(sessionId);
        setSessions((prev: CareerAssistantSession[]) =>
          prev.map((s: CareerAssistantSession) =>
            s.id === sessionId ? { ...s, isRead: true } : s
          )
        );
      }
    } catch (error) {
      logger.error('加载消息失败', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (activeSessionId) {
      void loadMessages(activeSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  const handleSelectSession = (sessionId: string): void => {
    setActiveSessionId(sessionId);
    setActiveTab(null);
  };

  const handleNewSession = (): void => {
    setActiveSessionId(null);
    setActiveTab(null);
    setMessages([]);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleTabClick = (type: string, label: string): void => {
    setActiveTab(type);
    setActiveSessionId(null);
    setMessages([]);
    setInputValue('');
    // Auto-send a starter message
    void sendMessage(`请帮我进行${label}相关的咨询`, type, label);
  };

  const sendMessage = async (
    content: string,
    sessionType?: string,
    title?: string
  ): Promise<void> => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    const userMsg: CareerAssistantMessage = {
      id: `temp-${Date.now()}`,
      sessionId: activeSessionId ?? '',
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev: CareerAssistantMessage[]) => [...prev, userMsg]);
    setInputValue('');

    try {
      const res = await careerAssistant.sendAssistantMessage({
        sessionId: activeSessionId ?? undefined,
        message: trimmed,
        sessionType: sessionType ?? activeTab ?? undefined,
        title: title ?? undefined,
      });

      const assistantMsg: CareerAssistantMessage = {
        id: `reply-${Date.now()}`,
        sessionId: res.sessionId,
        role: 'assistant',
        content: res.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev: CareerAssistantMessage[]) => [...prev, assistantMsg]);

      if (!activeSessionId) {
        setActiveSessionId(res.sessionId);
        // Refresh session list
        void loadSessions();
      } else {
        // Update last message preview
        setSessions((prev: CareerAssistantSession[]) =>
          prev.map((s: CareerAssistantSession) =>
            s.id === activeSessionId
              ? { ...s, lastMessage: trimmed, updatedAt: new Date().toISOString() }
              : s
          )
        );
      }
    } catch (error) {
      logger.error('发送消息失败', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = (): void => {
    void sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeSession = sessions.find(
    (s: CareerAssistantSession) => s.id === activeSessionId
  );

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] min-h-[600px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            智能求职助手
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            根据求职进度主动给出建议和提醒
          </p>
        </div>
      </div>

      {/* Quick type tabs */}
      <div className="flex flex-wrap gap-2">
        {SESSION_TYPE_TABS.map((tab) => {
          const summary = adviceSummary.find(
            (s: CareerAssistantAdviceSummary) => s.type === tab.type
          );
          const isActive = activeTab === tab.type;
          return (
            <Button
              key={tab.type}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTabClick(tab.type, tab.label)}
              className="gap-1.5"
            >
              <span className={`w-2 h-2 rounded-full ${tab.color}`} />
              {tab.icon}
              {tab.label}
              {summary && summary.count > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-[20px] justify-center px-1"
                >
                  {summary.count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      <Card className="flex-1 flex overflow-hidden p-0 min-h-0">
        {/* Left sidebar */}
        <div className="w-[280px] flex-shrink-0 border-r flex flex-col bg-muted/30">
          {/* Advice summary */}
          <div className="p-3 border-b">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              历史建议摘要
            </p>
            <div className="grid grid-cols-2 gap-2">
              {adviceSummary.length > 0 ? (
                adviceSummary
                  .slice(0, 6)
                  .map((item: CareerAssistantAdviceSummary) => (
                    <div
                      key={item.type}
                      className="bg-background rounded-md px-2.5 py-2 border border-border/60"
                    >
                      <div className="text-xs text-muted-foreground truncate">
                        {item.label}
                      </div>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <span className="text-base font-semibold">
                          {item.count}
                        </span>
                        {item.unread > 0 && (
                          <span className="text-[10px] text-primary font-medium">
                            {item.unread}条未读
                          </span>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <>
                  {[1, 2, 3, 4].map((n: number) => (
                    <div key={n} className="space-y-1.5">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-5 w-8" />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* New session button */}
          <div className="p-3 border-b">
            <Button
              variant="default"
              className="w-full gap-2"
              onClick={handleNewSession}
            >
              <MessageSquarePlus className="w-4 h-4" />
              新对话
            </Button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto">
            {sessionsLoading ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4, 5].map((n: number) => (
                  <div key={n} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm px-4 text-center">
                <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
                暂无对话，开始你的第一次咨询吧
              </div>
            ) : (
              <div className="py-1">
                {sessions.map((session: CareerAssistantSession) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={`w-full text-left px-3 py-3 border-b border-border/40 hover:bg-background transition-colors ${
                      activeSessionId === session.id
                        ? 'bg-background border-l-2 border-l-primary pl-[10px]'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!session.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-medium truncate">
                            {session.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {formatTime(session.updatedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {session.lastMessage || '暂无消息'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="h-14 border-b flex items-center px-4 flex-shrink-0 bg-background/50">
            {activeSession ? (
              <div>
                <h3 className="text-sm font-semibold">{activeSession.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {activeSession.sessionType
                    ? SESSION_TYPE_TABS.find(
                        (t) => t.type === activeSession.sessionType
                      )?.label || activeSession.sessionType
                    : '综合咨询'}
                </p>
              </div>
            ) : activeTab ? (
              <div>
                <h3 className="text-sm font-semibold">
                  新对话 ·{' '}
                  {SESSION_TYPE_TABS.find((t) => t.type === activeTab)?.label ||
                    activeTab}
                </h3>
                <p className="text-xs text-muted-foreground">开始你的咨询</p>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold">新对话</h3>
                <p className="text-xs text-muted-foreground">
                  选择上方分类或直接输入问题
                </p>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messagesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n: number) => (
                  <div key={n} className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2 flex-1 max-w-[70%]">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">
                  {activeTab
                    ? `${
                        SESSION_TYPE_TABS.find((t) => t.type === activeTab)
                          ?.label || ''
                      }咨询已就绪`
                    : '选择一个分类或直接开始对话'}
                </p>
                <p className="text-xs mt-1">
                  我会根据你的求职情况给出个性化建议
                </p>
              </div>
            ) : (
              messages.map((msg: CareerAssistantMessage) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-background border border-border/80 rounded-bl-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                    <div
                      className={`text-[10px] mt-1.5 ${
                        msg.role === 'user'
                          ? 'text-primary-foreground/60 text-right'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-background border border-border/80 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t p-3 bg-background flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setInputValue(e.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题... (Enter 发送, Shift+Enter 换行)"
                rows={2}
                className="flex-1 resize-none rounded-lg border border-border/80 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground"
              />
              <Button
                onClick={handleSend}
                disabled={isSending || !inputValue.trim()}
                size="icon"
                className="h-10 w-10 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CareerAssistantPage;
