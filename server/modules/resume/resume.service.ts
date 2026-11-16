import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, count, desc, and } from 'drizzle-orm';
import {
  resumeTemplate,
  userResume,
  profile,
  skill,
} from '@server/database/schema';
import type {
  ResumeTemplate,
  UserResume,
  ResumePersonalInfo,
  ResumeEducationItem,
  ResumeSkillItem,
  CreateResumeRequest,
  UpdateResumeRequest,
  ResumeListResponse,
} from '@shared/api.interface';

const mapMasteryToLevel = (mastery: number): string => {
  if (mastery <= 30) return '入门';
  if (mastery <= 60) return '熟练';
  if (mastery <= 80) return '精通';
  return '专家';
};

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private mapResume(row: typeof userResume.$inferSelect): UserResume {
    const personalInfo =
      (row.personalInfo as unknown as ResumePersonalInfo | null) ??
      ({} as ResumePersonalInfo);
    const education =
      (row.education as unknown as ResumeEducationItem[] | null) ?? [];
    const experience = (row.experience as unknown as any[] | null) ?? [];
    const projects = (row.projects as unknown as any[] | null) ?? [];
    const skills = (row.skills as unknown as ResumeSkillItem[] | null) ?? [];
    const certificates = (row.certificates as unknown as any[] | null) ?? [];

    return {
      id: row.id,
      templateId: row.templateId ?? undefined,
      title: row.title,
      personalInfo,
      education,
      experience,
      projects,
      skills,
      certificates,
      selfEvaluation: row.selfEvaluation,
      isDefault: row.isDefault,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getTemplates(): Promise<{ items: ResumeTemplate[] }> {
    try {
      const rows = await this.db
        .select({
          id: resumeTemplate.id,
          name: resumeTemplate.name,
          templateKey: resumeTemplate.templateKey,
          description: resumeTemplate.description,
          previewUrl: resumeTemplate.previewUrl,
          styleCategory: resumeTemplate.styleCategory,
          isActive: resumeTemplate.isActive,
        })
        .from(resumeTemplate)
        .where(eq(resumeTemplate.isActive, true))
        .orderBy(resumeTemplate.name);

      const items: ResumeTemplate[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        templateKey: row.templateKey,
        description: row.description,
        previewUrl: row.previewUrl,
        styleCategory: row.styleCategory,
        isActive: row.isActive,
      }));

      return { items };
    } catch (error) {
      this.logger.error('获取简历模板列表失败', error as Error);
      throw error;
    }
  }

  async listByUserId(userId: string): Promise<ResumeListResponse> {
    try {
      const rows = await this.db
        .select()
        .from(userResume)
        .where(eq(userResume.createdBy, userId))
        .orderBy(desc(userResume.isDefault), desc(userResume.createdAt));

      const [{ totalResult }] = await this.db
        .select({ totalResult: count() })
        .from(userResume)
        .where(eq(userResume.createdBy, userId));

      const items: UserResume[] = rows.map((row) => this.mapResume(row));

      return {
        items,
        total: Number(totalResult),
      };
    } catch (error) {
      this.logger.error(`获取简历列表失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  async findById(id: string, userId: string): Promise<UserResume> {
    try {
      const rows = await this.db
        .select()
        .from(userResume)
        .where(eq(userResume.id, id))
        .limit(1);

      if (rows.length === 0) {
        throw new NotFoundException('简历不存在');
      }

      const row = rows[0];
      if (row.createdBy !== userId) {
        throw new ForbiddenException('无权访问该简历');
      }

      return this.mapResume(row);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`获取简历详情失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async create(
    userId: string,
    dto: CreateResumeRequest,
  ): Promise<UserResume> {
    try {
      let personalInfo: ResumePersonalInfo = {
        name: '',
        phone: '',
        email: '',
        city: '',
        jobIntention: '',
        avatarUrl: '',
      };
      let education: ResumeEducationItem[] = [];
      let skills: ResumeSkillItem[] = [];
      let selfEvaluation = '';

      if (dto.generateFromProfile) {
        const profileRows = await this.db
          .select()
          .from(profile)
          .where(eq(profile.userId, userId))
          .limit(1);

        if (profileRows.length > 0) {
          const p = profileRows[0];
          personalInfo = {
            name: p.name,
            phone: p.contact,
            email: p.email,
            city: p.city,
            jobIntention: p.jobIntention,
            avatarUrl: '',
          };
          if (p.school || p.major || p.grade) {
            education = [
              {
                school: p.school,
                major: p.major,
                degree: p.department,
                startDate: '',
                endDate: p.grade,
                description: '',
              },
            ];
          }
          selfEvaluation = p.bio;
        }

        const skillRows = await this.db
          .select({ name: skill.name, masteryLevel: skill.masteryLevel })
          .from(skill)
          .where(eq(skill.createdBy, userId))
          .orderBy(desc(skill.masteryLevel));

        skills = skillRows.map((s) => ({
          name: s.name,
          level: mapMasteryToLevel(s.masteryLevel),
        }));
      }

      const isFirstResume = await this.checkIsFirstResume(userId);

      const inserted = await this.db
        .insert(userResume)
        .values({
          templateId: dto.templateId ?? null,
          title: dto.title,
          personalInfo: personalInfo as unknown as Record<string, unknown>,
          education: education as unknown as Record<string, unknown>[],
          experience: [] as unknown as Record<string, unknown>[],
          projects: [] as unknown as Record<string, unknown>[],
          skills: skills as unknown as Record<string, unknown>[],
          certificates: [] as unknown as Record<string, unknown>[],
          selfEvaluation,
          isDefault: isFirstResume,
        })
        .returning();

      return this.mapResume(inserted[0]);
    } catch (error) {
      this.logger.error(`创建简历失败 userId=${userId}`, error as Error);
      throw error;
    }
  }

  private async checkIsFirstResume(userId: string): Promise<boolean> {
    const [{ totalResult }] = await this.db
      .select({ totalResult: count() })
      .from(userResume)
      .where(eq(userResume.createdBy, userId));
    return Number(totalResult) === 0;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateResumeRequest,
  ): Promise<UserResume> {
    try {
      const existing = await this.db
        .select()
        .from(userResume)
        .where(eq(userResume.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('简历不存在');
      }
      if (existing[0].createdBy !== userId) {
        throw new ForbiddenException('无权修改该简历');
      }

      const patch: Partial<typeof userResume.$inferInsert> = {};
      if (dto.templateId !== undefined)
        patch.templateId = dto.templateId ?? null;
      if (dto.title !== undefined) patch.title = dto.title;
      if (dto.personalInfo !== undefined)
        patch.personalInfo =
          dto.personalInfo as unknown as Record<string, unknown>;
      if (dto.education !== undefined)
        patch.education = dto.education as unknown as Record<string, unknown>[];
      if (dto.experience !== undefined)
        patch.experience =
          dto.experience as unknown as Record<string, unknown>[];
      if (dto.projects !== undefined)
        patch.projects = dto.projects as unknown as Record<string, unknown>[];
      if (dto.skills !== undefined)
        patch.skills = dto.skills as unknown as Record<string, unknown>[];
      if (dto.certificates !== undefined)
        patch.certificates =
          dto.certificates as unknown as Record<string, unknown>[];
      if (dto.selfEvaluation !== undefined)
        patch.selfEvaluation = dto.selfEvaluation;
      if (dto.isDefault !== undefined) patch.isDefault = dto.isDefault;

      if (Object.keys(patch).length === 0) {
        return this.mapResume(existing[0]);
      }

      if (patch.isDefault === true) {
        await this.db
          .update(userResume)
          .set({ isDefault: false })
          .where(eq(userResume.createdBy, userId));
      }

      const updated = await this.db
        .update(userResume)
        .set(patch)
        .where(eq(userResume.id, id))
        .returning();

      return this.mapResume(updated[0]);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`更新简历失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const existing = await this.db
        .select()
        .from(userResume)
        .where(eq(userResume.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('简历不存在');
      }
      if (existing[0].createdBy !== userId) {
        throw new ForbiddenException('无权删除该简历');
      }

      const deleted = await this.db
        .delete(userResume)
        .where(and(eq(userResume.id, id), eq(userResume.createdBy, userId)))
        .returning({ id: userResume.id });

      if (deleted.length === 0) {
        throw new NotFoundException('简历不存在');
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`删除简历失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async setDefault(id: string, userId: string): Promise<UserResume> {
    try {
      const existing = await this.db
        .select()
        .from(userResume)
        .where(eq(userResume.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new NotFoundException('简历不存在');
      }
      if (existing[0].createdBy !== userId) {
        throw new ForbiddenException('无权修改该简历');
      }

      await this.db
        .update(userResume)
        .set({ isDefault: false })
        .where(eq(userResume.createdBy, userId));

      const updated = await this.db
        .update(userResume)
        .set({ isDefault: true })
        .where(eq(userResume.id, id))
        .returning();

      return this.mapResume(updated[0]);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`设置默认简历失败 id=${id}`, error as Error);
      throw error;
    }
  }

  async exportResume(
    id: string,
    userId: string,
    format: string,
  ): Promise<{ format: string; content: string; filename: string }> {
    const resume = await this.findById(id, userId);

    if (format !== 'markdown') {
      return {
        format,
        content: '',
        filename: `${resume.title}.${format}`,
      };
    }

    const content = this.generateMarkdown(resume);
    return {
      format: 'markdown',
      content,
      filename: `${resume.title}.md`,
    };
  }

  private generateMarkdown(resume: UserResume): string {
    const lines: string[] = [];

    const name = resume.personalInfo?.name || '';
    const jobIntention = resume.personalInfo?.jobIntention || '';
    const title = [name, jobIntention].filter(Boolean).join(' - ');
    if (title) {
      lines.push(`# ${title}`);
      lines.push('');
    }

    const contactParts: string[] = [];
    if (resume.personalInfo?.phone)
      contactParts.push(`📞 ${resume.personalInfo.phone}`);
    if (resume.personalInfo?.email)
      contactParts.push(`📧 ${resume.personalInfo.email}`);
    if (resume.personalInfo?.city)
      contactParts.push(`📍 ${resume.personalInfo.city}`);
    if (contactParts.length > 0) {
      lines.push(contactParts.join('  |  '));
      lines.push('');
    }

    if (resume.education && resume.education.length > 0) {
      lines.push('## 🎓 教育经历');
      lines.push('');
      for (const edu of resume.education) {
        const period = [edu.startDate, edu.endDate]
          .filter(Boolean)
          .join(' - ');
        const head = [edu.school, edu.major].filter(Boolean).join(' · ');
        if (head) {
          lines.push(`### ${head}`);
        }
        const meta = [edu.degree, period].filter(Boolean).join('  |  ');
        if (meta) {
          lines.push(`*${meta}*`);
        }
        if (edu.description) {
          lines.push('');
          lines.push(edu.description);
        }
        lines.push('');
      }
    }

    if (resume.experience && resume.experience.length > 0) {
      lines.push('## 💼 工作经历');
      lines.push('');
      for (const exp of resume.experience) {
        const period = [exp.startDate, exp.endDate]
          .filter(Boolean)
          .join(' - ');
        const head = [exp.company, exp.position].filter(Boolean).join(' · ');
        if (head) {
          lines.push(`### ${head}`);
        }
        if (period) {
          lines.push(`*${period}*`);
        }
        if (exp.description) {
          lines.push('');
          lines.push(exp.description);
        }
        lines.push('');
      }
    }

    if (resume.projects && resume.projects.length > 0) {
      lines.push('## 🚀 项目经历');
      lines.push('');
      for (const proj of resume.projects) {
        const period = [proj.startDate, proj.endDate]
          .filter(Boolean)
          .join(' - ');
        const head = [proj.name, proj.role].filter(Boolean).join(' · ');
        if (head) {
          lines.push(`### ${head}`);
        }
        if (period) {
          lines.push(`*${period}*`);
        }
        if (proj.description) {
          lines.push('');
          lines.push(proj.description);
        }
        if (proj.techStack && proj.techStack.length > 0) {
          lines.push('');
          lines.push(`**技术栈**：${proj.techStack.join('、')}`);
        }
        lines.push('');
      }
    }

    if (resume.skills && resume.skills.length > 0) {
      lines.push('## ⚡ 技能');
      lines.push('');
      for (const s of resume.skills) {
        lines.push(`- **${s.name}** — ${s.level}`);
      }
      lines.push('');
    }

    if (resume.certificates && resume.certificates.length > 0) {
      lines.push('## 🏆 证书');
      lines.push('');
      for (const c of resume.certificates) {
        const parts = [c.name, c.issuer, c.date].filter(Boolean).join(' · ');
        if (parts) {
          lines.push(`- ${parts}`);
        }
      }
      lines.push('');
    }

    if (resume.selfEvaluation) {
      lines.push('## ✍️ 自我评价');
      lines.push('');
      lines.push(resume.selfEvaluation);
      lines.push('');
    }

    return lines.join('\n');
  }
}
