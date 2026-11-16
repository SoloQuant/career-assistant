import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Skill, CreateSkillDto, UpdateSkillDto } from '@shared/api.interface';
import { SkillService } from './skill.service';

@Controller('api/skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get()
  async list(): Promise<Skill[]> {
    return this.skillService.findAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<Skill> {
    const skill: Skill | null = await this.skillService.findById(id);
    if (!skill) {
      throw new NotFoundException('技能不存在');
    }
    return skill;
  }

  @Post()
  async create(@Body() dto: CreateSkillDto): Promise<Skill> {
    if (!dto.name || !dto.category) {
      throw new BadRequestException('name 和 category 为必填字段');
    }
    return this.skillService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
  ): Promise<Skill> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    return this.skillService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.skillService.remove(id);
  }
}
