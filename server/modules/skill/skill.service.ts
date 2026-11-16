import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc } from 'drizzle-orm';
import { skill } from '@server/database/schema';
import type { Skill, CreateSkillDto, UpdateSkillDto, KnowledgePoint } from '@shared/api.interface';

@Injectable()
export class SkillService {
  private readonly logger = new Logger(SkillService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private toSkill(row: {
    id: string;
    name: string;
    category: string;
    description: string;
    masteryLevel: number;
    knowledgePoints: unknown;
    selfRating: number;
    createdAt: Date;
    updatedAt: Date;
  }): Skill {
    const kps: KnowledgePoint[] = Array.isArray(row.knowledgePoints)
      ? (row.knowledgePoints as KnowledgePoint[])
      : [];
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description,
      masteryLevel: row.masteryLevel,
      knowledgePoints: kps,
      selfRating: row.selfRating,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async findAll(): Promise<Skill[]> {
    try {
      const rows = await this.db
        .select()
        .from(skill)
        .orderBy(desc(skill.updatedAt));
      return rows.map((row) => this.toSkill(row));
    } catch (error) {
      this.logger.error('获取技能列表失败', error as Error);
      throw error;
    }
  }

  async findById(id: string): Promise<Skill | null> {
    try {
      const rows = await this.db
        .select()
        .from(skill)
        .where(eq(skill.id, id))
        .limit(1);
      if (rows.length === 0) return null;
      return this.toSkill(rows[0]);
    } catch (error) {
      this.logger.error(`获取技能详情失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async create(dto: CreateSkillDto): Promise<Skill> {
    try {
      const inserted = await this.db
        .insert(skill)
        .values({
          name: dto.name,
          category: dto.category,
          description: dto.description ?? '',
          knowledgePoints: dto.knowledgePoints ?? [],
        })
        .returning();
      return this.toSkill(inserted[0]);
    } catch (error) {
      this.logger.error('创建技能失败', error as Error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateSkillDto): Promise<Skill> {
    try {
      const patch: Partial<typeof skill.$inferInsert> = {};
      if (dto.name !== undefined) patch.name = dto.name;
      if (dto.category !== undefined) patch.category = dto.category;
      if (dto.description !== undefined) patch.description = dto.description;
      if (dto.knowledgePoints !== undefined) patch.knowledgePoints = dto.knowledgePoints;
      if (dto.selfRating !== undefined) patch.selfRating = dto.selfRating;

      const updated = await this.db
        .update(skill)
        .set(patch)
        .where(eq(skill.id, id))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundException('技能不存在');
      }
      return this.toSkill(updated[0]);
    } catch (error) {
      this.logger.error(`更新技能失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async remove(id: string): Promise<{ id: string }> {
    try {
      const deleted = await this.db
        .delete(skill)
        .where(eq(skill.id, id))
        .returning({ id: skill.id });
      if (deleted.length === 0) {
        throw new NotFoundException('技能不存在');
      }
      return { id: deleted[0].id };
    } catch (error) {
      this.logger.error(`删除技能失败 id=${id}`, error as Error);
      throw error;
    }
  }
}
