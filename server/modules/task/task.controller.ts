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
import type { Task, CreateTaskDto, UpdateTaskDto } from '@shared/api.interface';
import { TaskService } from './task.service';

@Controller('api/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  async list(): Promise<Task[]> {
    return this.taskService.findAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<Task> {
    const task: Task | null = await this.taskService.findById(id);
    if (!task) {
      throw new NotFoundException('任务不存在');
    }
    return task;
  }

  @Post()
  async create(@Body() dto: CreateTaskDto): Promise<Task> {
    if (!dto.title) {
      throw new BadRequestException('title 为必填字段');
    }
    return this.taskService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<Task> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    return this.taskService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.taskService.remove(id);
  }
}
