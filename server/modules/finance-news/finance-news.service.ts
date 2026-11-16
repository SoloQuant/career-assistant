import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import {
  eq,
  desc,
  asc,
  and,
  or,
  count,
  ilike,
  gte,
  lt,
  not,
  exists,
  sql,
} from 'drizzle-orm';
import Parser from 'rss-parser';
import {
  newsArticleTable,
  newsReadStatusTable,
  newsFetchLogTable,
} from '@server/database/schema';
import type {
  FinanceNewsItem,
  FinanceNewsListResponse,
  NewsRefreshStatus,
} from '@shared/api.interface';

type SortBy = 'publish_date' | 'importance';
type SortOrder = 'desc' | 'asc';

type NewsCategory =
  | 'finance'
  | 'technology'
  | 'business'
  | 'policy'
  | 'industry'
  | 'market'
  | 'general';

interface RssSourceConfig {
  name: string;
  url: string;
  category: NewsCategory;
}

const RSS_SOURCES: RssSourceConfig[] = [
  { name: '中国新闻网', url: 'https://www.chinanews.com.cn/rss/scroll-news.xml', category: 'general' },
  { name: '中新网财经', url: 'https://www.chinanews.com.cn/rss/finance.xml', category: 'finance' },
  { name: '钛媒体', url: 'https://www.tmtpost.com/rss.xml', category: 'technology' },
  { name: '爱范儿', url: 'https://www.ifanr.com/feed', category: 'technology' },
  { name: '雷锋网', url: 'https://www.leiphone.com/feed', category: 'technology' },
];

interface SinaRollingSourceConfig {
  name: string;
  lid: number;
  category: NewsCategory;
}

const SINA_ROLLING_SOURCES: SinaRollingSourceConfig[] = [
  { name: '新浪财经', lid: 2509, category: 'finance' },
  { name: '新浪科技', lid: 2515, category: 'technology' },
  { name: '新浪国内', lid: 2510, category: 'policy' },
  { name: '新浪国际', lid: 2511, category: 'general' },
];

interface KeywordGroup {
  category: 'policy' | 'market' | 'industry' | 'company' | 'economy_data';
  keywords: string[];
  titleWeight: number;
  contentWeight: number;
}

const IMPORTANCE_KEYWORDS: KeywordGroup[] = [
  {
    category: 'policy',
    keywords: ['国务院', '央行', '财政部', '证监会', '银保监会', '政策', '监管', '新规', '改革', '出台', '部署', '通知', '决定', '意见', '方案'],
    titleWeight: 8,
    contentWeight: 4,
  },
  {
    category: 'market',
    keywords: ['A股', '股市', '大盘', '沪指', '深成指', '创业板', '指数', '上涨', '下跌', '涨停', '跌停', '牛市', '熊市', '北向资金', '成交额', 'IPO'],
    titleWeight: 8,
    contentWeight: 4,
  },
  {
    category: 'industry',
    keywords: ['重磅', '突发', '重大', '首次', '突破', '创新', '万亿', '千亿', '百亿', '裁员', '破产', '收购', '并购', '上市', '退市'],
    titleWeight: 8,
    contentWeight: 4,
  },
  {
    category: 'company',
    keywords: ['华为', '阿里', '阿里巴巴', '腾讯', '字节', '百度', '京东', '美团', '比亚迪', '宁德时代', '小米', '苹果', '特斯拉', 'OpenAI', '微软', '谷歌'],
    titleWeight: 6,
    contentWeight: 3,
  },
  {
    category: 'economy_data',
    keywords: ['GDP', 'CPI', 'PPI', 'PMI', '失业率', '进出口', '增速', '通胀', '通缩', '降息', '加息', '降准', 'MLF', 'LPR', '汇率'],
    titleWeight: 6,
    contentWeight: 3,
  },
];

interface ScoredImportance {
  isImportant: boolean;
  importanceScore: number;
  importantCategory: string;
}

interface ParsedRssItem {
  title: string;
  link: string;
  summary: string;
  content: string;
  pubDate?: string;
}

@Injectable()
export class FinanceNewsService implements OnModuleInit {
  private readonly logger = new Logger(FinanceNewsService.name);
  private readonly parser = new Parser();
  private readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly httpService: HttpService,
  ) {}

  onModuleInit(): void {
    setTimeout(() => {
      this.logger.log('启动后首次抓取新闻...');
      this.fetchAllSources().catch((err: Error) => {
        this.logger.error('启动首次抓取失败', err.stack ?? err.message);
      });
    }, 5000);
  }

  @Cron('*/5 * * * *')
  async handleScheduledFetch(): Promise<void> {
    this.logger.log('[定时任务] 开始抓取新闻');
    try {
      const totalNew: number = await this.fetchAllSources();
      this.logger.log(`[定时任务] 抓取完成，新增 ${totalNew} 条新闻`);
    } catch (error) {
      this.logger.error('[定时任务] 抓取失败', error as Error);
    }
  }

  private scoreImportance(title: string, summary: string, content: string): ScoredImportance {
    const combinedContent: string = `${summary} ${content}`;
    const categoryScores: Record<string, number> = {};

    for (const group of IMPORTANCE_KEYWORDS) {
      let score: number = 0;
      for (const kw of group.keywords) {
        // Title hits have higher weight
        const titleLower: string = title.toLowerCase();
        const kwLower: string = kw.toLowerCase();
        if (titleLower.includes(kwLower)) {
          score += group.titleWeight;
        }
        // Content/summary hits
        if (combinedContent.toLowerCase().includes(kwLower)) {
          score += group.contentWeight;
        }
      }
      // Normalize to 0-40 range per category (rough cap)
      categoryScores[group.category] = Math.min(score * 4, 40);
    }

    let totalScore: number = 0;
    let topCategory: string = 'policy';
    let topScore: number = 0;

    for (const [cat, s] of Object.entries(categoryScores)) {
      totalScore += s;
      if (s > topScore) {
        topScore = s;
        topCategory = cat;
      }
    }

    // Cap at 100
    const finalScore: number = Math.min(Math.round(totalScore), 100);

    return {
      isImportant: finalScore >= 20,
      importanceScore: finalScore,
      importantCategory: topScore > 0 ? topCategory : 'general',
    };
  }

  private stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }

  private async insertArticle(
    item: ParsedRssItem,
    sourceName: string,
    category: NewsCategory,
    publishDate: Date,
  ): Promise<boolean> {
    if (!item.title || !item.link) return false;
    const { isImportant, importanceScore, importantCategory } =
      this.scoreImportance(item.title, item.summary, item.content);

    const result = await this.db
      .insert(newsArticleTable)
      .values({
        title: item.title,
        summary: item.summary,
        content: item.content,
        source: sourceName,
        sourceUrl: item.link,
        category,
        tags: [],
        isImportant,
        importanceScore,
        importantCategory: isImportant ? importantCategory : null,
        publishDate,
      })
      .onConflictDoNothing({ target: [newsArticleTable.sourceUrl] })
      .returning({ id: newsArticleTable.id });

    return result.length > 0;
  }

  async fetchFromSource(sourceName: string): Promise<number> {
    const source: RssSourceConfig | undefined = RSS_SOURCES.find(
      (s) => s.name === sourceName,
    );
    if (!source) {
      this.logger.warn(`未知RSS新闻源：${sourceName}`);
      return 0;
    }

    try {
      const { data: xmlData } = await this.httpService.axiosRef.get(source.url, {
        headers: { 'User-Agent': this.USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml' },
        timeout: 15000,
      });
      const feed = await this.parser.parseString(xmlData);
      const items: ParsedRssItem[] = (feed.items ?? []).map((item) => {
        const title: string = this.stripHtml(item.title ?? '');
        const link: string = item.link ?? '';
        const rawSummary: string =
          item.contentSnippet ?? item.summary ?? item.content ?? '';
        const rawContent: string =
          (item as { 'content:encoded'?: string })['content:encoded'] ??
          item.content ??
          '';
        const summary: string = this.stripHtml(rawSummary) || title;
        const content: string = this.stripHtml(rawContent) || summary;
        return {
          title,
          link,
          summary: summary.slice(0, 500),
          content: content.slice(0, 5000),
          pubDate: item.pubDate,
        };
      });

      let newCount: number = 0;
      for (const item of items) {
        const publishDate: Date = item.pubDate
          ? new Date(item.pubDate)
          : new Date();
        if (Number.isNaN(publishDate.getTime())) {
          continue;
        }
        const inserted = await this.insertArticle(
          item,
          source.name,
          source.category,
          publishDate,
        );
        if (inserted) newCount += 1;
      }

      this.logger.log(`抓取 ${source.name} 完成，新增 ${newCount} 条`);
      await this.writeFetchLog(source.name, 'success', newCount);
      return newCount;
    } catch (error) {
      const errMsg: string = error instanceof Error ? error.message : String(error);
      this.logger.error(`抓取 ${source.name} 失败：${errMsg}`);
      await this.writeFetchLog(source.name, 'failed', 0, errMsg);
      return 0;
    }
  }

  async fetchFromSinaSource(sourceName: string): Promise<number> {
    const source: SinaRollingSourceConfig | undefined = SINA_ROLLING_SOURCES.find(
      (s) => s.name === sourceName,
    );
    if (!source) {
      this.logger.warn(`未知新浪新闻源：${sourceName}`);
      return 0;
    }

    try {
      const url = `https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=${source.lid}&num=30&versionNumber=1.2.4&format=json`;
      const { data } = await this.httpService.axiosRef.get(url, {
        headers: { 'User-Agent': this.USER_AGENT, Accept: 'application/json' },
        timeout: 10000,
      });

      const list = data?.result?.data ?? [];
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error(`新浪 ${source.name} 返回空数据`);
      }

      let newCount = 0;
      for (const entry of list) {
        const title: string = this.stripHtml(entry.title ?? '');
        const link: string = entry.url ?? '';
        const intro: string = this.stripHtml(entry.intro ?? entry.summary ?? '');
        const ctime: number = Number(entry.ctime ?? 0);
        const mediaName: string = entry.media_name ?? source.name;

        if (!title || !link) continue;

        const publishDate: Date = ctime > 0 ? new Date(ctime * 1000) : new Date();
        if (Number.isNaN(publishDate.getTime())) continue;

        const summary: string = intro.slice(0, 500) || title;
        const content: string = intro.slice(0, 2000) || summary;

        const inserted = await this.insertArticle(
          { title, link, summary, content, pubDate: publishDate.toISOString() },
          source.name,
          source.category,
          publishDate,
        );
        if (inserted) newCount += 1;
      }

      this.logger.log(`抓取 ${source.name} 完成，新增 ${newCount} 条`);
      await this.writeFetchLog(source.name, 'success', newCount);
      return newCount;
    } catch (error) {
      const errMsg: string = error instanceof Error ? error.message : String(error);
      this.logger.error(`抓取 ${source.name} 失败：${errMsg}`);
      await this.writeFetchLog(source.name, 'failed', 0, errMsg);
      return 0;
    }
  }

  async fetchAllSources(): Promise<number> {
    const rssPromises = RSS_SOURCES.map((src: RssSourceConfig) =>
      this.fetchFromSource(src.name),
    );
    const sinaPromises = SINA_ROLLING_SOURCES.map((src: SinaRollingSourceConfig) =>
      this.fetchFromSinaSource(src.name),
    );

    const results: PromiseSettledResult<number>[] = await Promise.allSettled([
      ...rssPromises,
      ...sinaPromises,
    ]);

    let totalNew: number = 0;
    let successCount: number = 0;
    let failCount: number = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalNew += result.value;
        successCount += 1;
      } else {
        failCount += 1;
        this.logger.error('新闻源抓取异常', result.reason);
      }
    }

    this.logger.log(
      `全部源抓取完成：成功 ${successCount} 个，失败 ${failCount} 个，新增 ${totalNew} 条`,
    );
    await this.writeFetchLog('all', 'success', totalNew);
    return totalNew;
  }

  private toFinanceNewsItem(row: typeof newsArticleTable.$inferSelect): FinanceNewsItem {
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      content: row.content,
      source: row.source,
      sourceUrl: row.sourceUrl,
      category: row.category,
      tags: row.tags ?? [],
      isImportant: row.isImportant,
      importanceScore: row.importanceScore,
      importantCategory: row.importantCategory ?? undefined,
      publishDate: row.publishDate.toISOString(),
    };
  }

  private getTodayRange(): { startIso: string; endIso: string } {
    const now: Date = new Date();
    const shanghaiOffsetMs: number = 8 * 60 * 60 * 1000;
    const shanghaiTime: number = now.getTime() + shanghaiOffsetMs;
    const shanghaiDate: Date = new Date(shanghaiTime);
    const year: number = shanghaiDate.getUTCFullYear();
    const month: number = shanghaiDate.getUTCMonth();
    const day: number = shanghaiDate.getUTCDate();
    const startOfDay: Date = new Date(Date.UTC(year, month, day) - shanghaiOffsetMs);
    const endOfDay: Date = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    return {
      startIso: startOfDay.toISOString(),
      endIso: endOfDay.toISOString(),
    };
  }

  async getList(params: {
    page: number;
    pageSize: number;
    source?: string;
    category?: string;
    keyword?: string;
    sortBy: SortBy;
    sortOrder: SortOrder;
  }): Promise<FinanceNewsListResponse> {
    const { page, pageSize, source, category, keyword, sortBy, sortOrder } = params;
    const offset: number = (page - 1) * pageSize;

    const conditions = [];
    if (source && source !== 'all') {
      conditions.push(eq(newsArticleTable.source, source));
    }
    if (category && category !== 'all') {
      conditions.push(eq(newsArticleTable.category, category));
    }
    if (keyword) {
      conditions.push(
        or(
          ilike(newsArticleTable.title, `%${keyword}%`),
          ilike(newsArticleTable.summary, `%${keyword}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderCol = sortBy === 'importance'
      ? newsArticleTable.importanceScore
      : newsArticleTable.publishDate;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const [itemsResult, countResult] = await Promise.all([
      this.db
        .select()
        .from(newsArticleTable)
        .where(whereClause)
        .orderBy(orderFn(orderCol))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(newsArticleTable)
        .where(whereClause),
    ]);

    const total: number = Number(countResult[0]?.count ?? 0);

    return {
      items: itemsResult.map((row) => this.toFinanceNewsItem(row)),
      total,
      page,
      pageSize,
      hasMore: offset + itemsResult.length < total,
    };
  }

  async getImportantNews(params: {
    page: number;
    pageSize: number;
    importantCategory?: string;
    unreadOnly?: boolean;
    userId?: string;
  }): Promise<FinanceNewsListResponse> {
    const { page, pageSize, importantCategory, unreadOnly, userId } = params;
    const offset: number = (page - 1) * pageSize;

    const conditions = [eq(newsArticleTable.isImportant, true)];
    if (importantCategory && importantCategory !== 'all') {
      conditions.push(eq(newsArticleTable.importantCategory, importantCategory));
    }

    if (unreadOnly && userId) {
      const readSubquery = this.db
        .select({ id: newsReadStatusTable.id })
        .from(newsReadStatusTable)
        .where(
          and(
            eq(newsReadStatusTable.articleId, newsArticleTable.id),
            eq(newsReadStatusTable.userId, userId),
          ),
        );
      conditions.push(not(exists(readSubquery)));
    }

    const whereClause = and(...conditions);

    const [itemsResult, countResult] = await Promise.all([
      this.db
        .select()
        .from(newsArticleTable)
        .where(whereClause)
        .orderBy(desc(newsArticleTable.publishDate))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(newsArticleTable)
        .where(whereClause),
    ]);

    const total: number = Number(countResult[0]?.count ?? 0);

    return {
      items: itemsResult.map((row) => this.toFinanceNewsItem(row)),
      total,
      page,
      pageSize,
      hasMore: offset + itemsResult.length < total,
    };
  }

  async markAsRead(articleId: string, userId: string): Promise<{ success: boolean }> {
    await this.db
      .insert(newsReadStatusTable)
      .values({
        articleId,
        userId,
      })
      .onConflictDoNothing({
        target: [newsReadStatusTable.userId, newsReadStatusTable.articleId],
      });
    return { success: true };
  }

  async markAllImportantRead(userId: string): Promise<{ success: boolean; count: number }> {
    const importantArticles = await this.db
      .select({ id: newsArticleTable.id })
      .from(newsArticleTable)
      .where(eq(newsArticleTable.isImportant, true));

    if (importantArticles.length === 0) {
      return { success: true, count: 0 };
    }

    const articleIds: string[] = importantArticles.map((a) => a.id);

    const existingReads = await this.db
      .select({ articleId: newsReadStatusTable.articleId })
      .from(newsReadStatusTable)
      .where(
        and(
          eq(newsReadStatusTable.userId, userId),
          sql`${newsReadStatusTable.articleId} = ANY(ARRAY[${sql.join(
            articleIds.map((id) => sql`${id}`),
            sql`, `,
          )}]::uuid[])`,
        ),
      );

    const existingIds: Set<string> = new Set(
      existingReads.map((r) => r.articleId),
    );
    const newIds: string[] = articleIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) {
      return { success: true, count: 0 };
    }

    const values = newIds.map((id) => ({
      articleId: id,
      userId,
    }));

    await this.db.insert(newsReadStatusTable).values(values).onConflictDoNothing({
      target: [newsReadStatusTable.userId, newsReadStatusTable.articleId],
    });

    return { success: true, count: newIds.length };
  }

  async getStats(): Promise<NewsRefreshStatus> {
    const { startIso, endIso } = this.getTodayRange();
    const startDate: Date = new Date(startIso);
    const endDate: Date = new Date(endIso);

    const [lastRefreshResult, todayImportantResult, todayTotalResult] = await Promise.all([
      this.db
        .select({ fetchedAt: newsFetchLogTable.fetchedAt })
        .from(newsFetchLogTable)
        .where(eq(newsFetchLogTable.status, 'success'))
        .orderBy(desc(newsFetchLogTable.fetchedAt))
        .limit(1),
      this.db
        .select({ count: count() })
        .from(newsArticleTable)
        .where(
          and(
            eq(newsArticleTable.isImportant, true),
            gte(newsArticleTable.publishDate, startDate),
            lt(newsArticleTable.publishDate, endDate),
          ),
        ),
      this.db
        .select({ count: count() })
        .from(newsArticleTable)
        .where(
          and(
            gte(newsArticleTable.publishDate, startDate),
            lt(newsArticleTable.publishDate, endDate),
          ),
        ),
    ]);

    const lastRefreshAt: string = lastRefreshResult[0]
      ? lastRefreshResult[0].fetchedAt.toISOString()
      : new Date().toISOString();

    return {
      lastRefreshAt,
      isRefreshing: false,
      todayImportantCount: Number(todayImportantResult[0]?.count ?? 0),
      todayTotalCount: Number(todayTotalResult[0]?.count ?? 0),
    };
  }

  async refresh(): Promise<{ success: boolean; newCount: number; lastRefreshAt: string }> {
    const newCount: number = await this.fetchAllSources();
    const lastRefreshAt: string = new Date().toISOString();
    return { success: true, newCount, lastRefreshAt };
  }

  private async writeFetchLog(
    source: string,
    status: string,
    newCount: number,
    errorMsg?: string,
  ): Promise<void> {
    try {
      await this.db.insert(newsFetchLogTable).values({
        source,
        status,
        newCount,
        errorMsg: errorMsg ?? null,
      });
    } catch (logError) {
      this.logger.error('写入抓取日志失败', logError as Error);
    }
  }
}
