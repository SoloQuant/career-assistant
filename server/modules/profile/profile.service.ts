import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { profile } from '@server/database/schema';
import type { Profile, ProfileUpdateDto } from '@shared/api.interface';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async findByUserId(userId: string): Promise<Profile | null> {
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
      this.logger.error(`获取个人资料失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async updateByUserId(userId: string, dto: ProfileUpdateDto): Promise<Profile> {
    try {
      const patch: Partial<typeof profile.$inferInsert> = {};
      if (dto.name !== undefined) patch.name = dto.name;
      if (dto.school !== undefined) patch.school = dto.school;
      if (dto.department !== undefined) patch.department = dto.department;
      if (dto.major !== undefined) patch.major = dto.major;
      if (dto.grade !== undefined) patch.grade = dto.grade;
      if (dto.city !== undefined) patch.city = dto.city;
      if (dto.jobIntention !== undefined) patch.jobIntention = dto.jobIntention;
      if (dto.contact !== undefined) patch.contact = dto.contact;
      if (dto.email !== undefined) patch.email = dto.email;
      if (dto.bio !== undefined) patch.bio = dto.bio;

      const updated = await this.db
        .update(profile)
        .set(patch)
        .where(eq(profile.userId, userId))
        .returning({
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
        });

      if (updated.length === 0) {
        throw new NotFoundException('个人资料不存在');
      }

      const row = updated[0];
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
      this.logger.error(`更新个人资料失败 userId=${userId}`, error as Error);
      throw error;
    }
  }
}
