import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc } from 'drizzle-orm';
import { application } from '@server/database/schema';
import type { Application, CreateApplicationDto, UpdateApplicationDto } from '@shared/api.interface';

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private toApplication(row: typeof application.$inferSelect): Application {
    return {
      id: row.id,
      company: row.company,
      position: row.position,
      city: row.city,
      salary: row.salary,
      applicationDate: row.applicationDate,
      status: row.status as Application['status'],
      applicationType: row.applicationType as Application['applicationType'],
      source: row.source,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async findAll(): Promise<Application[]> {
    try {
      const rows = await this.db
        .select()
        .from(application)
        .orderBy(desc(application.applicationDate));
      return rows.map((row) => this.toApplication(row));
    } catch (error) {
      this.logger.error('获取投递列表失败', error as Error);
      throw error;
    }
  }

  async findById(id: string): Promise<Application | null> {
    try {
      const rows = await this.db
        .select()
        .from(application)
        .where(eq(application.id, id))
        .limit(1);
      if (rows.length === 0) return null;
      return this.toApplication(rows[0]);
    } catch (error) {
      this.logger.error(`获取投递详情失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async create(dto: CreateApplicationDto): Promise<Application> {
    try {
      const inserted = await this.db
        .insert(application)
        .values({
          company: dto.company,
          position: dto.position,
          city: dto.city ?? '',
          salary: dto.salary ?? '',
          applicationDate: dto.applicationDate ?? undefined,
          status: dto.status ?? 'submitted',
          applicationType: dto.applicationType ?? 'campus',
          source: dto.source ?? '',
          notes: dto.notes ?? '',
        })
        .returning();
      return this.toApplication(inserted[0]);
    } catch (error) {
      this.logger.error('创建投递记录失败', error as Error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateApplicationDto): Promise<Application> {
    try {
      const patch: Partial<typeof application.$inferInsert> = {};
      if (dto.company !== undefined) patch.company = dto.company;
      if (dto.position !== undefined) patch.position = dto.position;
      if (dto.city !== undefined) patch.city = dto.city;
      if (dto.salary !== undefined) patch.salary = dto.salary;
      if (dto.applicationDate !== undefined) patch.applicationDate = dto.applicationDate;
      if (dto.status !== undefined) patch.status = dto.status;
      if (dto.applicationType !== undefined) patch.applicationType = dto.applicationType;
      if (dto.source !== undefined) patch.source = dto.source;
      if (dto.notes !== undefined) patch.notes = dto.notes;

      const updated = await this.db
        .update(application)
        .set(patch)
        .where(eq(application.id, id))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundException('投递记录不存在');
      }
      return this.toApplication(updated[0]);
    } catch (error) {
      this.logger.error(`更新投递记录失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async remove(id: string): Promise<{ id: string }> {
    try {
      const deleted = await this.db
        .delete(application)
        .where(eq(application.id, id))
        .returning({ id: application.id });
      if (deleted.length === 0) {
        throw new NotFoundException('投递记录不存在');
      }
      return { id: deleted[0].id };
    } catch (error) {
      this.logger.error(`删除投递记录失败 id=${id}`, error as Error);
      throw error;
    }
  }
}
