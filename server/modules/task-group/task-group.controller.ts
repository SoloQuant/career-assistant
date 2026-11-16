import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  NotFoundException, BadRequestException, Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  TaskGroup, TaskGroupSummary, TaskMilestone, TaskSubTask,
  CreateTaskGroupDto, UpdateTaskGroupDto, CreateMilestoneDto,
  UpdateMilestoneDto, CreateSubTaskDto, UpdateSubTaskDto,
  ReorderMilestonesDto, ReorderSubTasksDto, TaskSplitPreview,
  CreateTaskSplitDto, TaskOverviewStats, TaskSkillPreview,
  TaskGroupSkillsResult, SkillWithMastery, TasksBySkillResponse,
  UpdateSkillIdsDto,
} from '@shared/api.interface';
import { TaskGroupService } from './task-group.service';
import { TaskGroupSkillService } from './task-group-skill.service';

@Controller('api/task-groups')
export class TaskGroupController {
  constructor(
    private readonly service: TaskGroupService,
    private readonly skillService: TaskGroupSkillService,
  ) {}

  @Get()
  async list(): Promise<TaskGroupSummary[]> {
    return this.service.findAllGroups();
  }

  @Get('overview-stats')
  async overviewStats(): Promise<TaskOverviewStats> {
    return this.service.getOverviewStats();
  }

  @Get('skills/all')
  async listAllSkills(): Promise<SkillWithMastery[]> {
    return this.skillService.listAllSkills();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<TaskGroup> {
    const group = await this.service.findGroupById(id);
    if (!group) throw new NotFoundException('总任务不存在');
    return group;
  }

  @NeedLogin()
  @Post()
  async create(@Body() dto: CreateTaskGroupDto): Promise<TaskGroup> {
    if (!dto.title) throw new BadRequestException('title 为必填字段');
    if (!dto.milestones) throw new BadRequestException('milestones 为必填字段');
    return this.service.createGroup(dto);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskGroupDto,
  ): Promise<TaskGroupSummary> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    return this.service.updateGroup(id, dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.service.deleteGroup(id);
  }

  @NeedLogin()
  @Post('split-preview')
  async splitPreview(@Body() dto: CreateTaskSplitDto): Promise<TaskSplitPreview> {
    if (!dto.title) throw new BadRequestException('title 为必填字段');
    return this.service.splitTask(dto);
  }

  @NeedLogin()
  @Post('create-from-split')
  async createFromSplit(@Body() dto: CreateTaskGroupDto): Promise<TaskGroup> {
    if (!dto.title) throw new BadRequestException('title 为必填字段');
    return this.service.createFromSplit(dto);
  }

  @NeedLogin()
  @Post('split-preview-with-skills')
  async splitPreviewWithSkills(
    @Body() dto: CreateTaskSplitDto,
  ): Promise<TaskSkillPreview> {
    if (!dto.title) throw new BadRequestException('title 为必填字段');
    return this.skillService.splitPreviewWithSkills(dto);
  }

  @NeedLogin()
  @Post('create-with-skills')
  async createWithSkills(@Body() dto: CreateTaskGroupDto): Promise<TaskGroup> {
    if (!dto.title) throw new BadRequestException('title 为必填字段');
    if (!dto.milestones) throw new BadRequestException('milestones 为必填字段');
    return this.skillService.createGroupWithSkills(dto);
  }

  @Get(':id/skills')
  async getGroupSkills(
    @Param('id') id: string,
  ): Promise<TaskGroupSkillsResult> {
    return this.skillService.getSkillsByGroup(id);
  }

  @NeedLogin()
  @Put(':id/skills')
  async updateGroupSkills(
    @Param('id') id: string,
    @Body() dto: UpdateSkillIdsDto,
  ): Promise<SkillWithMastery[]> {
    if (!dto.skillIds || !Array.isArray(dto.skillIds)) {
      throw new BadRequestException('skillIds 为必填数组');
    }
    return this.skillService.updateGroupSkills(id, dto.skillIds);
  }

  @NeedLogin()
  @Put('milestones/:id/skills')
  async updateMilestoneSkills(
    @Param('id') id: string,
    @Body() dto: UpdateSkillIdsDto,
  ): Promise<SkillWithMastery[]> {
    if (!dto.skillIds || !Array.isArray(dto.skillIds)) {
      throw new BadRequestException('skillIds 为必填数组');
    }
    return this.skillService.updateMilestoneSkills(id, dto.skillIds);
  }

  @NeedLogin()
  @Put('sub-tasks/:id/skills')
  async updateSubTaskSkills(
    @Param('id') id: string,
    @Body() dto: UpdateSkillIdsDto,
  ): Promise<SkillWithMastery[]> {
    if (!dto.skillIds || !Array.isArray(dto.skillIds)) {
      throw new BadRequestException('skillIds 为必填数组');
    }
    return this.skillService.updateSubTaskSkills(id, dto.skillIds);
  }

  @Get('by-skill/:skillId')
  async getTasksBySkillId(
    @Param('skillId') skillId: string,
  ): Promise<TasksBySkillResponse> {
    return this.skillService.getTasksBySkillId(skillId);
  }

  @NeedLogin()
  @Post('milestones')
  async createMilestone(@Body() dto: CreateMilestoneDto): Promise<TaskMilestone> {
    if (!dto.groupId || !dto.title) {
      throw new BadRequestException('groupId 和 title 为必填字段');
    }
    return this.service.createMilestone(dto);
  }

  @NeedLogin()
  @Patch('milestones/:id')
  async updateMilestone(
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
  ): Promise<TaskMilestone> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    return this.service.updateMilestone(id, dto);
  }

  @NeedLogin()
  @Delete('milestones/:id')
  async deleteMilestone(@Param('id') id: string): Promise<{ id: string }> {
    return this.service.deleteMilestone(id);
  }

  @NeedLogin()
  @Post('milestones/reorder')
  async reorderMilestones(
    @Body() dto: ReorderMilestonesDto,
  ): Promise<{ success: true }> {
    if (!dto.orders || !Array.isArray(dto.orders)) {
      throw new BadRequestException('orders 为必填数组');
    }
    return this.service.reorderMilestones(dto);
  }

  @NeedLogin()
  @Post('sub-tasks')
  async createSubTask(@Body() dto: CreateSubTaskDto): Promise<TaskSubTask> {
    if (!dto.milestoneId || !dto.title) {
      throw new BadRequestException('milestoneId 和 title 为必填字段');
    }
    return this.service.createSubTask(dto);
  }

  @NeedLogin()
  @Patch('sub-tasks/:id')
  async updateSubTask(
    @Param('id') id: string,
    @Body() dto: UpdateSubTaskDto,
  ): Promise<TaskSubTask> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    return this.service.updateSubTask(id, dto);
  }

  @NeedLogin()
  @Delete('sub-tasks/:id')
  async deleteSubTask(@Param('id') id: string): Promise<{ id: string }> {
    return this.service.deleteSubTask(id);
  }

  @NeedLogin()
  @Post('sub-tasks/reorder')
  async reorderSubTasks(
    @Body() dto: ReorderSubTasksDto,
  ): Promise<{ success: true }> {
    if (!dto.orders || !Array.isArray(dto.orders)) {
      throw new BadRequestException('orders 为必填数组');
    }
    return this.service.reorderSubTasks(dto);
  }
}
