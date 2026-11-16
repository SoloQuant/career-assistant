import { Injectable, Inject, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, asc, ilike, or } from 'drizzle-orm';
import {
  competition,
  competitionWork,
  competitionReminder,
  skill,
} from '@server/database/schema';
import type {
  CompetitionInfo,
  CompetitionEntry,
  CompetitionReminderItem,
  ProjectDocResponse,
  ProjectDocSection,
  TaskGroup,
  CreateTaskGroupDto,
  FeatureModule,
  TechStackItem,
} from '@shared/api.interface';
import { TaskGroupService } from '../task-group/task-group.service';

interface CompetitionDetailResponse {
  competition: CompetitionInfo;
  work: CompetitionEntry | null;
  reminders: CompetitionReminderItem[];
}

interface DashboardRemindersResponse {
  reminders: CompetitionReminderItem[];
  nextDeadline: {
    title: string;
    date: string;
    daysLeft: number;
  } | null;
}

interface WorkFeatureModule {
  name: string;
  description: string;
}

function daysUntil(dateStr: string): number {
  const today: Date = new Date();
  today.setHours(0, 0, 0, 0);
  const target: Date = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffMs: number = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function mapReminderType(
  reminderType: string,
): 'registration' | 'submission' | 'competition' | 'other' {
  if (reminderType === 'registration') return 'registration';
  if (reminderType === 'submission') return 'submission';
  if (reminderType === 'competition') return 'competition';
  return 'other';
}

function mapCompetitionStatus(
  status: string,
): 'upcoming' | 'registering' | 'ongoing' | 'ended' {
  if (status === 'upcoming') return 'upcoming';
  if (status === 'registering') return 'registering';
  if (status === 'ongoing') return 'ongoing';
  if (status === 'ended') return 'ended';
  return 'upcoming';
}

function mapWorkStatus(
  _status: string | undefined,
): 'draft' | 'submitted' | 'reviewing' | 'awarded' {
  return 'draft';
}

@Injectable()
export class CompetitionService implements OnModuleInit {
  private readonly logger = new Logger(CompetitionService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly taskGroupService: TaskGroupService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedCompetition();
    } catch (err) {
      this.logger.warn('比赛初始化数据可能已存在，跳过', err);
    }
  }

  private async seedCompetition(): Promise<void> {
    const existingCount = await this.db
      .select({ count: competition.id })
      .from(competition)
      .limit(1);
    if (existingCount.length > 0) {
      this.logger.log('比赛数据已存在，跳过初始化');
      return;
    }

    await this.db.transaction(async (tx) => {
      const [comp] = await tx
        .insert(competition)
        .values({
          name: '第九届传智杯全国大学生数智创新与AI应用大赛',
          trackName: 'AI WEB网页开发挑战赛',
          officialUrl: 'https://www.itcast.cn/',
          description:
            '传智杯是由传智教育主办的全国大学生数智创新与AI应用大赛，旨在激发大学生的创新思维和实践能力，推动数智化人才培养。',
          trackIntroduction:
            'AI WEB网页开发赛道要求参赛者使用前沿Web技术和AI能力，打造具有创新性和实用性的Web应用作品。',
          requirements:
            '参赛对象为全国高等院校在校学生，参赛队伍人数不超过5人，需在规定时间内完成作品开发和提交。',
          awards: '一等奖、二等奖、三等奖、优秀奖，获奖队伍将获得证书和奖金。',
          registrationStart: '2026-09-01',
          registrationEnd: '2026-11-30',
          submissionEnd: '2026-12-15',
          preliminaryDate: '2026-12-25',
          finalDate: '2027-01-15',
          status: 'ongoing',
        })
        .returning({ id: competition.id });

      const compId: string = comp.id;

      await tx.insert(competitionWork).values({
        competitionId: compId,
        workName: '职业发展助手系统',
        workDescription:
          '一款面向大学生的全栈职业发展辅助系统，提供技能管理、任务拆解、岗位推荐、求职投递、数据看板等全方位职业发展服务。',
        techStack: [
          'React',
          'NestJS',
          'PostgreSQL',
          'TypeScript',
          'TailwindCSS',
          'Drizzle ORM',
        ],
        featureModules: [
          { name: '个人档案', description: '个人信息管理与职业目标设定' },
          { name: '技能管理', description: '技能评估与知识图谱可视化' },
          { name: '任务拆解', description: 'AI智能任务拆解与进度跟踪' },
          { name: '岗位推荐', description: '个性化岗位匹配与投递记录' },
          { name: '求职投递', description: '简历生成与面试题库' },
          { name: '数据看板', description: '职业发展数据可视化分析' },
          { name: '新闻资讯', description: '行业资讯与财经新闻聚合' },
          { name: '学习资源', description: '课程推荐与学习路径规划' },
          { name: '职业路径', description: '职业发展路线图指引' },
          { name: 'AI助手', description: '智能求职问答与模拟面试' },
          { name: '薪资计算器', description: '城市薪资与生活成本对比' },
          { name: '知识图谱', description: '技能知识网络可视化' },
        ] as WorkFeatureModule[],
        highlights: [
          '全栈一体化职业发展平台',
          'AI驱动的个性化推荐',
          '20+功能模块全覆盖',
          '数据可视化看板',
          '智能任务拆解系统',
        ],
        innovationPoints: [
          '基于用户画像的个性化推荐算法',
          'AI智能任务拆解与路径规划',
          '多维度职业竞争力分析模型',
          '知识图谱驱动的技能体系',
          '全链路职业发展数据闭环',
        ],
        socialValue:
          '帮助大学生明确职业方向，提升就业竞争力，构建完整的职业发展能力体系。',
        architectureDescription:
          '采用React+NestJS全栈架构，前后端分离，PostgreSQL数据库，Drizzle ORM数据访问层。',
      });

      const reminders: Array<{
        title: string;
        reminderType: string;
        reminderDate: string;
        description: string;
      }> = [
        {
          title: '报名截止',
          reminderType: 'registration',
          reminderDate: '2026-11-30',
          description: '第九届传智杯报名截止日期，请尽快完成报名。',
        },
        {
          title: '提交截止',
          reminderType: 'submission',
          reminderDate: '2026-12-15',
          description: '作品提交截止日期，请按时提交参赛作品。',
        },
        {
          title: '初赛时间',
          reminderType: 'competition',
          reminderDate: '2026-12-25',
          description: '初赛评审开始，关注比赛官网获取最新动态。',
        },
        {
          title: '决赛时间',
          reminderType: 'competition',
          reminderDate: '2027-01-15',
          description: '决赛答辩日，准备好你的项目演示和答辩。',
        },
      ];

      for (const r of reminders) {
        await tx.insert(competitionReminder).values({
          competitionId: compId,
          title: r.title,
          reminderType: r.reminderType,
          reminderDate: r.reminderDate,
          description: r.description,
        });
      }
    });

    this.logger.log('比赛初始化数据已插入');
  }

  private async getFirstCompetition(): Promise<
    typeof competition.$inferSelect | null
  > {
    const rows = await this.db.select().from(competition).limit(1);
    return rows[0] ?? null;
  }

  private async getFirstWork(
    compId: string,
  ): Promise<typeof competitionWork.$inferSelect | null> {
    const rows = await this.db
      .select()
      .from(competitionWork)
      .where(eq(competitionWork.competitionId, compId))
      .limit(1);
    return rows[0] ?? null;
  }

  private async getRemindersByCompId(
    compId: string,
  ): Promise<CompetitionReminderItem[]> {
    const rows = await this.db
      .select()
      .from(competitionReminder)
      .where(eq(competitionReminder.competitionId, compId))
      .orderBy(asc(competitionReminder.reminderDate));

    return rows.map((r) => {
      const dateStr: string = String(r.reminderDate);
      return {
        id: r.id,
        title: r.title,
        date: dateStr,
        type: mapReminderType(r.reminderType),
        daysLeft: daysUntil(dateStr),
      };
    });
  }

  private mapCompetition(
    row: typeof competition.$inferSelect,
  ): CompetitionInfo {
    return {
      id: row.id,
      name: row.name,
      officialUrl: row.officialUrl,
      description: row.description,
      trackIntroduction: row.trackIntroduction,
      registrationStart: row.registrationStart
        ? String(row.registrationStart)
        : undefined,
      registrationEnd: row.registrationEnd
        ? String(row.registrationEnd)
        : undefined,
      submissionDeadline: row.submissionEnd
        ? String(row.submissionEnd)
        : undefined,
      requirements: row.requirements,
      status: mapCompetitionStatus(row.status),
    };
  }

  private mapWorkEntry(
    row: typeof competitionWork.$inferSelect,
  ): CompetitionEntry {
    const techStackItems: TechStackItem[] = (row.techStack ?? []).map(
      (tech: string) => ({
        name: tech,
        category: 'frontend',
      }),
    );

    const featureModulesData: WorkFeatureModule[] =
      (row.featureModules as WorkFeatureModule[]) ?? [];
    const featureModules: FeatureModule[] = featureModulesData.map(
      (fm: WorkFeatureModule) => ({
        name: fm.name,
        description: fm.description,
      }),
    );

    return {
      id: row.id,
      competitionId: row.competitionId,
      projectName: row.workName,
      projectIntro: row.workDescription,
      techStack: techStackItems,
      featureModules,
      highlights: (row.highlights ?? []).join('、'),
      teamInfo: [],
      screenshots: [],
      projectUrl: '',
      status: mapWorkStatus(undefined),
    };
  }

  async getCompetitionDetail(): Promise<CompetitionDetailResponse> {
    const comp = await this.getFirstCompetition();
    if (!comp) {
      return {
        competition: {
          id: '',
          name: '',
          status: 'upcoming',
        },
        work: null,
        reminders: [],
      };
    }

    const work = await this.getFirstWork(comp.id);
    const reminders = await this.getRemindersByCompId(comp.id);

    return {
      competition: this.mapCompetition(comp),
      work: work ? this.mapWorkEntry(work) : null,
      reminders,
    };
  }

  async getReminders(): Promise<CompetitionReminderItem[]> {
    const comp = await this.getFirstCompetition();
    if (!comp) return [];
    return this.getRemindersByCompId(comp.id);
  }

  async getDashboardReminders(): Promise<DashboardRemindersResponse> {
    const allReminders: CompetitionReminderItem[] =
      await this.getReminders();

    const upcoming: CompetitionReminderItem[] = allReminders
      .filter((r: CompetitionReminderItem) => r.daysLeft >= 0)
      .sort(
        (a: CompetitionReminderItem, b: CompetitionReminderItem) =>
          a.daysLeft - b.daysLeft,
      );

    const recent3: CompetitionReminderItem[] = upcoming.slice(0, 3);
    const nextDeadline = upcoming[0] ?? null;

    return {
      reminders: recent3,
      nextDeadline: nextDeadline
        ? { title: nextDeadline.title, date: nextDeadline.date, daysLeft: nextDeadline.daysLeft }
        : null,
    };
  }

  private async findSkillIdsByNames(names: string[]): Promise<string[]> {
    if (names.length === 0) return [];
    const conditions = names.map((name: string) =>
      ilike(skill.name, `%${name}%`),
    );
    const rows = await this.db
      .select({ id: skill.id, name: skill.name })
      .from(skill)
      .where(or(...conditions))
      .limit(10);
    return rows.map((r) => r.id);
  }

  async generatePrepPlan(userId: string): Promise<TaskGroup> {
    const comp = await this.getFirstCompetition();
    if (!comp) {
      throw new NotFoundException('暂无比赛信息');
    }

    const submissionDate: string = comp.submissionEnd
      ? String(comp.submissionEnd)
      : '';

    // 查找相关技能 ID
    const webSkillNames: string[] = ['Web开发', '前端开发', 'React', 'TypeScript'];
    const docSkillNames: string[] = ['文档编写', '写作', 'office'];
    const speechSkillNames: string[] = ['演讲表达', '沟通', '语言'];

    const [webIds, docIds, speechIds] = await Promise.all([
      this.findSkillIdsByNames(webSkillNames),
      this.findSkillIdsByNames(docSkillNames),
      this.findSkillIdsByNames(speechSkillNames),
    ]);

    const dto: CreateTaskGroupDto = {
      title: '传智杯备赛',
      description: '第九届传智杯全国大学生数智创新与AI应用大赛备赛计划',
      relatedSkills: ['Web开发', '文档编写', '演讲表达'],
      skillIds: [...webIds, ...docIds, ...speechIds],
      priority: 'high',
      dueDate: submissionDate,
      milestones: [
        {
          title: '项目完善（第1-2周）',
          description: '完善项目功能，优化用户体验，准备演示视频',
          sortOrder: 0,
          skillIds: webIds,
          subTasks: [
            {
              title: '检查所有功能模块是否正常运行',
              description: '逐项测试各功能模块，确保无功能性bug',
              estimatedMinutes: 240,
              sortOrder: 0,
              skillIds: webIds,
            },
            {
              title: '优化界面和用户体验',
              description: '优化UI设计，提升交互体验，响应式适配',
              estimatedMinutes: 360,
              sortOrder: 1,
              skillIds: webIds,
            },
            {
              title: '修复已知bug',
              description: '收集并修复所有已知问题和缺陷',
              estimatedMinutes: 300,
              sortOrder: 2,
              skillIds: webIds,
            },
            {
              title: '准备项目演示视频',
              description: '录制项目功能演示视频，制作字幕和解说',
              estimatedMinutes: 180,
              sortOrder: 3,
              skillIds: docIds,
            },
          ],
        },
        {
          title: '文档准备（第3周）',
          description: '撰写项目文档，准备答辩材料',
          sortOrder: 1,
          skillIds: docIds,
          subTasks: [
            {
              title: '撰写项目说明书',
              description: '编写完整的项目说明书，包含背景、需求、架构、功能等',
              estimatedMinutes: 480,
              sortOrder: 0,
              skillIds: docIds,
            },
            {
              title: '准备答辩PPT',
              description: '制作答辩演示文稿，突出项目亮点和创新点',
              estimatedMinutes: 360,
              sortOrder: 1,
              skillIds: docIds,
            },
            {
              title: '整理项目源代码和部署文档',
              description: '整理代码结构，编写部署文档和README',
              estimatedMinutes: 240,
              sortOrder: 2,
              skillIds: [...webIds, ...docIds],
            },
          ],
        },
        {
          title: '提交准备（第4周）',
          description: '项目打包部署，提交作品，准备答辩',
          sortOrder: 2,
          skillIds: speechIds,
          subTasks: [
            {
              title: '项目打包部署',
              description: '生产环境构建打包，部署到比赛平台',
              estimatedMinutes: 180,
              sortOrder: 0,
              skillIds: webIds,
            },
            {
              title: '提交作品到比赛平台',
              description: '按比赛要求提交所有参赛材料',
              estimatedMinutes: 120,
              sortOrder: 1,
              skillIds: docIds,
            },
            {
              title: '准备答辩演练',
              description: '模拟答辩演练，准备常见问题回答',
              estimatedMinutes: 300,
              sortOrder: 2,
              skillIds: speechIds,
            },
          ],
        },
      ],
    };

    return this.taskGroupService.createGroup(dto);
  }

  async getProjectDoc(): Promise<ProjectDocResponse> {
    const comp = await this.getFirstCompetition();
    const work = comp ? await this.getFirstWork(comp.id) : null;

    const projectName: string = work ? work.workName : '职业发展助手系统';
    const description: string = work
      ? work.workDescription
      : '一款面向大学生的全栈职业发展辅助系统。';
    const techStackList: string[] = work ? work.techStack ?? [] : [];
    const features: WorkFeatureModule[] =
      (work?.featureModules as WorkFeatureModule[]) ?? [];
    const innovations: string[] = work ? work.innovationPoints ?? [] : [];
    const architecture: string = work
      ? work.architectureDescription
      : '采用React+NestJS全栈架构。';
    const socialValue: string = work ? work.socialValue : '';

    const sections: ProjectDocSection[] = [
      {
        id: 'background',
        title: '项目背景',
        content: `随着就业市场竞争日益激烈，大学生在职业规划和发展过程中面临诸多挑战。${description}本项目旨在通过智能化的方式帮助大学生明确职业方向，系统提升职业能力。`,
        orderIndex: 0,
      },
      {
        id: 'requirements',
        title: '需求分析',
        content: `本系统主要面向全国高等院校在校学生，核心需求包括：个人职业档案管理、技能评估与提升、任务规划与跟踪、岗位匹配与推荐、求职辅助工具、数据可视化分析等。系统需要覆盖从职业探索到就业落实的全流程。`,
        orderIndex: 1,
      },
      {
        id: 'architecture',
        title: '技术架构',
        content: `${architecture}技术栈包括：${techStackList.join('、')}。系统采用前后端分离架构，前端负责用户交互与展示，后端提供RESTful API服务，PostgreSQL作为主数据库存储业务数据。`,
        orderIndex: 2,
      },
      {
        id: 'features',
        title: '功能说明',
        content: `系统包含${features.length}大功能模块：${features.map((f: WorkFeatureModule) => `${f.name}（${f.description}）`).join('；')}。各模块相互配合，形成完整的职业发展服务体系。`,
        orderIndex: 3,
      },
      {
        id: 'innovation',
        title: '创新点',
        content: `本项目的主要创新点包括：${innovations.join('；')}。${socialValue ? socialValue : ''}`,
        orderIndex: 4,
      },
      {
        id: 'future',
        title: '未来规划',
        content: '未来计划进一步完善AI推荐算法，增加更多职业方向的路径规划；引入企业合作，提供真实岗位和实习机会；开发移动端应用，提升用户使用便捷性；增加社区功能，促进学生之间的交流与互助。',
        orderIndex: 5,
      },
    ];

    return {
      projectName,
      sections,
    };
  }

  async getWork(): Promise<CompetitionEntry | null> {
    const comp = await this.getFirstCompetition();
    if (!comp) return null;
    const work = await this.getFirstWork(comp.id);
    if (!work) return null;
    return this.mapWorkEntry(work);
  }
}
