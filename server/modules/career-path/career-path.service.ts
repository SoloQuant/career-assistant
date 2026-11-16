import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, asc, count } from 'drizzle-orm';
import { careerPath, careerStage } from '@server/database/schema';
import type {
  CareerPath,
  CareerStage,
  CareerPathWithStages,
  CareerPathListResponse,
  CreateCareerPathRequest,
  GenerateCareerPlanRequest,
  UpdateStageStatusRequest,
} from '@shared/api.interface';

type CareerPathStatus = 'planning' | 'in_progress' | 'completed' | 'paused';

interface StageTemplate {
  title: string;
  description: string;
  requiredSkills: string[];
  tasks: string[];
  resources: string[];
  weight: number;
}

const CAREER_TEMPLATES: Record<string, StageTemplate[]> = {
  data_engineer: [
    {
      title: '基础阶段',
      description: '掌握数据工程师必备的编程与SQL基础能力',
      requiredSkills: ['SQL', 'Python', 'Linux基础', '数据结构'],
      tasks: [
        '完成SQL基础到进阶的系统学习',
        '掌握Python数据处理库（pandas/numpy）',
        '熟悉Linux常用命令和Shell脚本',
        '完成3个SQL实战练习项目',
      ],
      resources: [
        'LeetCode SQL题库',
        'Python for Data Analysis',
        '菜鸟教程 SQL',
      ],
      weight: 2,
    },
    {
      title: '大数据核心技术',
      description: '深入学习Hadoop生态、Hive数仓与Spark计算引擎',
      requiredSkills: ['Hadoop', 'Hive', 'Spark', 'HDFS', 'YARN'],
      tasks: [
        '搭建Hadoop集群并理解HDFS/YARN原理',
        '掌握Hive数据仓库建模与优化',
        '深入学习Spark Core与Spark SQL',
        '完成一个离线数仓实战项目',
      ],
      resources: [
        'Hadoop权威指南',
        'Spark官方文档',
        '尚硅谷大数据教程',
      ],
      weight: 3,
    },
    {
      title: '实时计算与消息队列',
      description: '掌握流式计算框架和实时数据处理能力',
      requiredSkills: ['Kafka', 'Flink', '实时数仓', '数据湖'],
      tasks: [
        '深入理解Kafka架构与运维',
        '学习Flink DataStream API与Table API',
        '掌握实时数仓分层设计（ODS/DWD/DWS/ADS）',
        '完成一个实时数据大屏项目',
      ],
      resources: [
        'Kafka权威指南',
        'Flink官方文档',
        '尚硅谷实时数仓项目',
      ],
      weight: 3,
    },
    {
      title: '项目实战与面试',
      description: '综合项目实战与面试准备，冲击数据工程师offer',
      requiredSkills: ['项目经验', '面试技巧', '系统设计'],
      tasks: [
        '完成一个端到端的数据平台项目（离线+实时）',
        '整理项目经历，准备简历',
        '刷常见数据工程师面试题（100道）',
        '模拟面试5次以上',
      ],
      resources: [
        '牛客网面试专区',
        'GitHub开源数仓项目',
        '数据中台实战',
      ],
      weight: 2,
    },
  ],
  data_analyst: [
    {
      title: '基础工具阶段',
      description: '掌握数据分析师必备的SQL和Excel核心技能',
      requiredSkills: ['SQL', 'Excel', '数据透视表', '函数公式'],
      tasks: [
        '系统学习SQL查询与聚合分析',
        '掌握Excel高级函数（VLOOKUP/INDEX-MATCH等）',
        '熟练使用数据透视表进行多维度分析',
        '完成3个Excel数据分析练习',
      ],
      resources: [
        'SQL必知必会',
        'ExcelHome教程',
        'B站Excel数据分析课程',
      ],
      weight: 2,
    },
    {
      title: '分析工具进阶',
      description: '学习Python数据分析与BI可视化工具',
      requiredSkills: ['Python', 'Pandas', 'Tableau/Power BI', '数据可视化'],
      tasks: [
        '掌握Python pandas数据清洗与分析',
        '学习matplotlib/seaborn数据可视化',
        '熟练使用Tableau或Power BI做报表',
        '完成一个完整的数据分析报告项目',
      ],
      resources: [
        '利用Python进行数据分析',
        'Tableau官方教程',
        'Power BI从入门到精通',
      ],
      weight: 2,
    },
    {
      title: '分析方法与业务思维',
      description: '建立系统化的数据分析方法论和业务理解',
      requiredSkills: ['描述统计', '假设检验', 'A/B测试', '用户行为分析', '漏斗分析'],
      tasks: [
        '学习常用统计分析方法与指标体系',
        '掌握用户增长分析（AARRR模型）',
        '深入学习漏斗分析、留存分析、 cohort分析',
        '研读5篇以上行业分析报告',
      ],
      resources: [
        '深入浅出数据分析',
        '增长黑客',
        '人人都是产品经理',
      ],
      weight: 3,
    },
    {
      title: '项目实战与求职',
      description: '综合项目实战与面试准备，冲刺数据分析offer',
      requiredSkills: ['项目经验', '业务分析', '面试技巧', '简历优化'],
      tasks: [
        '完成2-3个不同业务场景的数据分析项目',
        '整理项目作品集，准备简历',
        '刷数据分析面试题（80道以上）',
        '模拟面试3次以上',
      ],
      resources: [
        'Kaggle数据集与竞赛',
        '牛客数据分析师面试',
        '数据分析面试宝典',
      ],
      weight: 2,
    },
  ],
  algorithm: [
    {
      title: '数学基础强化',
      description: '夯实算法工程师必备的数学理论基础',
      requiredSkills: ['高等数学', '线性代数', '概率论与数理统计', '优化理论'],
      tasks: [
        '复习微积分与多元函数求导',
        '掌握线性代数核心概念（矩阵/向量/特征值）',
        '系统学习概率论与统计推断',
        '完成梯度下降等优化算法推导',
      ],
      resources: [
        '3Blue1Brown线性代数',
        '概率论与数理统计（浙大版）',
        '斯坦福ML公开课数学基础',
      ],
      weight: 2,
    },
    {
      title: '机器学习基础',
      description: '系统掌握经典机器学习算法与原理',
      requiredSkills: ['监督学习', '无监督学习', '模型评估', '特征工程'],
      tasks: [
        '学习线性回归、逻辑回归、SVM等经典算法',
        '掌握决策树、随机森林、XGBoost等集成方法',
        '理解聚类、降维等无监督学习算法',
        '用sklearn完成3个机器学习项目',
      ],
      resources: [
        'Andrew Ng机器学习课程',
        '统计学习方法（李航）',
        'scikit-learn官方文档',
      ],
      weight: 3,
    },
    {
      title: '深度学习核心',
      description: '深入学习神经网络与深度学习框架',
      requiredSkills: ['神经网络', 'CNN', 'RNN/LSTM', 'PyTorch/TensorFlow', 'Transformer'],
      tasks: [
        '理解神经网络反向传播与优化技巧',
        '掌握CNN在图像领域的应用',
        '学习RNN/LSTM/Transformer序列模型',
        '用PyTorch实现3个深度学习项目',
      ],
      resources: [
        '深度学习（花书）',
        'PyTorch官方教程',
        'CS231n计算机视觉',
      ],
      weight: 3,
    },
    {
      title: '方向深耕与项目',
      description: '选择细分方向深入，准备算法岗求职',
      requiredSkills: ['方向选型', '论文阅读', '竞赛经验', '系统设计'],
      tasks: [
        '选定细分方向（CV/NLP/推荐/风控）',
        '精读10篇以上领域顶会论文',
        '参加1-2个Kaggle或天池竞赛',
        '准备算法面试（手撕代码+项目深挖）',
      ],
      resources: [
        'arXiv论文预印本',
        'Kaggle竞赛平台',
        'LeetCode算法题',
      ],
      weight: 2,
    },
  ],
};

const JOB_LABELS: Record<string, string> = {
  data_engineer: '大数据开发工程师',
  data_analyst: '数据分析师',
  algorithm: '算法工程师',
};

function getStageTemplates(targetJob: string): StageTemplate[] {
  const key = targetJob.toLowerCase().replace(/\s+/g, '_');
  return CAREER_TEMPLATES[key] ?? CAREER_TEMPLATES.data_analyst;
}

function distributeWeeks(
  templates: StageTemplate[],
  durationMonths: number,
): number[] {
  const totalWeeks = Math.max(durationMonths * 4, 8);
  const totalWeight = templates.reduce(
    (sum: number, t: StageTemplate) => sum + t.weight,
    0,
  );
  const weeks: number[] = templates.map((t: StageTemplate) =>
    Math.max(1, Math.round((t.weight / totalWeight) * totalWeeks)),
  );
  // Adjust rounding drift to match totalWeeks
  const currentTotal = weeks.reduce((a: number, b: number) => a + b, 0);
  const diff = totalWeeks - currentTotal;
  if (diff !== 0 && weeks.length > 0) {
    weeks[weeks.length - 1] = Math.max(1, weeks[weeks.length - 1] + diff);
  }
  return weeks;
}

@Injectable()
export class CareerPathService {
  private readonly logger = new Logger(CareerPathService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(userId: string): Promise<CareerPathListResponse> {
    try {
      const [rows, countResult] = await Promise.all([
        this.db
          .select({
            id: careerPath.id,
            title: careerPath.title,
            targetJob: careerPath.targetJob,
            description: careerPath.description,
            durationMonths: careerPath.durationMonths,
            status: careerPath.status,
            currentStage: careerPath.currentStage,
            totalStages: careerPath.totalStages,
            createdAt: careerPath.createdAt,
          })
          .from(careerPath)
          .where(eq(careerPath.createdBy, userId))
          .orderBy(careerPath.createdAt),
        this.db
          .select({ count: count() })
          .from(careerPath)
          .where(eq(careerPath.createdBy, userId)),
      ]);

      const items: CareerPath[] = rows.map((row) => ({
        id: row.id,
        title: row.title,
        targetJob: row.targetJob,
        description: row.description,
        durationMonths: row.durationMonths,
        status: row.status as CareerPathStatus,
        currentStage: row.currentStage,
        totalStages: row.totalStages,
        createdAt: row.createdAt.toISOString(),
      }));

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
      };
    } catch (error) {
      this.logger.error(`获取职业路径列表失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async create(
    userId: string,
    dto: CreateCareerPathRequest,
  ): Promise<CareerPathWithStages> {
    try {
      const durationMonths = dto.durationMonths ?? 4;
      const targetJob = dto.targetJob;
      const jobLabel = JOB_LABELS[targetJob] || targetJob;
      const title = dto.title || `${jobLabel}成长路径`;

      const plan = this.generatePlan({
        targetJob,
        currentSkills: dto.currentSkills ?? [],
        durationMonths,
      });

      const description =
        `目标岗位：${jobLabel}，计划用${durationMonths}个月系统学习，` +
        `分为${plan.stages.length}个阶段逐步进阶。`;

      return await this.db.transaction(async (tx) => {
        const [pathRow] = await tx
          .insert(careerPath)
          .values({
            title,
            targetJob,
            description,
            durationMonths,
            status: 'planning',
            currentStage: 0,
            totalStages: plan.stages.length,
            createdBy: userId,
          })
          .returning({
            id: careerPath.id,
            title: careerPath.title,
            targetJob: careerPath.targetJob,
            description: careerPath.description,
            durationMonths: careerPath.durationMonths,
            status: careerPath.status,
            currentStage: careerPath.currentStage,
            totalStages: careerPath.totalStages,
            createdAt: careerPath.createdAt,
          });

        const stageRows = await Promise.all(
          plan.stages.map((stage, index) =>
            tx
              .insert(careerStage)
              .values({
                pathId: pathRow.id,
                title: stage.title,
                description: stage.description,
                sortOrder: index,
                durationWeeks: stage.durationWeeks,
                requiredSkills: stage.requiredSkills,
                tasks: stage.tasks,
                resources: stage.resources,
                isCompleted: false,
              })
              .returning({
                id: careerStage.id,
                pathId: careerStage.pathId,
                title: careerStage.title,
                description: careerStage.description,
                sortOrder: careerStage.sortOrder,
                durationWeeks: careerStage.durationWeeks,
                requiredSkills: careerStage.requiredSkills,
                tasks: careerStage.tasks,
                resources: careerStage.resources,
                isCompleted: careerStage.isCompleted,
                completedAt: careerStage.completedAt,
              }),
          ),
        );

        const stages: CareerStage[] = stageRows.map((rows) => {
          const row = rows[0];
          return {
            id: row.id,
            pathId: row.pathId,
            title: row.title,
            description: row.description,
            sortOrder: row.sortOrder,
            durationWeeks: row.durationWeeks,
            requiredSkills: row.requiredSkills,
            tasks: row.tasks,
            resources: row.resources,
            isCompleted: row.isCompleted,
            completedAt: row.completedAt
              ? row.completedAt.toISOString()
              : undefined,
          };
        });

        return {
          id: pathRow.id,
          title: pathRow.title,
          targetJob: pathRow.targetJob,
          description: pathRow.description,
          durationMonths: pathRow.durationMonths,
          status: pathRow.status as CareerPathStatus,
          currentStage: pathRow.currentStage,
          totalStages: pathRow.totalStages,
          createdAt: pathRow.createdAt.toISOString(),
          stages,
        };
      });
    } catch (error) {
      this.logger.error(
        `创建职业路径失败 userId=${userId} targetJob=${dto.targetJob}`,
        error as Error,
      );
      throw error;
    }
  }

  async getDetail(userId: string, id: string): Promise<CareerPathWithStages> {
    try {
      const pathRows = await this.db
        .select({
          id: careerPath.id,
          title: careerPath.title,
          targetJob: careerPath.targetJob,
          description: careerPath.description,
          durationMonths: careerPath.durationMonths,
          status: careerPath.status,
          currentStage: careerPath.currentStage,
          totalStages: careerPath.totalStages,
          createdAt: careerPath.createdAt,
          createdBy: careerPath.createdBy,
        })
        .from(careerPath)
        .where(eq(careerPath.id, id))
        .limit(1);

      if (pathRows.length === 0) {
        throw new NotFoundException('职业路径不存在');
      }

      const pathRow = pathRows[0];
      if (pathRow.createdBy !== userId) {
        throw new ForbiddenException('无权访问该职业路径');
      }

      const stageRows = await this.db
        .select({
          id: careerStage.id,
          pathId: careerStage.pathId,
          title: careerStage.title,
          description: careerStage.description,
          sortOrder: careerStage.sortOrder,
          durationWeeks: careerStage.durationWeeks,
          requiredSkills: careerStage.requiredSkills,
          tasks: careerStage.tasks,
          resources: careerStage.resources,
          isCompleted: careerStage.isCompleted,
          completedAt: careerStage.completedAt,
        })
        .from(careerStage)
        .where(eq(careerStage.pathId, id))
        .orderBy(asc(careerStage.sortOrder));

      const stages: CareerStage[] = stageRows.map((row) => ({
        id: row.id,
        pathId: row.pathId,
        title: row.title,
        description: row.description,
        sortOrder: row.sortOrder,
        durationWeeks: row.durationWeeks,
        requiredSkills: row.requiredSkills,
        tasks: row.tasks,
        resources: row.resources,
        isCompleted: row.isCompleted,
        completedAt: row.completedAt
          ? row.completedAt.toISOString()
          : undefined,
      }));

      return {
        id: pathRow.id,
        title: pathRow.title,
        targetJob: pathRow.targetJob,
        description: pathRow.description,
        durationMonths: pathRow.durationMonths,
        status: pathRow.status as CareerPathStatus,
        currentStage: pathRow.currentStage,
        totalStages: pathRow.totalStages,
        createdAt: pathRow.createdAt.toISOString(),
        stages,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`获取职业路径详情失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    patch: Partial<{
      title: string;
      description: string;
      targetJob: string;
      durationMonths: number;
      status: CareerPathStatus;
    }>,
  ): Promise<CareerPath> {
    try {
      // Verify ownership
      const existing = await this.db
        .select({
          id: careerPath.id,
          createdBy: careerPath.createdBy,
        })
        .from(careerPath)
        .where(eq(careerPath.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('职业路径不存在');
      }
      if (existing[0].createdBy !== userId) {
        throw new ForbiddenException('无权修改该职业路径');
      }

      const updateData: Partial<typeof careerPath.$inferInsert> = {};
      if (patch.title !== undefined) updateData.title = patch.title;
      if (patch.description !== undefined)
        updateData.description = patch.description;
      if (patch.targetJob !== undefined) updateData.targetJob = patch.targetJob;
      if (patch.durationMonths !== undefined)
        updateData.durationMonths = patch.durationMonths;
      if (patch.status !== undefined) updateData.status = patch.status;

      if (Object.keys(updateData).length === 0) {
        throw new NotFoundException('职业路径不存在');
      }

      const updated = await this.db
        .update(careerPath)
        .set(updateData)
        .where(eq(careerPath.id, id))
        .returning({
          id: careerPath.id,
          title: careerPath.title,
          targetJob: careerPath.targetJob,
          description: careerPath.description,
          durationMonths: careerPath.durationMonths,
          status: careerPath.status,
          currentStage: careerPath.currentStage,
          totalStages: careerPath.totalStages,
          createdAt: careerPath.createdAt,
        });

      if (updated.length === 0) {
        throw new NotFoundException('职业路径不存在');
      }

      const row = updated[0];
      return {
        id: row.id,
        title: row.title,
        targetJob: row.targetJob,
        description: row.description,
        durationMonths: row.durationMonths,
        status: row.status as CareerPathStatus,
        currentStage: row.currentStage,
        totalStages: row.totalStages,
        createdAt: row.createdAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`更新职业路径失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    try {
      const existing = await this.db
        .select({
          id: careerPath.id,
          createdBy: careerPath.createdBy,
        })
        .from(careerPath)
        .where(eq(careerPath.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('职业路径不存在');
      }
      if (existing[0].createdBy !== userId) {
        throw new ForbiddenException('无权删除该职业路径');
      }

      const deleted = await this.db
        .delete(careerPath)
        .where(eq(careerPath.id, id))
        .returning({ id: careerPath.id });

      if (deleted.length === 0) {
        throw new NotFoundException('职业路径不存在');
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`删除职业路径失败 id=${id}`, error as Error);
      throw error;
    }
  }

  generatePlan(dto: GenerateCareerPlanRequest): CareerPathWithStages {
    const templates = getStageTemplates(dto.targetJob);
    const durationMonths = Math.max(3, Math.min(6, dto.durationMonths));
    const weeks = distributeWeeks(templates, durationMonths);
    const jobLabel = JOB_LABELS[dto.targetJob] || dto.targetJob;

    const stages: CareerStage[] = templates.map(
      (tpl: StageTemplate, index: number): CareerStage => ({
        id: `preview_${index}`,
        pathId: 'preview',
        title: tpl.title,
        description: tpl.description,
        sortOrder: index,
        durationWeeks: weeks[index],
        requiredSkills: tpl.requiredSkills,
        tasks: tpl.tasks,
        resources: tpl.resources,
        isCompleted: false,
      }),
    );

    return {
      id: 'preview',
      title: `${jobLabel}成长路径（预览）`,
      targetJob: dto.targetJob,
      description:
        `目标岗位：${jobLabel}，计划用${durationMonths}个月系统学习，` +
        `分为${stages.length}个阶段逐步进阶。`,
      durationMonths,
      status: 'planning',
      currentStage: 0,
      totalStages: stages.length,
      createdAt: new Date().toISOString(),
      stages,
    };
  }

  async updateStageStatus(
    userId: string,
    stageId: string,
    dto: UpdateStageStatusRequest,
  ): Promise<CareerStage> {
    try {
      // Verify stage belongs to a path owned by user
      const stageWithPath = await this.db
        .select({
          stageId: careerStage.id,
          pathId: careerStage.pathId,
          createdBy: careerPath.createdBy,
        })
        .from(careerStage)
        .innerJoin(careerPath, eq(careerStage.pathId, careerPath.id))
        .where(eq(careerStage.id, stageId))
        .limit(1);

      if (stageWithPath.length === 0) {
        throw new NotFoundException('阶段不存在');
      }
      if (stageWithPath[0].createdBy !== userId) {
        throw new ForbiddenException('无权修改该阶段');
      }

      const patch: Partial<typeof careerStage.$inferInsert> = {
        isCompleted: dto.isCompleted,
      };
      if (dto.isCompleted) {
        patch.completedAt = new Date();
      } else {
        patch.completedAt = null;
      }

      const updated = await this.db
        .update(careerStage)
        .set(patch)
        .where(eq(careerStage.id, stageId))
        .returning({
          id: careerStage.id,
          pathId: careerStage.pathId,
          title: careerStage.title,
          description: careerStage.description,
          sortOrder: careerStage.sortOrder,
          durationWeeks: careerStage.durationWeeks,
          requiredSkills: careerStage.requiredSkills,
          tasks: careerStage.tasks,
          resources: careerStage.resources,
          isCompleted: careerStage.isCompleted,
          completedAt: careerStage.completedAt,
        });

      if (updated.length === 0) {
        throw new NotFoundException('阶段不存在');
      }

      const row = updated[0];
      return {
        id: row.id,
        pathId: row.pathId,
        title: row.title,
        description: row.description,
        sortOrder: row.sortOrder,
        durationWeeks: row.durationWeeks,
        requiredSkills: row.requiredSkills,
        tasks: row.tasks,
        resources: row.resources,
        isCompleted: row.isCompleted,
        completedAt: row.completedAt
          ? row.completedAt.toISOString()
          : undefined,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `更新阶段状态失败 stageId=${stageId}`,
        error as Error,
      );
      throw error;
    }
  }

  async getProgress(
    userId: string,
    id: string,
  ): Promise<{
    totalStages: number;
    completedStages: number;
    currentStage: number;
    progressPercent: number;
    stages: Array<{
      id: string;
      title: string;
      sortOrder: number;
      isCompleted: boolean;
      completedAt?: string;
    }>;
  }> {
    try {
      const pathRows = await this.db
        .select({
          id: careerPath.id,
          createdBy: careerPath.createdBy,
          totalStages: careerPath.totalStages,
          currentStage: careerPath.currentStage,
        })
        .from(careerPath)
        .where(eq(careerPath.id, id))
        .limit(1);

      if (pathRows.length === 0) {
        throw new NotFoundException('职业路径不存在');
      }
      if (pathRows[0].createdBy !== userId) {
        throw new ForbiddenException('无权访问该职业路径');
      }

      const stageRows = await this.db
        .select({
          id: careerStage.id,
          title: careerStage.title,
          sortOrder: careerStage.sortOrder,
          isCompleted: careerStage.isCompleted,
          completedAt: careerStage.completedAt,
        })
        .from(careerStage)
        .where(eq(careerStage.pathId, id))
        .orderBy(asc(careerStage.sortOrder));

      const completedStages = stageRows.filter(
        (s) => s.isCompleted,
      ).length;
      const totalStages = stageRows.length;
      const progressPercent =
        totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

      return {
        totalStages,
        completedStages,
        currentStage: pathRows[0].currentStage,
        progressPercent,
        stages: stageRows.map((row) => ({
          id: row.id,
          title: row.title,
          sortOrder: row.sortOrder,
          isCompleted: row.isCompleted,
          completedAt: row.completedAt
            ? row.completedAt.toISOString()
            : undefined,
        })),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`获取路径进度失败 id=${id}`, error as Error);
      throw error;
    }
  }
}
