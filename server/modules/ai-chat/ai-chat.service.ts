import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, count, desc, asc, sql } from 'drizzle-orm';
import { aiChatSession, aiChatMessage, skill, profile } from '@server/database/schema';
import type {
  AiChatSession,
  AiChatMessage,
  CreateSessionRequest,
  SendMessageRequest,
  ChatSessionListResponse,
  ChatMessageListResponse,
  Skill,
  Profile,
  KnowledgePoint,
} from '@shared/api.interface';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getSessions(userId: string): Promise<ChatSessionListResponse> {
    try {
      const rows = await this.db
        .select({
          id: aiChatSession.id,
          title: aiChatSession.title,
          contextType: aiChatSession.contextType,
          contextData: aiChatSession.contextData,
          lastMessageAt: aiChatSession.lastMessageAt,
          createdAt: aiChatSession.createdAt,
        })
        .from(aiChatSession)
        .where(eq(aiChatSession.createdBy, userId))
        .orderBy(desc(aiChatSession.lastMessageAt), desc(aiChatSession.createdAt));

      const totalResult = await this.db
        .select({ count: count() })
        .from(aiChatSession)
        .where(eq(aiChatSession.createdBy, userId));

      const items: AiChatSession[] = rows.map((row) => ({
        id: row.id,
        title: row.title,
        contextType: row.contextType,
        contextData: (row.contextData as Record<string, string>) ?? {},
        lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : undefined,
        createdAt: row.createdAt.toISOString(),
      }));

      return {
        items,
        total: totalResult[0]?.count ?? 0,
      };
    } catch (error) {
      this.logger.error(`获取会话列表失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async createSession(
    userId: string,
    dto: CreateSessionRequest,
  ): Promise<AiChatSession> {
    try {
      const inserted = await this.db
        .insert(aiChatSession)
        .values({
          title: dto.title || '新对话',
          contextType: dto.contextType || 'general',
          contextData: dto.contextData ? JSON.stringify(dto.contextData) : {},
          createdBy: userId,
        })
        .returning({
          id: aiChatSession.id,
          title: aiChatSession.title,
          contextType: aiChatSession.contextType,
          contextData: aiChatSession.contextData,
          lastMessageAt: aiChatSession.lastMessageAt,
          createdAt: aiChatSession.createdAt,
        });

      const row = inserted[0];
      return {
        id: row.id,
        title: row.title,
        contextType: row.contextType,
        contextData: (row.contextData as Record<string, string>) ?? {},
        lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : undefined,
        createdAt: row.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`创建会话失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async getSession(userId: string, id: string): Promise<AiChatSession | null> {
    try {
      const rows = await this.db
        .select({
          id: aiChatSession.id,
          title: aiChatSession.title,
          contextType: aiChatSession.contextType,
          contextData: aiChatSession.contextData,
          lastMessageAt: aiChatSession.lastMessageAt,
          createdAt: aiChatSession.createdAt,
        })
        .from(aiChatSession)
        .where(
          sql`${aiChatSession.id} = ${id} AND (${aiChatSession.createdBy}).user_id = ${userId}`,
        )
        .limit(1);

      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        id: row.id,
        title: row.title,
        contextType: row.contextType,
        contextData: (row.contextData as Record<string, string>) ?? {},
        lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : undefined,
        createdAt: row.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`获取会话详情失败 userId=${userId} id=${id}`, error as Error);
      throw error;
    }
  }

  async deleteSession(userId: string, id: string): Promise<boolean> {
    try {
      const deleted = await this.db
        .delete(aiChatSession)
        .where(
          sql`${aiChatSession.id} = ${id} AND (${aiChatSession.createdBy}).user_id = ${userId}`,
        )
        .returning({ id: aiChatSession.id });
      return deleted.length > 0;
    } catch (error) {
      this.logger.error(`删除会话失败 userId=${userId} id=${id}`, error as Error);
      throw error;
    }
  }

  async getMessages(sessionId: string): Promise<ChatMessageListResponse> {
    try {
      const rows = await this.db
        .select({
          id: aiChatMessage.id,
          sessionId: aiChatMessage.sessionId,
          role: aiChatMessage.role,
          content: aiChatMessage.content,
          sortOrder: aiChatMessage.sortOrder,
          createdAt: aiChatMessage.createdAt,
        })
        .from(aiChatMessage)
        .where(eq(aiChatMessage.sessionId, sessionId))
        .orderBy(asc(aiChatMessage.sortOrder));

      const totalResult = await this.db
        .select({ count: count() })
        .from(aiChatMessage)
        .where(eq(aiChatMessage.sessionId, sessionId));

      const items: AiChatMessage[] = rows.map((row) => ({
        id: row.id,
        sessionId: row.sessionId,
        role: row.role as 'user' | 'assistant',
        content: row.content,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt.toISOString(),
      }));

      return {
        items,
        total: totalResult[0]?.count ?? 0,
      };
    } catch (error) {
      this.logger.error(`获取消息列表失败 sessionId=${sessionId}`, error as Error);
      throw error;
    }
  }

  async sendMessage(
    userId: string,
    dto: SendMessageRequest,
  ): Promise<AiChatMessage> {
    try {
      // 校验会话归属
      const session = await this.getSession(userId, dto.sessionId);
      if (!session) {
        throw new NotFoundException('会话不存在');
      }

      // 获取当前消息总数以确定 sort_order
      const countResult = await this.db
        .select({ count: count() })
        .from(aiChatMessage)
        .where(eq(aiChatMessage.sessionId, dto.sessionId));
      const messageCount: number = countResult[0]?.count ?? 0;
      const isFirstMessage: boolean = messageCount === 0;

      // 创建 user 消息
      const userSortOrder: number = messageCount;
      await this.db.insert(aiChatMessage).values({
        sessionId: dto.sessionId,
        role: 'user',
        content: dto.content,
        sortOrder: userSortOrder,
      });

      // 如果是第一条消息，用内容前 20 字更新会话 title
      if (isFirstMessage && (!session.title || session.title === '新对话')) {
        const newTitle: string = dto.content.slice(0, 20);
        await this.db
          .update(aiChatSession)
          .set({ title: newTitle })
          .where(eq(aiChatSession.id, dto.sessionId));
      }

      // 生成 AI 回复
      const userSkills: Skill[] = await this.getUserSkills(userId);
      const userProfile: Profile | null = await this.getUserProfile(userId);
      const replyContent: string = this.generateReply(
        dto.content,
        userSkills,
        userProfile,
        session.contextData,
      );

      // 创建 assistant 回复消息
      const assistantSortOrder: number = userSortOrder + 1;
      const now = new Date();
      const inserted = await this.db
        .insert(aiChatMessage)
        .values({
          sessionId: dto.sessionId,
          role: 'assistant',
          content: replyContent,
          sortOrder: assistantSortOrder,
        })
        .returning({
          id: aiChatMessage.id,
          sessionId: aiChatMessage.sessionId,
          role: aiChatMessage.role,
          content: aiChatMessage.content,
          sortOrder: aiChatMessage.sortOrder,
          createdAt: aiChatMessage.createdAt,
        });

      // 更新会话 last_message_at
      await this.db
        .update(aiChatSession)
        .set({ lastMessageAt: now })
        .where(eq(aiChatSession.id, dto.sessionId));

      const row = inserted[0];
      return {
        id: row.id,
        sessionId: row.sessionId,
        role: row.role as 'user' | 'assistant',
        content: row.content,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`发送消息失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  private async getUserSkills(userId: string): Promise<Skill[]> {
    try {
      const rows = await this.db
        .select({
          id: skill.id,
          name: skill.name,
          category: skill.category,
          description: skill.description,
          masteryLevel: skill.masteryLevel,
          knowledgePoints: skill.knowledgePoints,
          selfRating: skill.selfRating,
          createdAt: skill.createdAt,
          updatedAt: skill.updatedAt,
        })
        .from(skill)
        .where(
          sql`(${skill.createdBy}).user_id = ${userId}`,
        )
        .orderBy(desc(skill.masteryLevel));

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description,
        masteryLevel: row.masteryLevel,
        knowledgePoints: (row.knowledgePoints as KnowledgePoint[]) ?? [],
        selfRating: row.selfRating,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error(`获取用户技能失败 userId=${userId}`, error as Error);
      return [];
    }
  }

  private async getUserProfile(userId: string): Promise<Profile | null> {
    try {
      const rows = await this.db
        .select({
          id: profile.id,
          userId: profile.userId,
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
        })
        .from(profile)
        .where(eq(profile.userId, userId))
        .limit(1);

      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        id: row.id,
        userId: row.userId,
        name: row.name,
        school: row.school,
        department: row.department,
        major: row.major,
        grade: row.grade,
        city: row.city,
        jobIntention: row.jobIntention,
        contact: row.contact,
        email: row.email,
        bio: row.bio,
      };
    } catch (error) {
      this.logger.error(`获取用户资料失败 userId=${userId}`, error as Error);
      return null;
    }
  }

  private generateReply(
    content: string,
    userSkills: Skill[],
    userProfile: Profile | null,
    contextData: Record<string, string>,
  ): string {
    const lowerContent: string = content.toLowerCase();
    const topSkills: Skill[] = userSkills.slice(0, 5);
    const skillNames: string = topSkills.length > 0
      ? topSkills.map((s: Skill) => s.name).join('、')
      : '暂无已添加的技能';
    const targetJob: string = userProfile?.jobIntention || contextData?.targetJob || '你的目标岗位';

    // 岗位推荐
    if (/岗位|适合|推荐|方向|找什么工作/.test(lowerContent)) {
      return this.generateJobRecommendation(topSkills, targetJob);
    }

    // 学习方法
    if (/怎么学|学习方法|学习计划|怎么入门|如何学习|从哪学/.test(lowerContent)) {
      return this.generateLearningAdvice(topSkills, targetJob);
    }

    // 提升进阶
    if (/提升|提高|进阶|深入|精通|变强/.test(lowerContent)) {
      // 尝试从消息或上下文中识别技能名
      const mentionedSkill: string | undefined = this.findMentionedSkill(
        content,
        userSkills,
        contextData,
      );
      return this.generateImprovementAdvice(mentionedSkill, targetJob);
    }

    // 简历面试求职
    if (/简历|面试|offer|求职|找工作|应聘|笔试/.test(lowerContent)) {
      return this.generateJobSearchAdvice(topSkills, targetJob);
    }

    // 通用回复
    return this.generateGeneralReply(skillNames, targetJob);
  }

  private findMentionedSkill(
    content: string,
    userSkills: Skill[],
    contextData: Record<string, string>,
  ): string | undefined {
    const lowerContent: string = content.toLowerCase();
    for (const s of userSkills) {
      if (lowerContent.includes(s.name.toLowerCase())) {
        return s.name;
      }
    }
    if (contextData?.skillName) return contextData.skillName;
    if (userSkills.length > 0) return userSkills[0].name;
    return undefined;
  }

  private generateJobRecommendation(
    topSkills: Skill[],
    targetJob: string,
  ): string {
    const lines: string[] = [];
    lines.push('根据你目前的技能组合，以下是一些适合你的岗位方向参考：');
    lines.push('');

    const recommendations: Array<{ icon: string; title: string; desc: string }> = [
      {
        icon: '🎯',
        title: '数据分析方向',
        desc: '如果你掌握 SQL、Python 和 Excel，可以考虑数据分析师岗位，业务理解 + 数据工具是核心竞争力。',
      },
      {
        icon: '💡',
        title: '后端开发方向',
        desc: '如果你有 Java/Python/Go 等编程语言基础，后端开发岗位需求大、成长路径清晰。',
      },
      {
        icon: '📊',
        title: '大数据方向',
        desc: '如果你熟悉 Hadoop、Spark、Flink 等框架，大数据工程师是当前热门且薪资可观的方向。',
      },
      {
        icon: '🤖',
        title: 'AI / 机器学习方向',
        desc: '如果你有机器学习、深度学习基础，可以考虑算法工程师或 AI 应用开发岗位。',
      },
      {
        icon: '📈',
        title: '产品经理 / 运营方向',
        desc: '如果你沟通能力强、喜欢从业务视角思考问题，可以考虑数据产品经理或增长运营。',
      },
    ];

    // 根据技能匹配度挑选建议
    const categories: Set<string> = new Set(
      topSkills.map((s: Skill) => s.category),
    );
    const selected: typeof recommendations = [];

    if (
      categories.has('database') ||
      topSkills.some((s: Skill) => /sql|数据分析|excel/i.test(s.name))
    ) {
      selected.push(recommendations[0]);
    }
    if (
      categories.has('programming_language') ||
      topSkills.some((s: Skill) => /java|python|go|c\+\+|javascript/i.test(s.name))
    ) {
      selected.push(recommendations[1]);
    }
    if (
      categories.has('bigdata_framework') ||
      topSkills.some((s: Skill) => /hadoop|spark|flink|kafka/i.test(s.name))
    ) {
      selected.push(recommendations[2]);
    }
    if (
      categories.has('machine_learning') ||
      topSkills.some((s: Skill) => /机器学习|深度学习|tensorflow|pytorch|ai/i.test(s.name))
    ) {
      selected.push(recommendations[3]);
    }

    // 补齐到 4 条
    for (const rec of recommendations) {
      if (selected.length >= 4) break;
      if (!selected.includes(rec)) selected.push(rec);
    }

    for (const rec of selected.slice(0, 4)) {
      lines.push(`${rec.icon} **${rec.title}**：${rec.desc}`);
    }

    lines.push('');
    lines.push(
      `✨ 你当前的目标是「${targetJob}」，建议先评估自己与该岗位核心要求的差距，有针对性地补齐技能。`,
    );
    lines.push('如果你告诉我更具体的兴趣或背景，我可以给出更精准的建议！');

    return lines.join('\n');
  }

  private generateLearningAdvice(
    topSkills: Skill[],
    targetJob: string,
  ): string {
    const lines: string[] = [];
    lines.push('给你一套高效的学习方法建议，帮你少走弯路：');
    lines.push('');

    const tips: Array<{ icon: string; title: string; desc: string }> = [
      {
        icon: '📚',
        title: '目标倒推法',
        desc: `先明确「${targetJob}」岗位的核心技能要求，再倒推需要学什么，避免盲目学习。建议去招聘网站看 20-30 个目标岗位 JD，提取高频关键词。`,
      },
      {
        icon: '🎯',
        title: '项目驱动学习',
        desc: '学完一个知识点立刻用它做一个小项目。比如学完 SQL 就做一个数据分析项目，学完 Python 就写一个自动化脚本，实战是最好的老师。',
      },
      {
        icon: '⏰',
        title: '番茄工作法 + 间隔复习',
        desc: '每天固定 2-3 个 25 分钟的专注学习时段，配合艾宾浩斯遗忘曲线定期回顾。坚持比强度更重要。',
      },
      {
        icon: '🔄',
        title: '费曼学习法',
        desc: '学完后尝试用自己的话把知识讲出来（写博客、录视频、讲给朋友听）。讲不清楚的地方就是你还没真正理解的点。',
      },
      {
        icon: '🤝',
        title: '加入学习社群',
        desc: '找到志同道合的学习伙伴或加入相关技术社群，互相监督、讨论问题，学习效率会高很多。',
      },
    ];

    for (const tip of tips) {
      lines.push(`${tip.icon} **${tip.title}**：${tip.desc}`);
    }

    lines.push('');
    if (topSkills.length > 0) {
      lines.push(
        `💪 你目前掌握了 ${topSkills.length} 项技能，建议从「${topSkills[0].name}」开始深入，把一个技能练到高级再扩展下一个。`,
      );
    } else {
      lines.push('💪 先从添加你的第一项技能开始吧，让我更了解你的基础！');
    }

    return lines.join('\n');
  }

  private generateImprovementAdvice(
    skillName: string | undefined,
    targetJob: string,
  ): string {
    const target: string = skillName || '该技能';
    const lines: string[] = [];
    lines.push(`关于「${target}」的进阶提升，给你以下建议：`);
    lines.push('');

    const advice: Array<{ icon: string; title: string; desc: string }> = [
      {
        icon: '📖',
        title: '系统阅读经典书籍',
        desc: `找一本${target}领域公认的经典书籍，从头到尾系统读完。读书比看碎片化教程更能建立完整的知识体系。`,
      },
      {
        icon: '🏗️',
        title: '做一个有难度的实战项目',
        desc: '找一个比你当前水平略高的项目来做，在实战中遇到问题、解决问题，是提升最快的方式。可以从 GitHub 上找开源项目参与贡献。',
      },
      {
        icon: '🧠',
        title: '深入底层原理',
        desc: '不要只停留在"会用"层面，去了解它的底层实现原理。比如学语言看源码、学框架看设计思想，知其然更知其所以然。',
      },
      {
        icon: '🎤',
        title: '输出与分享',
        desc: '写技术博客、做分享演讲、回答社区问题。教别人是检验自己掌握程度的最好方式，还能建立个人技术品牌。',
      },
      {
        icon: '🔗',
        title: '横向拓展相关技能',
        desc: `结合你${targetJob ? `「${targetJob}」的方向` : '的目标岗位'}，横向学习配套技能。比如学前端的可以学点设计，做后端的可以了解下运维。`,
      },
    ];

    for (const item of advice) {
      lines.push(`${item.icon} **${item.title}**：${item.desc}`);
    }

    lines.push('');
    lines.push('🚀 记住：进阶没有捷径，但有方法。保持耐心，持续投入，量变终将带来质变！');

    return lines.join('\n');
  }

  private generateJobSearchAdvice(
    topSkills: Skill[],
    targetJob: string,
  ): string {
    const lines: string[] = [];
    lines.push('关于求职准备，给你以下实用建议：');
    lines.push('');

    const tips: Array<{ icon: string; title: string; desc: string }> = [
      {
        icon: '📄',
        title: '简历优化',
        desc: '简历一页纸原则，用 STAR 法则描述经历（情境+任务+行动+结果），尽量用数据量化成果。针对不同岗位微调简历重点，不要一份简历投所有岗位。',
      },
      {
        icon: '🎯',
        title: '精准投递',
        desc: `优先投与「${targetJob}」匹配度高的岗位。每天投 5-10 份精准投递的简历，好过海投 100 份。利用内推渠道可以大幅提升通过率。`,
      },
      {
        icon: '💬',
        title: '面试准备',
        desc: '提前梳理常见面试题和答案，准备 3-5 个能体现你能力的项目故事。技术岗要刷算法题和八股文，非技术岗要准备行为面试题。',
      },
      {
        icon: '📊',
        title: '作品集 / GitHub',
        desc: topSkills.length > 0
          ? `把你${topSkills.slice(0, 2).map((s: Skill) => s.name).join('、')}等技能的实战项目整理到 GitHub 或作品集网站上，有作品的候选人面试通过率高很多。`
          : '把你的实战项目整理到 GitHub 或作品集网站上，有作品的候选人面试通过率高很多。',
      },
      {
        icon: '🤝',
        title: '人脉与信息',
        desc: '多参加行业活动、加入相关社群、LinkedIn/脉脉上拓展人脉。很多好岗位不对外公开，内推是最高效的求职方式。',
      },
    ];

    for (const tip of tips) {
      lines.push(`${tip.icon} **${tip.title}**：${tip.desc}`);
    }

    lines.push('');
    lines.push('💪 求职是一场持久战，保持积极心态，每次面试后复盘总结，持续优化，offer 一定会来的！');

    return lines.join('\n');
  }

  private generateGeneralReply(
    skillNames: string,
    targetJob: string,
  ): string {
    const lines: string[] = [];
    lines.push('你好呀！我是你的职业成长助手，很高兴认识你！😊');
    lines.push('');
    lines.push('我可以帮你：');
    lines.push('');

    const items: Array<{ icon: string; text: string }> = [
      { icon: '🎯', text: '**推荐适合你的岗位方向** — 告诉我你的技能和兴趣' },
      { icon: '📚', text: '**制定学习计划** — 告诉我你想学什么或目标是什么' },
      { icon: '🚀', text: '**技能提升建议** — 告诉我你想进阶哪项技能' },
      { icon: '💼', text: '**求职 / 面试 / 简历指导** — 问我求职相关的问题' },
    ];

    for (const item of items) {
      lines.push(`${item.icon} ${item.text}`);
    }

    lines.push('');
    lines.push(`📝 我看到你的目标方向是「${targetJob}」，`);
    lines.push(`你目前掌握的技能有：${skillNames}。`);
    lines.push('');
    lines.push('有什么我可以帮你的吗？直接问我就好～');

    return lines.join('\n');
  }
}
