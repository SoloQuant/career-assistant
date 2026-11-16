import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Bot,
  User,
  Sparkles,
  Loader2,
  Menu,
  X,
} from 'lucide-react';
import type {
  AiChatSession,
  AiChatMessage,
} from '@shared/api.interface';
import {
  getSessions,
  createSession,
  deleteSession,
  getMessages,
  sendMessage,
} from '@/api/ai-chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

const QUICK_QUESTIONS: string[] = [
  '我适合什么岗位',
  '怎么学Python',
  '如何提升技能',
  '简历怎么写',
];

const LOADING_MESSAGE_ID = '__loading__';

function formatTime(dateStr: string): string {
  try {
    const date: Date = new Date(dateStr);
    const now: Date = new Date();
    const sameDay: boolean =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (sameDay) {
      return date.toTimeString().slice(0, 5);
    }
    const yesterday: Date = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday: boolean =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();
    if (isYesterday) {
      return '昨天';
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return '';
  }
}

function truncatePreview(text: string, maxLen: number): string {
  const singleLine: string = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLen) return singleLine;
  return singleLine.slice(0, maxLen) + '...';
}

function renderMessageContent(content: string): React.ReactNode {
  const lines: string[] = content.split('\n');
  return lines.map((line: string, idx: number) => {
    if (line === '') return <br key={idx} />;
    if (/^[-*•]\s+/.test(line)) {
      return (
        <div key={idx} className="flex gap-2">
          <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          <span>{line.replace(/^[-*•]\s+/, '')}</span>
        </div>
      );
    }
    if (/^\d+\.\s+/.test(line)) {
      const match: RegExpMatchArray | null = line.match(/^(\d+)\.\s+(.*)$/);
      return (
        <div key={idx} className="flex gap-2">
          <span className="flex-shrink-0 font-medium opacity-70">
            {match?.[1]}.
          </span>
          <span>{match?.[2]}</span>
        </div>
      );
    }
    return (
      <div key={idx} className="whitespace-pre-wrap break-words">
        {line}
      </div>
    );
  });
}

const AiChatPage = () => {
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await getSessions();
      const sorted: AiChatSession[] = [...data.items].sort(
        (a: AiChatSession, b: AiChatSession) => {
          const aTime: number = a.lastMessageAt
            ? new Date(a.lastMessageAt).getTime()
            : new Date(a.createdAt).getTime();
          const bTime: number = b.lastMessageAt
            ? new Date(b.lastMessageAt).getTime()
            : new Date(b.createdAt).getTime();
          return bTime - aTime;
        },
      );
      setSessions(sorted);
      return sorted;
    } catch (error) {
      logger.error('加载会话列表失败', error);
      toast.error('加载会话列表失败');
      return [];
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions().then((sorted: AiChatSession[]) => {
      if (sorted.length > 0 && !activeSessionId) {
        setActiveSessionId(sorted[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMessages = useCallback(async (sessionId: string) => {
    setMessagesLoading(true);
    try {
      const data = await getMessages(sessionId);
      const sorted: AiChatMessage[] = [...data.items].sort(
        (a: AiChatMessage, b: AiChatMessage) => a.sortOrder - b.sortOrder,
      );
      setMessages(sorted);
    } catch (error) {
      logger.error(`加载消息失败: ${sessionId}`, error);
      toast.error('加载消息失败');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      void fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, scrollToBottom]);

  const handleCreateSession = useCallback(async () => {
    try {
      const newSession: AiChatSession = await createSession();
      setSessions((prev: AiChatSession[]) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setInputValue('');
      setSidebarOpen(true);
    } catch (error) {
      logger.error('创建会话失败', error);
      toast.error('创建会话失败');
    }
  }, []);

  const handleDeleteSession = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeletingId(sessionId);
      try {
        await deleteSession(sessionId);
        setSessions((prev: AiChatSession[]) =>
          prev.filter((s: AiChatSession) => s.id !== sessionId),
        );
        if (activeSessionId === sessionId) {
          const remaining: AiChatSession[] = sessions.filter(
            (s: AiChatSession) => s.id !== sessionId,
          );
          setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
        }
        toast.success('会话已删除');
      } catch (error) {
        logger.error(`删除会话失败: ${sessionId}`, error);
        toast.error('删除会话失败');
      } finally {
        setDeletingId(null);
      }
    },
    [activeSessionId, sessions],
  );

  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setInputValue('');
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    const content: string = inputValue.trim();
    if (!content || isSending) return;

    let currentSessionId: string | null = activeSessionId;

    if (!currentSessionId) {
      try {
        const newSession: AiChatSession = await createSession({
          title: truncatePreview(content, 20),
        });
        setSessions((prev: AiChatSession[]) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        currentSessionId = newSession.id;
      } catch (error) {
        logger.error('创建会话失败', error);
        toast.error('创建会话失败');
        return;
      }
    }

    const userMessage: AiChatMessage = {
      id: `user_${Date.now()}`,
      sessionId: currentSessionId,
      role: 'user',
      content,
      sortOrder: messages.length,
      createdAt: new Date().toISOString(),
    };

    const loadingMessage: AiChatMessage = {
      id: LOADING_MESSAGE_ID,
      sessionId: currentSessionId,
      role: 'assistant',
      content: '',
      sortOrder: messages.length + 1,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev: AiChatMessage[]) => [
      ...prev,
      userMessage,
      loadingMessage,
    ]);
    setInputValue('');
    setIsSending(true);

    try {
      const reply: AiChatMessage = await sendMessage(currentSessionId, content);
      setMessages((prev: AiChatMessage[]) =>
        prev.map((m: AiChatMessage) =>
          m.id === LOADING_MESSAGE_ID ? reply : m,
        ),
      );
      setSessions((prev: AiChatSession[]) =>
        prev.map((s: AiChatSession) =>
          s.id === currentSessionId
            ? { ...s, lastMessageAt: reply.createdAt }
            : s,
        ),
      );
    } catch (error) {
      logger.error('发送消息失败', error);
      toast.error('发送消息失败');
      setMessages((prev: AiChatMessage[]) =>
        prev.filter((m: AiChatMessage) => m.id !== LOADING_MESSAGE_ID),
      );
    } finally {
      setIsSending(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [activeSessionId, inputValue, isSending, messages.length, createSession, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  const handleQuickQuestion = useCallback(
    (question: string) => {
      setInputValue(question);
      void (async () => {
        await new Promise<void>((resolve: () => void) => {
          setTimeout(() => resolve(), 0);
        });
        await handleSendMessage();
      })();
    },
    [handleSendMessage],
  );

  const activeSession: AiChatSession | undefined = sessions.find(
    (s: AiChatSession) => s.id === activeSessionId,
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background flex-col md:flex-row overflow-hidden">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
        <span className="font-medium flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          AI 助手
        </span>
        <div className="w-9" />
      </div>

      {/* Sidebar */}
      <div
        className={`
          ${sidebarOpen ? 'flex' : 'hidden'} md:flex
          flex-col w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-border bg-card
          flex-shrink-0
        `}
      >
        <div className="p-3 border-b border-border">
          <Button
            onClick={handleCreateSession}
            className="w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md"
          >
            <Plus size={18} />
            新建会话
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessionsLoading && (
              <>
                {Array.from({ length: 5 }).map((_: unknown, i: number) => (
                  <div key={i} className="p-3 rounded-lg">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </>
            )}

            {!sessionsLoading && sessions.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                暂无会话
                <br />
                点击上方按钮创建
              </div>
            )}

            {!sessionsLoading &&
              sessions.map((session: AiChatSession) => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  onMouseEnter={() => setHoveredSessionId(session.id)}
                  onMouseLeave={() => setHoveredSessionId(null)}
                  className={`
                    w-full text-left p-3 rounded-lg transition-all group
                    ${activeSessionId === session.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-accent border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare
                      size={16}
                      className={`mt-0.5 flex-shrink-0 ${
                        activeSessionId === session.id
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-medium text-sm truncate ${
                            activeSessionId === session.id
                              ? 'text-primary'
                              : 'text-foreground'
                          }`}
                        >
                          {session.title || '新会话'}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {hoveredSessionId === session.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e: React.MouseEvent) =>
                                handleDeleteSession(session.id, e)
                              }
                              disabled={deletingId === session.id}
                            >
                              {deletingId === session.id ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </Button>
                          )}
                          {session.lastMessageAt && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTime(session.lastMessageAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {session.lastMessageAt ? '暂无消息预览' : '开始新对话'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="h-14 md:h-16 border-b border-border flex items-center px-4 gap-3 bg-card/50">
          <div className="flex items-center gap-3">
            {activeSession ? (
              <>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                    {activeSession.title || '新会话'}
                  </h2>
                  <p className="text-xs text-muted-foreground hidden md:block">
                    AI 智能助手在线
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm md:text-base">
                    AI 助手
                  </h2>
                  <p className="text-xs text-muted-foreground hidden md:block">
                    你的智能伙伴
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6">
            {!activeSession && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
                  <Sparkles size={32} className="text-white md:hidden" />
                  <Sparkles size={40} className="text-white hidden md:block" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  你好，我是 AI 助手
                </h1>
                <p className="text-muted-foreground mb-8 max-w-md text-sm md:text-base">
                  我可以帮你解答职业规划、技能学习、简历优化等问题。
                  <br className="hidden md:block" />
                  选择一个快捷问题开始吧！
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {QUICK_QUESTIONS.map((q: string) => (
                    <button
                      key={q}
                      onClick={() => handleQuickQuestion(q)}
                      className="p-4 text-left rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                          <MessageSquare
                            size={16}
                            className="text-primary"
                          />
                        </div>
                        <span className="text-sm font-medium pt-1">{q}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSession && messagesLoading && (
              <div className="space-y-4 py-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0" />
                  <div className="space-y-2 flex-1 max-w-[80%]">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>
            )}

            {activeSession && !messagesLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center mb-4">
                  <Bot size={28} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">开始对话</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                  在下方输入你的问题，AI 助手会为你解答
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {QUICK_QUESTIONS.slice(0, 3).map((q: string) => (
                    <button
                      key={q}
                      onClick={() => handleQuickQuestion(q)}
                      className="px-3 py-1.5 text-xs rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <div className="space-y-5 max-w-4xl mx-auto">
                {messages.map((msg: AiChatMessage) => {
                  const isUser: boolean = msg.role === 'user';
                  const isLoading: boolean = msg.id === LOADING_MESSAGE_ID;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        isUser ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                          ${isUser
                            ? 'bg-gradient-to-br from-violet-500 to-indigo-500'
                            : 'bg-secondary'
                          }
                        `}
                      >
                        {isUser ? (
                          <User size={16} className="text-white" />
                        ) : (
                          <Bot
                            size={16}
                            className="text-secondary-foreground"
                          />
                        )}
                      </div>
                      <div
                        className={`
                          max-w-[80%] md:max-w-[70%] lg:max-w-[60%]
                          ${isUser ? 'items-end' : 'items-start'}
                          flex flex-col
                        `}
                      >
                        <div
                          className={`
                            px-4 py-3 rounded-2xl text-sm leading-relaxed
                            ${isUser
                              ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-tr-sm shadow-md shadow-violet-500/20'
                              : 'bg-secondary text-foreground rounded-tl-sm border border-border/50'
                            }
                          `}
                        >
                          {isLoading ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                              <span>AI思考中...</span>
                            </div>
                          ) : (
                            renderMessageContent(msg.content)
                          )}
                        </div>
                        <span
                          className={`
                            text-xs text-muted-foreground mt-1
                            ${isUser ? 'text-right' : 'text-left'}
                          `}
                        >
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t border-border p-3 md:p-4 bg-card/30">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setInputValue(e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
                  className="resize-none min-h-[48px] max-h-40 pr-12 rounded-xl"
                  rows={1}
                  disabled={isSending}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isSending}
                className="h-12 w-12 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md flex-shrink-0"
                aria-label="发送"
              >
                {isSending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              AI 生成内容仅供参考，请结合实际情况判断
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiChatPage;
