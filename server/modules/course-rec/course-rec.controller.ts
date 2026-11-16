import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { CourseRecService } from './course-rec.service';
import type {
  CourseItem,
  CourseListResponse,
} from '@shared/api.interface';

@Controller('api/course-rec')
export class CourseRecController {
  constructor(private readonly courseRecService: CourseRecService) {}

  @Get('platforms')
  async getPlatforms(): Promise<string[]> {
    return this.courseRecService.getPlatforms();
  }

  @Get('personalized/recommend')
  async getPersonalizedRecommend(
    @Query('targetSkills') targetSkillsStr?: string,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
  ): Promise<CourseListResponse> {
    const page = pageStr ? Number(pageStr) : 1;
    const pageSize = pageSizeStr ? Number(pageSizeStr) : 20;

    if (Number.isNaN(page) || page < 1) {
      throw new BadRequestException('页码无效');
    }
    if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('每页数量无效');
    }

    const targetSkills: string[] = targetSkillsStr
      ? targetSkillsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      : [];

    return this.courseRecService.getPersonalizedRecommend(targetSkills, page, pageSize);
  }

  @Get()
  async getList(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('skillName') skillName?: string,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('platform') platform?: string,
    @Query('sort') sort?: string,
  ): Promise<CourseListResponse> {
    const page = pageStr ? Number(pageStr) : 1;
    const pageSize = pageSizeStr ? Number(pageSizeStr) : 20;

    if (Number.isNaN(page) || page < 1) {
      throw new BadRequestException('页码无效');
    }
    if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('每页数量无效');
    }
    if (sort && sort !== 'priority' && sort !== 'rating' && sort !== 'studentCount') {
      throw new BadRequestException('排序参数无效');
    }

    return this.courseRecService.getList(page, pageSize, {
      skillName,
      category,
      difficulty,
      platform,
      sort,
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<CourseItem> {
    return this.courseRecService.getById(id);
  }
}
