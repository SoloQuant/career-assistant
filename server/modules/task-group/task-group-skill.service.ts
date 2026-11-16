import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
  CapabilityService,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import {
  skill,
  taskGroupSkill,
  taskMilestoneSkill,
  taskSubTaskSkill,
  taskGroup,
  taskMilestone,
  taskSubTask,
} from '@server/database/schema';
import type {
  SkillWithMastery,
  TaskGroupSkillsResult,
  TasksBySkillResponse,
  TaskGroupSummary,
  TaskMilestoneWithGroup,
  TaskSubTaskWithParents,
  TaskSkillPreview,
  TaskGroup,
  TaskMilestone,
  TaskSubTask,
  CreateTaskGroupDto,
  CreateTaskSplitDto,
} from '@shared/api.interface';
import type {
  TaskSkillAutoRecognitionOneInput,
  IntelligentTaskSplitterOneInput,
} from '@shared/plugin-types';

interface SkillMasteryRow {
  id: string;
  name: string;
  category: string;
  masteryLevel: number;
}

@Injectable()
export class TaskGroupSkillService {
  private readonly logger = new Logger(TaskGroupSkillService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly capabilityService: CapabilityService,
  ) {}

  private toSkillWithMastery(r: SkillMasteryRow): SkillWithMastery {
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      masteryLevel: r.masteryLevel,
    };
  }

  /** 从 skill 表查询所有技能名称，返回逗号分隔字符串，用于插件 skill_library 参数 */
  async getAllSkillNames(): Promise<string> {
    const rows = await this.db.select({ name: skill.name }).from(skill);
    return rows.map((r) => r.name).join(', ');
  }

  /**
   * 调用技能识别插件，返回各层级的技能名称
   * @param taskInfoJson 任务信息的 JSON 字符串（含 title+description+milestones 结构）
   * @param skillLibrary 技能库字符串
   */
  async recognizeSkills(
    taskInfoJson: string,
    skillLibrary: string,
  ): Promise<{
    overallTaskSkills: string[];
    milestones: Array<{
      milestoneName: string;
      skills: string[];
      subtasks: Array<{ subtaskName: string; skills: string[] }>;
    }>;
  }> {
    const input: TaskSkillAutoRecognitionOneInput = {
      task_info: taskInfoJson,
      skill_library: skillLibrary,
    };
    const result = await this.capabilityService
      .load('task_skill_auto_recognition_1')
      .call('textToJson', input) as {
        overall_task_skills: unknown[];
        milestones: unknown[];
      };

    const overallTaskSkills: string[] = Array.isArray(result.overall_task_skills)
      ? result.overall_task_skills.map((s) => String(s ?? ''))
      : [];

    const milestones = (Array.isArray(result.milestones) ? result.milestones : [])
      .map((m: unknown) => {
        const mm = m as Record<string, unknown>;
        return {
          milestoneName: String(mm.milestone_name ?? ''),
          skills: Array.isArray(mm.skills)
            ? mm.skills.map((s: unknown) => String(s ?? ''))
            : [],
          subtasks: (Array.isArray(mm.subtasks) ? mm.subtasks : []).map(
            (st: unknown) => {
              const ss = st as Record<string, unknown>;
              return {
                subtaskName: String(ss.subtask_name ?? ''),
                skills: Array.isArray(ss.skills)
                  ? ss.skills.map((s: unknown) => String(s ?? ''))
                  : [],
              };
            },
          ),
        };
      });

    return { overallTaskSkills, milestones };
  }

  /** 根据技能名称数组匹配技能 ID */
  async matchSkillIdsByNames(names: string[]): Promise<string[]> {
    if (names.length === 0) return [];
    const lowerNames = names.map((n) => n.trim().toLowerCase()).filter(Boolean);
    if (lowerNames.length === 0) return [];
    const rows = await this.db
      .select({ id: skill.id, name: skill.name })
      .from(skill);
    const nameToId = new Map<string, string>();
    for (const r of rows) {
      nameToId.set(r.name.toLowerCase(), r.id);
    }
    const ids: string[] = [];
    for (const n of lowerNames) {
      const id = nameToId.get(n);
      if (id) ids.push(id);
    }
    return ids;
  }

  // ─── 查询技能关联 ────────────────────────────────────────

  async listAllSkills(): Promise<SkillWithMastery[]> {
    const rows = await this.db
      .select({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        masteryLevel: skill.masteryLevel,
      })
      .from(skill)
      .orderBy(skill.category, skill.name);
    return rows.map((r) => this.toSkillWithMastery(r));
  }

  async getGroupSkills(groupId: string): Promise<SkillWithMastery[]> {
    const rows = await this.db
      .select({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        masteryLevel: skill.masteryLevel,
      })
      .from(taskGroupSkill)
      .innerJoin(skill, eq(taskGroupSkill.skillId, skill.id))
      .where(eq(taskGroupSkill.groupId, groupId))
      .orderBy(skill.name);
    return rows.map((r) => this.toSkillWithMastery(r));
  }

  async getMilestoneSkills(milestoneId: string): Promise<SkillWithMastery[]> {
    const rows = await this.db
      .select({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        masteryLevel: skill.masteryLevel,
      })
      .from(taskMilestoneSkill)
      .innerJoin(skill, eq(taskMilestoneSkill.skillId, skill.id))
      .where(eq(taskMilestoneSkill.milestoneId, milestoneId))
      .orderBy(skill.name);
    return rows.map((r) => this.toSkillWithMastery(r));
  }

  async getSubTaskSkills(subTaskId: string): Promise<SkillWithMastery[]> {
    const rows = await this.db
      .select({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        masteryLevel: skill.masteryLevel,
      })
      .from(taskSubTaskSkill)
      .innerJoin(skill, eq(taskSubTaskSkill.skillId, skill.id))
      .where(eq(taskSubTaskSkill.subTaskId, subTaskId))
      .orderBy(skill.name);
    return rows.map((r) => this.toSkillWithMastery(r));
  }

  /** 一次性查询总任务下所有层级的技能关联，用于详情页 */
  async getSkillsByGroup(groupId: string): Promise<TaskGroupSkillsResult> {
    const groupSkills = await this.getGroupSkills(groupId);

    // 查询该 group 下所有里程碑的技能
    const milestoneSkillRows = await this.db
      .select({
        milestoneId: taskMilestoneSkill.milestoneId,
        id: skill.id,
        name: skill.name,
        category: skill.category,
        masteryLevel: skill.masteryLevel,
      })
      .from(taskMilestoneSkill)
      .innerJoin(skill, eq(taskMilestoneSkill.skillId, skill.id))
      .innerJoin(
        taskMilestone,
        eq(taskMilestoneSkill.milestoneId, taskMilestone.id),
      )
      .where(eq(taskMilestone.groupId, groupId));

    const milestoneSkillsMap: Record<string, SkillWithMastery[]> = {};
    for (const r of milestoneSkillRows) {
      const arr = milestoneSkillsMap[r.milestoneId] ?? [];
      arr.push(this.toSkillWithMastery(r));
      milestoneSkillsMap[r.milestoneId] = arr;
    }

    // 查询该 group 下所有子任务的技能
    const subTaskSkillRows = await this.db
      .select({
        subTaskId: taskSubTaskSkill.subTaskId,
        id: skill.id,
        name: skill.name,
        category: skill.category,
        masteryLevel: skill.masteryLevel,
      })
      .from(taskSubTaskSkill)
      .innerJoin(skill, eq(taskSubTaskSkill.skillId, skill.id))
      .innerJoin(taskSubTask, eq(taskSubTaskSkill.subTaskId, taskSubTask.id))
      .where(eq(taskSubTask.groupId, groupId));

    const subTaskSkillsMap: Record<string, SkillWithMastery[]> = {};
    for (const r of subTaskSkillRows) {
      const arr = subTaskSkillsMap[r.subTaskId] ?? [];
      arr.push(this.toSkillWithMastery(r));
      subTaskSkillsMap[r.subTaskId] = arr;
    }

    return { groupSkills, milestoneSkillsMap, subTaskSkillsMap };
  }

  // ─── 更新技能关联（先删后插，事务包裹） ────────────────────

  async updateGroupSkills(
    groupId: string,
    skillIds: string[],
  ): Promise<SkillWithMastery[]> {
    const existing = await this.db
      .select({ id: taskGroup.id })
      .from(taskGroup)
      .where(eq(taskGroup.id, groupId))
      .limit(1);
    if (existing.length === 0) throw new NotFoundException('总任务不存在');

    await this.db.transaction(async (tx) => {
      await tx.delete(taskGroupSkill).where(eq(taskGroupSkill.groupId, groupId));
      if (skillIds.length > 0) {
        const uniqueIds = [...new Set(skillIds)];
        await tx
          .insert(taskGroupSkill)
          .values(uniqueIds.map((sid) => ({ groupId, skillId: sid })));
      }
    });

    return this.getGroupSkills(groupId);
  }

  async updateMilestoneSkills(
    milestoneId: string,
    skillIds: string[],
  ): Promise<SkillWithMastery[]> {
    const existing = await this.db
      .select({ id: taskMilestone.id })
      .from(taskMilestone)
      .where(eq(taskMilestone.id, milestoneId))
      .limit(1);
    if (existing.length === 0) throw new NotFoundException('里程碑不存在');

    await this.db.transaction(async (tx) => {
      await tx
        .delete(taskMilestoneSkill)
        .where(eq(taskMilestoneSkill.milestoneId, milestoneId));
      if (skillIds.length > 0) {
        const uniqueIds = [...new Set(skillIds)];
        await tx
          .insert(taskMilestoneSkill)
          .values(uniqueIds.map((sid) => ({ milestoneId, skillId: sid })));
      }
    });

    return this.getMilestoneSkills(milestoneId);
  }

  async updateSubTaskSkills(
    subTaskId: string,
    skillIds: string[],
  ): Promise<SkillWithMastery[]> {
    const existing = await this.db
      .select({ id: taskSubTask.id })
      .from(taskSubTask)
      .where(eq(taskSubTask.id, subTaskId))
      .limit(1);
    if (existing.length === 0) throw new NotFoundException('子任务不存在');

    await this.db.transaction(async (tx) => {
      await tx
        .delete(taskSubTaskSkill)
        .where(eq(taskSubTaskSkill.subTaskId, subTaskId));
      if (skillIds.length > 0) {
        const uniqueIds = [...new Set(skillIds)];
        await tx
          .insert(taskSubTaskSkill)
          .values(uniqueIds.map((sid) => ({ subTaskId, skillId: sid })));
      }
    });

    return this.getSubTaskSkills(subTaskId);
  }

  // ─── 按技能反向查任务 ─────────────────────────────────────

  async getTasksBySkillId(skillId: string): Promise<TasksBySkillResponse> {
    // 验证技能存在
    const skillRows = await this.db
      .select({ id: skill.id })
      .from(skill)
      .where(eq(skill.id, skillId))
      .limit(1);
    if (skillRows.length === 0) throw new NotFoundException('技能不存在');

    // 关联的总任务
    const groupRows = await this.db
      .select()
      .from(taskGroupSkill)
      .innerJoin(taskGroup, eq(taskGroupSkill.groupId, taskGroup.id))
      .where(eq(taskGroupSkill.skillId, skillId))
      .orderBy(taskGroup.title);

    const groups: TaskGroupSummary[] = groupRows.map((row) => {
      const g = row.task_group;
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        relatedSkills: g.relatedSkills ?? [],
        priority: g.priority as TaskGroupSummary['priority'],
        status: g.status as TaskGroupSummary['status'],
        dueDate: g.dueDate ?? undefined,
        totalMilestones: g.totalMilestones,
        totalSubTasks: g.totalSubTasks,
        completedSubTasks: g.completedSubTasks,
        progress: Number(g.progress),
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      };
    });

    // 关联的里程碑
    const milestoneRows = await this.db
      .select({
        id: taskMilestone.id,
        title: taskMilestone.title,
        groupId: taskMilestone.groupId,
        groupTitle: taskGroup.title,
        progress: taskMilestone.progress,
      })
      .from(taskMilestoneSkill)
      .innerJoin(
        taskMilestone,
        eq(taskMilestoneSkill.milestoneId, taskMilestone.id),
      )
      .innerJoin(taskGroup, eq(taskMilestone.groupId, taskGroup.id))
      .where(eq(taskMilestoneSkill.skillId, skillId))
      .orderBy(taskGroup.title, taskMilestone.sortOrder);

    const milestones: TaskMilestoneWithGroup[] = milestoneRows.map((r) => ({
      id: r.id,
      title: r.title,
      groupId: r.groupId,
      groupTitle: r.groupTitle,
      progress: Number(r.progress),
    }));

    // 关联的子任务
    const subTaskRows = await this.db
      .select({
        id: taskSubTask.id,
        title: taskSubTask.title,
        milestoneId: taskSubTask.milestoneId,
        milestoneTitle: taskMilestone.title,
        groupId: taskSubTask.groupId,
        groupTitle: taskGroup.title,
        isCompleted: taskSubTask.isCompleted,
      })
      .from(taskSubTaskSkill)
      .innerJoin(taskSubTask, eq(taskSubTaskSkill.subTaskId, taskSubTask.id))
      .innerJoin(taskMilestone, eq(taskSubTask.milestoneId, taskMilestone.id))
      .innerJoin(taskGroup, eq(taskSubTask.groupId, taskGroup.id))
      .where(eq(taskSubTaskSkill.skillId, skillId))
      .orderBy(taskGroup.title, taskMilestone.sortOrder, taskSubTask.sortOrder);

    const subTasks: TaskSubTaskWithParents[] = subTaskRows.map((r) => ({
      id: r.id,
      title: r.title,
      milestoneId: r.milestoneId,
      milestoneTitle: r.milestoneTitle,
      groupId: r.groupId,
      groupTitle: r.groupTitle,
      isCompleted: r.isCompleted,
    }));

    return { groups, milestones, subTasks };
  }

  // ─── 拆分预览 + 技能识别 ──────────────────────────────────

  /** 拆分预览 + 技能识别联合接口：先拆分再识别，合并返回 */
  async splitPreviewWithSkills(dto: CreateTaskSplitDto): Promise<TaskSkillPreview> {
    // 1. 调用拆分插件拿到里程碑结构
    const splitInput: IntelligentTaskSplitterOneInput = {
      task_name: dto.title,
      task_description: dto.description ?? '',
    };
    const splitResult = await this.capabilityService
      .load('intelligent_task_splitter_1')
      .call('textToJson', splitInput) as {
        milestones: Array<{
          name: string;
          description: string;
          subTasks: Array<{ name: string; description: string; estimatedMinutes: number }>;
        }>;
      };

    const splitMilestones = (splitResult.milestones ?? []).map((m) => ({
      name: m.name ?? '',
      description: m.description ?? '',
      subTasks: (m.subTasks ?? []).map((s) => ({
        name: s.name ?? '',
        description: s.description ?? '',
        estimatedMinutes: Number(s.estimatedMinutes) || 60,
      })),
    }));

    // 2. 组装 task_info JSON 字符串
    const taskInfo = {
      title: dto.title,
      description: dto.description ?? '',
      milestones: splitMilestones,
    };
    const taskInfoJson = JSON.stringify(taskInfo);

    // 3. 获取技能库
    const skillLibrary = await this.getAllSkillNames();

    // 4. 调用技能识别插件
    const skillResult = await this.recognizeSkills(taskInfoJson, skillLibrary);

    // 5. 合并结果：按名称匹配里程碑和子任务
    const milestoneSkillMap = new Map<string, string[]>();
    const subTaskSkillMap = new Map<string, Map<string, string[]>>();

    for (const m of skillResult.milestones) {
      milestoneSkillMap.set(m.milestoneName, m.skills);
      const stMap = new Map<string, string[]>();
      for (const st of m.subtasks) {
        stMap.set(st.subtaskName, st.skills);
      }
      subTaskSkillMap.set(m.milestoneName, stMap);
    }

    const milestones = splitMilestones.map((m) => {
      const stMap = subTaskSkillMap.get(m.name) ?? new Map<string, string[]>();
      return {
        name: m.name,
        description: m.description,
        skillNames: milestoneSkillMap.get(m.name) ?? [],
        subTasks: m.subTasks.map((s) => ({
          name: s.name,
          description: s.description,
          estimatedMinutes: s.estimatedMinutes,
          skillNames: stMap.get(s.name) ?? [],
        })),
      };
    });

    return {
      overallSkillNames: skillResult.overallTaskSkills,
      milestones,
    };
  }

  /** 创建带技能关联的总任务（事务包裹） */
  async createGroupWithSkills(dto: CreateTaskGroupDto): Promise<TaskGroup> {
    const totalSub = dto.milestones.reduce(
      (s: number, m) => s + (m.subTasks?.length ?? 0),
      0,
    );
    const result = await this.db.transaction(async (tx) => {
      const [g] = await tx.insert(taskGroup).values({
        title: dto.title,
        description: dto.description ?? '',
        relatedSkills: dto.relatedSkills ?? [],
        priority: dto.priority ?? 'medium',
        status: 'pending',
        dueDate: dto.dueDate ?? null,
        totalMilestones: dto.milestones.length,
        totalSubTasks: totalSub,
        completedSubTasks: 0,
        progress: '0',
      }).returning();

      const ml: TaskMilestone[] = [];
      const milestoneSkillMap: Array<{ milestoneId: string; skillIds: string[] }> = [];
      const subTaskSkillMap: Array<{ subTaskId: string; skillIds: string[] }> = [];

      for (let i = 0; i < dto.milestones.length; i++) {
        const m = dto.milestones[i];
        const sts = m.subTasks ?? [];
        const [mRow] = await tx.insert(taskMilestone).values({
          groupId: g.id,
          title: m.title,
          description: m.description ?? '',
          sortOrder: m.sortOrder ?? i,
          totalSubTasks: sts.length,
          completedSubTasks: 0,
          progress: '0',
        }).returning();

        if (m.skillIds && m.skillIds.length > 0) {
          milestoneSkillMap.push({
            milestoneId: mRow.id,
            skillIds: m.skillIds,
          });
        }

        const sl: TaskSubTask[] = [];
        for (let j = 0; j < sts.length; j++) {
          const s = sts[j];
          const [sRow] = await tx.insert(taskSubTask).values({
            milestoneId: mRow.id,
            groupId: g.id,
            title: s.title,
            description: s.description ?? '',
            sortOrder: s.sortOrder ?? j,
            estimatedMinutes: s.estimatedMinutes ?? 60,
          }).returning();

          if (s.skillIds && s.skillIds.length > 0) {
            subTaskSkillMap.push({
              subTaskId: sRow.id,
              skillIds: s.skillIds,
            });
          }

          sl.push({
            id: sRow.id,
            milestoneId: sRow.milestoneId,
            groupId: sRow.groupId,
            title: sRow.title,
            description: sRow.description,
            sortOrder: sRow.sortOrder,
            estimatedMinutes: sRow.estimatedMinutes,
            isCompleted: sRow.isCompleted,
            completedAt: sRow.completedAt
              ? sRow.completedAt.toISOString()
              : undefined,
            createdAt: sRow.createdAt.toISOString(),
            updatedAt: sRow.updatedAt.toISOString(),
            relatedSkillIds: [],
          });
        }
        ml.push({
          id: mRow.id,
          groupId: mRow.groupId,
          title: mRow.title,
          description: mRow.description,
          sortOrder: mRow.sortOrder,
          totalSubTasks: mRow.totalSubTasks,
          completedSubTasks: mRow.completedSubTasks,
          progress: Number(mRow.progress),
          subTasks: sl,
          relatedSkillIds: [],
        });
      }

      // 插入三级技能关联
      await this.insertSkillsInTransaction(
        tx,
        g.id,
        dto.skillIds ?? [],
        milestoneSkillMap,
        subTaskSkillMap,
      );

      return { group: g, milestones: ml };
    });

    // 查询关联技能 ID 填充返回值
    const skillsResult = await this.getSkillsByGroup(result.group.id);
    const relatedSkillIds = skillsResult.groupSkills.map(
      (s: SkillWithMastery) => s.id,
    );
    for (const m of result.milestones) {
      const mSkills = skillsResult.milestoneSkillsMap[m.id] ?? [];
      m.relatedSkillIds = mSkills.map((s: SkillWithMastery) => s.id);
      for (const st of m.subTasks) {
        const stSkills = skillsResult.subTaskSkillsMap[st.id] ?? [];
        st.relatedSkillIds = stSkills.map((s: SkillWithMastery) => s.id);
      }
    }

    return {
      id: result.group.id,
      title: result.group.title,
      description: result.group.description,
      relatedSkills: result.group.relatedSkills ?? [],
      relatedSkillIds,
      priority: result.group.priority as TaskGroup['priority'],
      status: result.group.status as TaskGroup['status'],
      dueDate: result.group.dueDate ?? undefined,
      totalMilestones: result.group.totalMilestones,
      totalSubTasks: result.group.totalSubTasks,
      completedSubTasks: result.group.completedSubTasks,
      progress: Number(result.group.progress),
      createdAt: result.group.createdAt.toISOString(),
      updatedAt: result.group.updatedAt.toISOString(),
      milestones: result.milestones,
    };
  }

  // ─── 事务内插入技能关联（供 createGroupWithSkills 调用） ──

  async insertSkillsInTransaction(
    tx: PostgresJsDatabase,
    groupId: string,
    groupSkillIds: string[],
    milestoneSkillMap: Array<{ milestoneId: string; skillIds: string[] }>,
    subTaskSkillMap: Array<{ subTaskId: string; skillIds: string[] }>,
  ): Promise<void> {
    if (groupSkillIds.length > 0) {
      const uniqueIds = [...new Set(groupSkillIds)];
      await tx
        .insert(taskGroupSkill)
        .values(uniqueIds.map((sid) => ({ groupId, skillId: sid })));
    }
    for (const item of milestoneSkillMap) {
      if (item.skillIds.length === 0) continue;
      const uniqueIds = [...new Set(item.skillIds)];
      await tx.insert(taskMilestoneSkill).values(
        uniqueIds.map((sid) => ({
          milestoneId: item.milestoneId,
          skillId: sid,
        })),
      );
    }
    for (const item of subTaskSkillMap) {
      if (item.skillIds.length === 0) continue;
      const uniqueIds = [...new Set(item.skillIds)];
      await tx.insert(taskSubTaskSkill).values(
        uniqueIds.map((sid) => ({
          subTaskId: item.subTaskId,
          skillId: sid,
        })),
      );
    }
  }
}
