import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, count } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { careerAssistantSession, careerAssistantMessage } from '../../database/schema';
import type {
  CareerAssistantSession as SessionType,
  CareerAssistantMessage as MessageType,
  CareerAssistantSessionListResponse,
  CareerAssistantMessageListResponse,
  CareerAssistantSendRequest,
  CareerAssistantAdviceSummary,
} from '@shared/api.interface';

const ADVICE_TYPE_LABELS: Record<string, string> = {
  job_application: '投递提醒',
  skill_gap: '技能提升',
  interview_prep: '面试准备',
  interview_review: '面试复盘',
  general: '综合咨询',
  resume: '简历优化',
  learning_plan: '学习规划',
};

const DEFAULT_USER_ID = '1847292357012580';

@Injectable()
export class CareerAssistantService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getSessions(userId: string): Promise<CareerAssistantSessionListResponse> {
    const effectiveUserId = await this.resolveUserId(userId);
    const sessions = await this.db
      .select()
      .from(careerAssistantSession)
      .where(eq(careerAssistantSession.userId, effectiveUserId))
      .orderBy(desc(careerAssistantSession.updatedAt));

    const [{ unreadCount }] = await this.db
      .select({ unreadCount: count() })
      .from(careerAssistantSession)
      .where(
        and(
          eq(careerAssistantSession.userId, effectiveUserId),
          eq(careerAssistantSession.isRead, false),
        ),
      );

    return {
      items: sessions.map((s) => this.mapSession(s)),
      unreadCount: Number(unreadCount),
    };
  }

  async getMessages(sessionId: string, userId: string): Promise<CareerAssistantMessageListResponse> {
    const [session] = await this.db
      .select()
      .from(careerAssistantSession)
      .where(
        and(
          eq(careerAssistantSession.id, sessionId),
          eq(careerAssistantSession.userId, userId),
        ),
      )
      .limit(1);

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    const messages = await this.db
      .select()
      .from(careerAssistantMessage)
      .where(eq(careerAssistantMessage.sessionId, sessionId))
      .orderBy(desc(careerAssistantMessage.createdAt));

    return {
      items: messages.map((m) => this.mapMessage(m)).reverse(),
    };
  }

  async sendMessage(
    dto: CareerAssistantSendRequest,
    userId: string,
  ): Promise<{ sessionId: string; reply: string }> {
    let sessionId = dto.sessionId;

    if (!sessionId) {
      const [session] = await this.db
        .insert(careerAssistantSession)
        .values({
          userId,
          sessionType: dto.sessionType || 'chat',
          title: dto.title || '新对话',
          lastMessage: dto.message,
          isRead: true,
        })
        .returning({ id: careerAssistantSession.id });
      sessionId = session.id;
    }

    await this.db.insert(careerAssistantMessage).values({
      sessionId,
      role: 'user',
      content: dto.message,
    });

    const reply = this.generateReply(dto.message, dto.sessionType);

    await this.db.insert(careerAssistantMessage).values({
      sessionId,
      role: 'assistant',
      content: reply,
      adviceType: dto.sessionType && dto.sessionType !== 'chat' ? dto.sessionType : undefined,
    });

    await this.db.update(careerAssistantSession).set({
      lastMessage: reply,
      updatedAt: new Date(),
    }).where(eq(careerAssistantSession.id, sessionId));

    return { sessionId, reply };
  }

  async getAdviceSummary(userId: string): Promise<CareerAssistantAdviceSummary[]> {
    const effectiveUserId = await this.resolveUserId(userId);
    const sessions = await this.db
      .select()
      .from(careerAssistantSession)
      .where(eq(careerAssistantSession.userId, effectiveUserId));

    const summaryMap = new Map<string, { count: number; unread: number }>();
    for (const s of sessions) {
      const type = s.lastAdviceType || 'general';
      const current = summaryMap.get(type) || { count: 0, unread: 0 };
      current.count += 1;
      if (!s.isRead) current.unread += 1;
      summaryMap.set(type, current);
    }

    const result: CareerAssistantAdviceSummary[] = [];
    for (const [type, data] of summaryMap) {
      result.push({
        type,
        label: ADVICE_TYPE_LABELS[type] || type,
        count: data.count,
        unread: data.unread,
      });
    }
    return result.sort((a, b) => b.unread - a.unread);
  }

  async markAsRead(sessionId: string, userId: string): Promise<void> {
    await this.db.update(careerAssistantSession).set({
      isRead: true,
    }).where(
      and(
        eq(careerAssistantSession.id, sessionId),
        eq(careerAssistantSession.userId, userId),
      ),
    );
  }

  private generateReply(userMessage: string, sessionType?: string): string {
    const msg = userMessage.toLowerCase();

    if (sessionType === 'advice' || msg.includes('投递') || msg.includes('简历')) {
      return '根据你的求职进度，我建议你今天至少投递3-5份简历。重点关注大数据开发和数据工程师岗位，你的技能匹配度较高。另外，建议针对不同公司微调简历中的项目描述，提高通过率。';
    }
    if (msg.includes('面试') || sessionType === 'interview_prep' || sessionType === 'interview_review') {
      return '面试准备建议：1) 复习Spark核心原理和性能优化 2) 刷20道中等难度算法题 3) 准备3个STAR格式的项目案例 4) 提前了解公司业务和技术栈。面试后一定要当天复盘，把不会的题整理到错题本。';
    }
    if (msg.includes('技能') || msg.includes('学习') || sessionType === 'skill_gap') {
      return '根据目标岗位分析，你目前需要加强的技能依次是：1) Flink实时计算（高频要求）2) 数据仓库建模（加分项）3) Java基础（部分大厂要求）。建议每天学习2小时，先集中突破Flink，预计2周可以达到面试水平。';
    }
    if (msg.includes('计划') || msg.includes('规划')) {
      return '我为你制定的学习计划是：工作日每天2小时（1小时视频课+1小时动手实践），周末每天4小时。本周重点是Hive数据仓库，下周进入Spark核心模块。如果哪天没完成，系统会自动把任务顺延，不用担心。';
    }
    return '我已经了解你的情况。你可以问我关于求职、学习、面试、技能提升等方面的问题，我会根据你的进度给出个性化建议。也可以随时让我帮你：1) 分析当前求职进度 2) 推荐学习资源 3) 模拟面试 4) 简历优化建议';
  }

  private mapSession(s: typeof careerAssistantSession.$inferSelect): SessionType {
    return {
      id: s.id,
      sessionType: s.sessionType,
      title: s.title || '求职助手',
      lastMessage: s.lastMessage || '',
      lastAdviceType: s.lastAdviceType || '',
      isRead: s.isRead,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  private mapMessage(m: typeof careerAssistantMessage.$inferSelect): MessageType {
    return {
      id: m.id,
      sessionId: m.sessionId,
      role: m.role,
      content: m.content,
      adviceType: m.adviceType || undefined,
      metadata: m.metadata as Record<string, unknown> | undefined,
      createdAt: m.createdAt.toISOString(),
    };
  }

  private async resolveUserId(userId: string): Promise<string> {
    const [{ cnt }] = await this.db
      .select({ cnt: count() })
      .from(careerAssistantSession)
      .where(eq(careerAssistantSession.userId, userId));
    if (Number(cnt) > 0) return userId;
    return DEFAULT_USER_ID;
  }
}
