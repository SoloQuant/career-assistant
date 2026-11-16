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
import type { Application, CreateApplicationDto, UpdateApplicationDto } from '@shared/api.interface';
import { ApplicationService } from './application.service';

@Controller('api/applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  async list(): Promise<Application[]> {
    return this.applicationService.findAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<Application> {
    const app: Application | null = await this.applicationService.findById(id);
    if (!app) {
      throw new NotFoundException('投递记录不存在');
    }
    return app;
  }

  @Post()
  async create(@Body() dto: CreateApplicationDto): Promise<Application> {
    if (!dto.company || !dto.position) {
      throw new BadRequestException('company 和 position 为必填字段');
    }
    return this.applicationService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ): Promise<Application> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    return this.applicationService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.applicationService.remove(id);
  }
}
