import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, count, desc, asc } from 'drizzle-orm';
import type {
  MockInterviewSession,
  MockInterviewMessage,
  CreateMockInterviewRequest,
  InterviewSessionListResponse,
} from '@shared/api.interface';
import { mockInterviewSession, mockInterviewMessage } from '@server/database/schema';

type InterviewType = 'technical' | 'hr' | 'project';
type Difficulty = 'easy' | 'medium' | 'hard';

const QUESTION_BANK: Record<InterviewType, Record<string, string[]>> = {
  technical: {
    '数据库/SQL': [
      '请解释数据库事务的ACID特性，并举例说明每个特性的含义。',
      '什么是索引？B树索引和哈希索引有什么区别？各自适用于什么场景？',
      '请说明SQL中的内连接、左连接、右连接和全连接的区别。',
    ],
    '大数据框架': [
      '请简述Hadoop的核心组件及其各自的作用。',
      'Spark和MapReduce相比有哪些优势？为什么Spark更快？',
      '请解释HDFS的架构和数据写入流程。',
    ],
    '编程语言': [
      '请解释面向对象编程的三大特性，并举例说明。',
      '什么是多线程？进程和线程有什么区别？',
      '请说明Java中的垃圾回收机制和常见的垃圾收集器。',
    ],
    '算法': [
      '请描述快速排序的原理，并分析其时间复杂度和空间复杂度。',
      '什么是动态规划？请举一个经典的动态规划问题并说明解法思路。',
      '请解释二叉树的前序、中序、后序遍历方式，并写出递归实现。',
    ],
    '系统设计': [
      '请设计一个高并发的短链接系统，说明核心思路和技术选型。',
      '如何设计一个秒杀系统？需要考虑哪些关键点？',
      '请设计一个分布式ID生成方案，说明优缺点。',
    ],
  },
  hr: {
    '自我介绍': [
      '请做一个简短的自我介绍，重点介绍你的核心优势和为什么适合这个岗位。',
      '用3分钟时间介绍一下你自己，包括你的背景、经历和职业目标。',
      '请介绍一下你的简历上没有提到但你觉得很重要的经历。',
    ],
    '优缺点': [
      '请说说你最大的优点和缺点分别是什么？',
      '你认为自己最大的优势是什么？举一个具体的例子说明。',
      '请分享一个你在工作或学习中遇到的最大挑战，以及你是如何克服的。',
    ],
    '职业规划': [
      '请谈谈你未来3-5年的职业规划。',
      '你对这个岗位有什么期待？你希望在这份工作中获得什么？',
      '你理想中的工作环境和团队是什么样的？',
    ],
    '为什么选我们': [
      '为什么选择我们公司？你对我们公司有什么了解？',
      '你为什么对这个岗位感兴趣？',
      '和其他公司相比，你觉得我们公司最吸引你的地方是什么？',
    ],
    '期望薪资': [
      '你的期望薪资是多少？为什么？',
      '你对薪资有什么要求？你是如何得出这个数字的？',
      '除了薪资，你还看重哪些福利待遇？',
    ],
  },
  project: {
    '项目介绍': [
      '请介绍一个你最熟悉或最引以为豪的项目，包括背景、目标和你的角色。',
      '请描述一个你参与过的最复杂的项目，你在其中承担了什么职责？',
      '分享一个你从0到1参与的项目，说说项目的整体架构和你负责的部分。',
    ],
    '技术难点': [
      '在你参与的项目中，遇到过最大的技术难点是什么？你是如何解决的？',
      '请分享一个你通过技术手段优化性能的经历，包括问题、方案和效果。',
      '项目中有没有遇到过线上故障？请描述一下排查和解决的过程。',
    ],
    '团队协作': [
      '请描述一次你和团队成员意见不一致的经历，最后是如何达成共识的？',
      '你在团队中通常扮演什么角色？请举例说明。',
      '如果项目进度落后了，你会怎么做来保证按时交付？',
    ],
    '项目成果': [
      '你参与的这个项目最终取得了什么成果？你为这个成果贡献了什么？',
      '请用数据说明你在项目中创造的价值或带来的改进。',
      '项目上线后有什么反馈？用户或业务方是如何评价的？',
    ],
    '学到了什么': [
      '通过这个项目，你最大的收获是什么？学到了哪些新东西？',
      '如果让你重新做一遍这个项目，你会在哪些地方做出不同的选择？',
      '这个项目对你后续的学习或工作有什么影响和启发？',
    ],
  },
};

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function adjustQuestionForDifficulty(question: string, difficulty: Difficulty): string {
  if (difficulty === 'easy') {
    return `${question}（可以从基础概念入手，不用太深入）`;
  }
  if (difficulty === 'hard') {
    return `${question}（请尽可能深入展开，结合实际场景和底层原理说明）`;
  }
  return question;
}

function generateQuestion(interviewType: InterviewType, difficulty: Difficulty, usedCategories: Set<string>): { question: string; category: string } {
  const categories: string[] = Object.keys(QUESTION_BANK[interviewType]);
  const availableCategories: string[] = categories.filter((c: string) => !usedCategories.has(c));
  const category: string = availableCategories.length > 0
    ? getRandomItem(availableCategories)
    : getRandomItem(categories);
  const questions: string[] = QUESTION_BANK[interviewType][category];
  const question: string = getRandomItem(questions);
  return {
    question: adjustQuestionForDifficulty(question, difficulty),
    category,
  };
}

function calculateScore(answer: string, difficulty: Difficulty): number {
  const length: number = answer.length;
  const baseScore: number = Math.min(60, Math.floor(length / 10));

  const keywords: string[] = [
    '因为', '所以', '首先', '其次', '然后', '最后',
    '举例', '例如', '比如', '具体来说',
    '优化', '性能', '效率', '提升',
    '架构', '设计', '方案', '解决',
    '团队', '协作', '沟通', '项目',
  ];
  let keywordCount: number = 0;
  for (const kw of keywords) {
    if (answer.includes(kw)) {
      keywordCount += 1;
    }
  }
  const keywordScore: number = Math.min(20, keywordCount * 2);

  const difficultyBonus: number = difficulty === 'hard' ? 10 : difficulty === 'medium' ? 5 : 0;

  const total: number = baseScore + keywordScore + difficultyBonus;
  return Math.max(60, Math.min(95, total));
}

function generateFeedback(score: number): { feedback: string; strengths: string; weaknesses: string; suggestions: string } {
  const level: string = score >= 85 ? '优秀' : score >= 75 ? '良好' : score >= 65 ? '一般' : '需要加强';

  const feedback: string = `本次模拟面试综合得分：${score}分，评级：${level}。整体表现${score >= 75 ? '不错' : '有待提升'}，继续加油！`;

  const strengthsList: string[] = [
    '回答思路清晰，逻辑层次分明',
    '能够结合具体案例说明问题',
    '技术基础扎实，概念理解准确',
    '表达流畅，沟通能力较好',
    '对问题有自己的思考和见解',
  ];
  const weaknessesList: string[] = [
    '部分问题回答不够深入，缺少细节支撑',
    '技术深度还有提升空间，可以多关注底层原理',
    '回答结构可以更清晰，建议分点阐述',
    '案例描述稍显简略，建议补充数据和结果',
    '部分知识点掌握不够牢固，需要加强复习',
  ];
  const suggestionsList: string[] = [
    '建议多做模拟面试，提升临场表达能力',
    '加强系统设计和算法方面的练习',
    '可以尝试用STAR法则组织回答，让结构更清晰',
    '多关注行业最新技术动态，拓宽技术视野',
    '针对薄弱知识点进行专项复习和练习',
  ];

  const pickRandom = (arr: string[], n: number): string => {
    const shuffled: string[] = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n');
  };

  const strengths: string = pickRandom(strengthsList, 3);
  const weaknesses: string = pickRandom(weaknessesList, 2);
  const suggestions: string = pickRandom(suggestionsList, 3);

  return { feedback, strengths, weaknesses, suggestions };
}

function rowToSession(row: typeof mockInterviewSession.$inferSelect): MockInterviewSession {
  return {
    id: row.id,
    jobType: row.jobType,
    interviewType: row.interviewType as MockInterviewSession['interviewType'],
    difficulty: row.difficulty as MockInterviewSession['difficulty'],
    status: row.status as MockInterviewSession['status'],
    score: row.score ?? undefined,
    feedback: row.feedback ?? undefined,
    strengths: row.strengths ?? undefined,
    weaknesses: row.weaknesses ?? undefined,
    suggestions: row.suggestions ?? undefined,
    totalQuestions: row.totalQuestions,
    currentQuestionIndex: row.currentQuestionIndex,
    startedAt: row.startedAt ? row.startedAt.toISOString() : undefined,
    completedAt: row.completedAt ? row.completedAt.toISOString() : undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToMessage(row: typeof mockInterviewMessage.$inferSelect): MockInterviewMessage {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role as MockInterviewMessage['role'],
    content: row.content,
    questionIndex: row.questionIndex,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class MockInterviewService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getSessionList(
    userId: string,
    page: number,
    pageSize: number,
    status?: string,
    interviewType?: string,
  ): Promise<InterviewSessionListResponse> {
    const conditions = [eq(mockInterviewSession.createdBy, userId)];
    if (status) {
      conditions.push(eq(mockInterviewSession.status, status));
    }
    if (interviewType) {
      conditions.push(eq(mockInterviewSession.interviewType, interviewType));
    }

    const whereClause = and(...conditions);
    const offset: number = (page - 1) * pageSize;

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(mockInterviewSession)
        .where(whereClause)
        .orderBy(desc(mockInterviewSession.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(mockInterviewSession)
        .where(whereClause),
    ]);

    const items: MockInterviewSession[] = rows.map(
      (row: typeof mockInterviewSession.$inferSelect) => rowToSession(row),
    );
    const total: number = Number(countResult[0]?.count ?? 0);

    return { items, total };
  }

  async createSession(
    userId: string,
    dto: CreateMockInterviewRequest,
  ): Promise<MockInterviewSession> {
    const totalQuestions: number = dto.totalQuestions ?? 5;
    const [inserted] = await this.db
      .insert(mockInterviewSession)
      .values({
        jobType: dto.jobType,
        interviewType: dto.interviewType,
        difficulty: dto.difficulty,
        status: 'pending',
        totalQuestions,
        currentQuestionIndex: 0,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return rowToSession(inserted);
  }

  async getSessionById(userId: string, id: string): Promise<MockInterviewSession> {
    const [row] = await this.db
      .select()
      .from(mockInterviewSession)
      .where(eq(mockInterviewSession.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException('面试记录不存在');
    }
    if (row.createdBy !== userId) {
      throw new ForbiddenException('无权限访问该面试记录');
    }

    return rowToSession(row);
  }

  async getMessages(userId: string, sessionId: string): Promise<MockInterviewMessage[]> {
    await this.getSessionById(userId, sessionId);

    const rows = await this.db
      .select()
      .from(mockInterviewMessage)
      .where(eq(mockInterviewMessage.sessionId, sessionId))
      .orderBy(asc(mockInterviewMessage.sortOrder));

    return rows.map(
      (row: typeof mockInterviewMessage.$inferSelect) => rowToMessage(row),
    );
  }

  async startInterview(userId: string, id: string): Promise<{ session: MockInterviewSession; firstQuestion: string }> {
    const session: MockInterviewSession = await this.getSessionById(userId, id);

    if (session.status !== 'pending') {
      throw new BadRequestException('该面试已开始或已结束');
    }

    const { question } = generateQuestion(
      session.interviewType,
      session.difficulty,
      new Set<string>(),
    );

    const now: Date = new Date();

    const [updatedSession] = await this.db
      .update(mockInterviewSession)
      .set({
        status: 'in_progress',
        currentQuestionIndex: 1,
        startedAt: now,
        updatedBy: userId,
      })
      .where(eq(mockInterviewSession.id, id))
      .returning();

    await this.db.insert(mockInterviewMessage).values([
      {
        sessionId: id,
        role: 'system',
        content: `面试开始，共${session.totalQuestions}道题，加油！`,
        questionIndex: 0,
        sortOrder: 0,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        sessionId: id,
        role: 'interviewer',
        content: question,
        questionIndex: 1,
        sortOrder: 1,
        createdBy: userId,
        updatedBy: userId,
      },
    ]);

    return {
      session: rowToSession(updatedSession),
      firstQuestion: question,
    };
  }

  async submitAnswer(
    userId: string,
    id: string,
    answer: string,
  ): Promise<{ nextQuestion?: string; isFinished: boolean; score?: number; feedback?: string }> {
    const session: MockInterviewSession = await this.getSessionById(userId, id);

    if (session.status !== 'in_progress') {
      throw new BadRequestException('面试未在进行中');
    }

    const currentIndex: number = session.currentQuestionIndex;

    const messages: MockInterviewMessage[] = await this.getMessages(userId, id);
    const currentMaxSort: number = messages.length > 0
      ? Math.max(...messages.map((m: MockInterviewMessage) => m.sortOrder))
      : 0;

    await this.db.insert(mockInterviewMessage).values({
      sessionId: id,
      role: 'candidate',
      content: answer,
      questionIndex: currentIndex,
      sortOrder: currentMaxSort + 1,
      createdBy: userId,
      updatedBy: userId,
    });

    if (currentIndex >= session.totalQuestions) {
      const score: number = calculateScore(answer, session.difficulty);
      const { feedback, strengths, weaknesses, suggestions } = generateFeedback(score);
      const now: Date = new Date();

      await this.db.insert(mockInterviewMessage).values({
        sessionId: id,
        role: 'system',
        content: `面试结束！得分：${score}分。\n${feedback}`,
        questionIndex: currentIndex + 1,
        sortOrder: currentMaxSort + 2,
        createdBy: userId,
        updatedBy: userId,
      });

      await this.db
        .update(mockInterviewSession)
        .set({
          status: 'completed',
          score,
          feedback,
          strengths,
          weaknesses,
          suggestions,
          completedAt: now,
          updatedBy: userId,
        })
        .where(eq(mockInterviewSession.id, id));

      return {
        isFinished: true,
        score,
        feedback,
      };
    }

    const usedCategories: Set<string> = new Set<string>();
    const { question: nextQuestion } = generateQuestion(
      session.interviewType,
      session.difficulty,
      usedCategories,
    );

    await this.db
      .update(mockInterviewSession)
      .set({
        currentQuestionIndex: currentIndex + 1,
        updatedBy: userId,
      })
      .where(eq(mockInterviewSession.id, id));

    await this.db.insert(mockInterviewMessage).values({
      sessionId: id,
      role: 'interviewer',
      content: nextQuestion,
      questionIndex: currentIndex + 1,
      sortOrder: currentMaxSort + 2,
      createdBy: userId,
      updatedBy: userId,
    });

    return {
      nextQuestion,
      isFinished: false,
    };
  }

  async deleteSession(userId: string, id: string): Promise<void> {
    await this.getSessionById(userId, id);
    await this.db
      .delete(mockInterviewSession)
      .where(eq(mockInterviewSession.id, id));
  }
}
