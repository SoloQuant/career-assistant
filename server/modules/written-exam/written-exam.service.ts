import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count, inArray, sql } from 'drizzle-orm';
import {
  writtenExamQuestion,
  writtenExamRecord,
  wrongQuestion,
} from '@server/database/schema';
import type {
  ExamQuestion,
  ExamQuestionListResponse,
  ExamRecord,
  ExamRecordListResponse,
  StartExamRequest,
  SubmitExamRequest,
} from '@shared/api.interface';

type QuestionRow = typeof writtenExamQuestion.$inferSelect;
type RecordRow = typeof writtenExamRecord.$inferSelect;
type AnswerItem = { questionId: string; userAnswer: string; isCorrect: boolean };

@Injectable()
export class WrittenExamService {
  private readonly logger = new Logger(WrittenExamService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private mapQuestion(row: QuestionRow): ExamQuestion {
    return {
      id: row.id,
      category: row.category,
      subCategory: row.subCategory ?? undefined,
      questionType: row.questionType as ExamQuestion['questionType'],
      title: row.title,
      options: (row.options as { label: string; value: string }[]) ?? [],
      correctAnswer: row.correctAnswer,
      analysis: row.analysis ?? undefined,
      difficulty: row.difficulty as ExamQuestion['difficulty'],
      score: row.score,
      timeLimitSeconds: row.timeLimitSeconds ?? undefined,
      tags: row.tags ?? [],
    };
  }

  private mapRecord(row: RecordRow): ExamRecord {
    const answers: AnswerItem[] = (row.answers as AnswerItem[]) ?? [];
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      totalScore: row.totalScore,
      userScore: row.userScore,
      correctCount: row.correctCount,
      totalCount: row.totalCount,
      timeSpentSeconds: row.timeSpentSeconds,
      answers,
      status: row.status as ExamRecord['status'],
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getQuestionList(params: {
    page: number;
    pageSize: number;
    category?: string;
    subCategory?: string;
    difficulty?: string;
  }): Promise<ExamQuestionListResponse> {
    const { page, pageSize, category, subCategory, difficulty } = params;

    const conditions = [];
    if (category) conditions.push(eq(writtenExamQuestion.category, category));
    if (subCategory) conditions.push(eq(writtenExamQuestion.subCategory, subCategory));
    if (difficulty) conditions.push(eq(writtenExamQuestion.difficulty, difficulty));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const totalQuery = this.db.select({ count: count() }).from(writtenExamQuestion);
    const totalResult = where
      ? await totalQuery.where(where)
      : await totalQuery;
    const total: number = Number(totalResult[0]?.count ?? 0);

    const offset = (page - 1) * pageSize;
    const rowsQuery = this.db
      .select()
      .from(writtenExamQuestion)
      .orderBy(desc(writtenExamQuestion.createdAt))
      .limit(pageSize)
      .offset(offset);
    const rows: QuestionRow[] = where
      ? await rowsQuery.where(where)
      : await rowsQuery;

    const items: ExamQuestion[] = rows.map((row: QuestionRow) => this.mapQuestion(row));

    return { items, total };
  }

  async getQuestionById(id: string): Promise<ExamQuestion | null> {
    const rows: QuestionRow[] = await this.db
      .select()
      .from(writtenExamQuestion)
      .where(eq(writtenExamQuestion.id, id))
      .limit(1);
    if (rows.length === 0) return null;
    return this.mapQuestion(rows[0]);
  }

  async createQuestion(
    userId: string,
    data: Omit<ExamQuestion, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ExamQuestion> {
    const inserted = await this.db
      .insert(writtenExamQuestion)
      .values({
        category: data.category,
        subCategory: data.subCategory ?? null,
        questionType: data.questionType,
        title: data.title,
        options: data.options as unknown as string[],
        correctAnswer: data.correctAnswer,
        analysis: data.analysis ?? null,
        difficulty: data.difficulty,
        score: data.score,
        timeLimitSeconds: data.timeLimitSeconds ?? null,
        tags: data.tags,
      })
      .returning();
    return this.mapQuestion(inserted[0]);
  }

  async getRecordList(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<ExamRecordListResponse> {
    const where = sql`(${writtenExamRecord.createdBy}).user_id = ${userId}`;

    const totalResult = await this.db
      .select({ count: count() })
      .from(writtenExamRecord)
      .where(where);
    const total: number = Number(totalResult[0]?.count ?? 0);

    const offset = (page - 1) * pageSize;
    const rows: RecordRow[] = await this.db
      .select()
      .from(writtenExamRecord)
      .where(where)
      .orderBy(desc(writtenExamRecord.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items: ExamRecord[] = rows.map((row: RecordRow) => this.mapRecord(row));

    return { items, total };
  }

  async getRecordDetail(userId: string, id: string): Promise<ExamRecord & {
    questions: ExamQuestion[];
  }> {
    const rows: RecordRow[] = await this.db
      .select()
      .from(writtenExamRecord)
      .where(eq(writtenExamRecord.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('笔试记录不存在');
    }

    const record: RecordRow = rows[0];
    const ownerId = record.createdBy;
    if (ownerId !== userId) {
      throw new ForbiddenException('无权查看该笔试记录');
    }

    const answers: AnswerItem[] = (record.answers as AnswerItem[]) ?? [];
    const questionIds: string[] = answers.map((a: AnswerItem) => a.questionId);

    let questions: ExamQuestion[] = [];
    if (questionIds.length > 0) {
      const questionRows: QuestionRow[] = await this.db
        .select()
        .from(writtenExamQuestion)
        .where(inArray(writtenExamQuestion.id, questionIds));
      const questionMap = new Map<string, ExamQuestion>();
      for (const row of questionRows) {
        questionMap.set(row.id, this.mapQuestion(row));
      }
      questions = questionIds
        .map((qid: string) => questionMap.get(qid))
        .filter((q): q is ExamQuestion => q !== undefined);
    }

    return { ...this.mapRecord(record), questions };
  }

  async startExam(
    userId: string,
    dto: StartExamRequest,
  ): Promise<{ recordId: string; questions: ExamQuestion[] }> {
    const { category, title, questionIds } = dto;

    let selectedQuestionIds: string[] = [];
    if (questionIds && questionIds.length > 0) {
      selectedQuestionIds = questionIds;
    } else {
      // 从题库随机抽10道对应类别的题
      const randomRows: QuestionRow[] = await this.db
        .select()
        .from(writtenExamQuestion)
        .where(eq(writtenExamQuestion.category, category))
        .orderBy(sql`random()`)
        .limit(10);
      if (randomRows.length === 0) {
        throw new BadRequestException('该分类下暂无题目');
      }
      selectedQuestionIds = randomRows.map((row: QuestionRow) => row.id);
    }

    // 读取题目详情
    const questionRows: QuestionRow[] = await this.db
      .select()
      .from(writtenExamQuestion)
      .where(inArray(writtenExamQuestion.id, selectedQuestionIds));

    if (questionRows.length === 0) {
      throw new BadRequestException('未找到有效题目');
    }

    const questions: ExamQuestion[] = questionRows.map((row: QuestionRow) =>
      this.mapQuestion(row),
    );

    const totalScore: number = questions.reduce(
      (sum: number, q: ExamQuestion) => sum + q.score,
      0,
    );
    const totalCount: number = questions.length;

    const initialAnswers: AnswerItem[] = questions.map((q: ExamQuestion) => ({
      questionId: q.id,
      userAnswer: '',
      isCorrect: false,
    }));

    const inserted = await this.db
      .insert(writtenExamRecord)
      .values({
        title,
        category,
        totalScore,
        userScore: 0,
        correctCount: 0,
        totalCount,
        timeSpentSeconds: 0,
        answers: initialAnswers as unknown as string[],
        status: 'in_progress',
        createdBy: userId,
      })
      .returning();

    return { recordId: inserted[0].id, questions };
  }

  async submitExam(
    userId: string,
    dto: SubmitExamRequest,
  ): Promise<ExamRecord> {
    const { recordId, answers, timeSpentSeconds } = dto;

    // 查找记录并校验归属
    const rows: RecordRow[] = await this.db
      .select()
      .from(writtenExamRecord)
      .where(eq(writtenExamRecord.id, recordId))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('笔试记录不存在');
    }

    const record: RecordRow = rows[0];
    const ownerId = record.createdBy;
    if (ownerId !== userId) {
      throw new ForbiddenException('无权提交该笔试');
    }

    if (record.status === 'finished') {
      throw new BadRequestException('该笔试已提交');
    }

    // 读取所有相关题目
    const answerMap = new Map<string, string>();
    for (const a of answers) {
      answerMap.set(a.questionId, a.userAnswer);
    }
    const questionIds: string[] = Array.from(answerMap.keys());

    const questionRows: QuestionRow[] = questionIds.length > 0
      ? await this.db
          .select()
          .from(writtenExamQuestion)
          .where(inArray(writtenExamQuestion.id, questionIds))
      : [];

    const correctAnswerMap = new Map<string, { correct: string; score: number; title: string; analysis?: string; category: string; tags: string[] }>();
    for (const row of questionRows) {
      correctAnswerMap.set(row.id, {
        correct: row.correctAnswer,
        score: row.score,
        title: row.title,
        analysis: row.analysis ?? undefined,
        category: row.category,
        tags: row.tags ?? [],
      });
    }

    // 判分
    let correctCount = 0;
    let userScore = 0;
    const gradedAnswers: AnswerItem[] = [];
    const wrongQuestionsToAdd: Array<{
      questionId: string;
      title: string;
      userAnswer: string;
      correctAnswer: string;
      analysis?: string;
      category: string;
      tags: string[];
    }> = [];

    for (const a of answers) {
      const qInfo = correctAnswerMap.get(a.questionId);
      if (!qInfo) continue;

      const isCorrect = this.checkAnswer(a.userAnswer, qInfo.correct);
      gradedAnswers.push({
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        isCorrect,
      });

      if (isCorrect) {
        correctCount += 1;
        userScore += qInfo.score;
      } else {
        wrongQuestionsToAdd.push({
          questionId: a.questionId,
          title: qInfo.title,
          userAnswer: a.userAnswer,
          correctAnswer: qInfo.correct,
          analysis: qInfo.analysis,
          category: qInfo.category,
          tags: qInfo.tags,
        });
      }
    }

    // 更新记录
    const updated = await this.db
      .update(writtenExamRecord)
      .set({
        answers: gradedAnswers as unknown as string[],
        userScore,
        correctCount,
        timeSpentSeconds,
        status: 'finished',
      })
      .where(eq(writtenExamRecord.id, recordId))
      .returning();

    // 错题本自动收录
    if (wrongQuestionsToAdd.length > 0) {
      await this.addWrongQuestions(userId, wrongQuestionsToAdd);
    }

    return this.mapRecord(updated[0]);
  }

  private checkAnswer(userAnswer: string, correctAnswer: string): boolean {
    if (!userAnswer) return false;
    const normalizedUser = userAnswer.trim();
    const normalizedCorrect = correctAnswer.trim();
    if (normalizedUser === normalizedCorrect) return true;

    // 多选题：尝试按逗号/分号分割后排序比较
    const splitChars = [',', ';', '、'];
    for (const sep of splitChars) {
      if (normalizedCorrect.includes(sep) || normalizedUser.includes(sep)) {
        const userArr = normalizedUser
          .split(sep)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
          .sort();
        const correctArr = normalizedCorrect
          .split(sep)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
          .sort();
        if (
          userArr.length === correctArr.length &&
          userArr.every((v: string, i: number) => v === correctArr[i])
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private async addWrongQuestions(
    userId: string,
    wrongList: Array<{
      questionId: string;
      title: string;
      userAnswer: string;
      correctAnswer: string;
      analysis?: string;
      category: string;
      tags: string[];
    }>,
  ): Promise<void> {
    for (const item of wrongList) {
      // 查找是否已存在该错题（同一用户 + 同一来源题目）
      const existing = await this.db
        .select()
        .from(wrongQuestion)
        .where(
          and(
            eq(wrongQuestion.sourceType, 'exam'),
            eq(wrongQuestion.sourceId, item.questionId),
            sql`(${wrongQuestion.createdBy}).user_id = ${userId}`,
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // 已存在：增加错误次数，更新最后错误时间和用户答案
        const record = existing[0];
        await this.db
          .update(wrongQuestion)
          .set({
            wrongCount: record.wrongCount + 1,
            lastWrongAt: new Date(),
            userAnswer: item.userAnswer,
            isMastered: false,
          })
          .where(eq(wrongQuestion.id, record.id));
      } else {
        // 不存在：新增
        await this.db.insert(wrongQuestion).values({
          sourceType: 'exam',
          sourceId: item.questionId,
          questionTitle: item.title,
          questionContent: item.title,
          userAnswer: item.userAnswer,
          correctAnswer: item.correctAnswer,
          analysis: item.analysis ?? null,
          category: item.category,
          tags: item.tags,
        });
      }
    }
  }
}
