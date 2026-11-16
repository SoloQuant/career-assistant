import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  TaskGroup,
  TaskGroupSummary,
  TaskOverviewStats,
  TaskSplitPreview,
  TaskSkillPreview,
  CreateTaskGroupDto,
  CreateTaskSplitDto,
  UpdateTaskGroupDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CreateSubTaskDto,
  UpdateSubTaskDto,
  ReorderMilestonesDto,
  ReorderSubTasksDto,
  TaskMilestone,
  TaskSubTask,
  TaskGroupSkillsResult,
  SkillWithMastery,
  TasksBySkillResponse,
  UpdateSkillIdsDto,
} from '@shared/api.interface';

export async function listGroups(): Promise<TaskGroupSummary[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/task-groups',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取总任务列表失败', error);
    throw error;
  }
}

export async function getGroup(id: string): Promise<TaskGroup> {
  try {
    const response = await axiosForBackend({
      url: `/api/task-groups/${id}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取总任务详情失败', error);
    throw error;
  }
}

export async function createGroup(dto: CreateTaskGroupDto): Promise<TaskGroup> {
  try {
    const response = await axiosForBackend({
      url: '/api/task-groups',
      method: 'POST',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('创建总任务失败', error);
    throw error;
  }
}

export async function updateGroup(
  id: string,
  dto: UpdateTaskGroupDto,
): Promise<TaskGroup> {
  try {
    const response = await axiosForBackend({
      url: `/api/task-groups/${id}`,
      method: 'PATCH',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('更新总任务失败', error);
    throw error;
  }
}

export async function deleteGroup(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/task-groups/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除总任务失败', error);
    throw error;
  }
}

export async function splitPreview(
  dto: CreateTaskSplitDto,
): Promise<TaskSplitPreview> {
  try {
    const response = await axiosForBackend({
      url: '/api/task-groups/split-preview',
      method: 'POST',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('AI 拆分预览失败', error);
    throw error;
  }
}

export async function createFromSplit(
  dto: CreateTaskGroupDto,
): Promise<TaskGroup> {
  try {
    const response = await axiosForBackend({
      url: '/api/task-groups/create-from-split',
      method: 'POST',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('从拆分结果创建总任务失败', error);
    throw error;
  }
}

export async function createMilestone(
  dto: CreateMilestoneDto,
): Promise<TaskMilestone> {
  try {
    const response = await axiosForBackend({
      url: '/api/task-groups/milestones',
      method: 'POST',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('创建里程碑失败', error);
    throw error;
  }
}

export async function updateMilestone(
  id: string,
  dto: UpdateMilestoneDto,
): Promise<TaskMilestone> {
  try {
    const response = await axiosForBackend({
      url: `/api/task-groups/milestones/${id}`,
      method: 'PATCH',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('更新里程碑失败', error);
    throw error;
  }
}

export async function deleteMilestone(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/task-groups/milestones/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除里程碑失败', error);
    throw error;
  }
}

export async function reorderMilestones(
  dto: ReorderMilestonesDto,
): Promise<void> {
  try {
    await axiosForBackend({
      url: '/api/task-groups/milestones/reorder',
      method: 'POST',
      data: dto,
    });
  } catch (error) {
    logger.error('里程碑排序失败', error);
    throw error;
  }
}

export async function createSubTask(dto: CreateSubTaskDto): Promise<TaskSubTask> {
  try {
    const response = await axiosForBackend({
      url: '/api/task-groups/sub-tasks',
      method: 'POST',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('创建子任务失败', error);
    throw error;
  }
}

export async function updateSubTask(
  id: string,
  dto: UpdateSubTaskDto,
): Promise<TaskSubTask> {
  try {
    const response = await axiosForBackend({
      url: `/api/task-groups/sub-tasks/${id}`,
      method: 'PATCH',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('更新子任务失败', error);
    throw error;
  }
}

export async function deleteSubTask(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/task-groups/sub-tasks/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除子任务失败', error);
    throw error;
  }
}

export async function reorderSubTasks(dto: ReorderSubTasksDto): Promise<void> {
  try {
    await axiosForBackend({
      url: '/api/task-groups/sub-tasks/reorder',
      method: 'POST',
      data: dto,
    });
  } catch (error) {
    logger.error('子任务排序失败', error);
    throw error;
  }
}

export async function getOverviewStats(): Promise<TaskOverviewStats> {
  try {
    const response = await axiosForBackend({
      url: '/api/task-groups/overview-stats',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取总任务概览统计失败', error);
    throw error;
  }
}

export async function splitPreviewWithSkills(
  dto: CreateTaskSplitDto,
): Promise<TaskSkillPreview> {
  try {
    const response = await axiosForBackend({
      url: '/api/task-groups/split-preview-with-skills',
      method: 'POST',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('AI 拆分预览（含技能）失败', error);
    throw error;
  }
}

export async function createGroupWithSkills(
  dto: CreateTaskGroupDto,
): Promise<TaskGroup> {
  try {
    const response = await axiosForBackend({
      url: '/api/task-groups/create-with-skills',
      method: 'POST',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('创建带技能关联的总任务失败', error);
    throw error;
  }
}

export async function getGroupSkills(
  id: string,
): Promise<TaskGroupSkillsResult> {
  try {
    const response = await axiosForBackend({
      url: `/api/task-groups/${id}/skills`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error(`获取任务技能关联失败: ${id}`, error);
    throw error;
  }
}

export async function updateGroupSkills(
  id: string,
  skillIds: string[],
): Promise<SkillWithMastery[]> {
  try {
    const response = await axiosForBackend({
      url: `/api/task-groups/${id}/skills`,
      method: 'PUT',
      data: { skillIds } satisfies UpdateSkillIdsDto,
    });
    return response.data;
  } catch (error) {
    logger.error(`更新总任务技能关联失败: ${id}`, error);
    throw error;
  }
}

export async function updateMilestoneSkills(
  id: string,
  skillIds: string[],
): Promise<SkillWithMastery[]> {
  try {
    const response = await axiosForBackend({
      url: `/api/task-groups/milestones/${id}/skills`,
      method: 'PUT',
      data: { skillIds } satisfies UpdateSkillIdsDto,
    });
    return response.data;
  } catch (error) {
    logger.error(`更新里程碑技能关联失败: ${id}`, error);
    throw error;
  }
}

export async function updateSubTaskSkills(
  id: string,
  skillIds: string[],
): Promise<SkillWithMastery[]> {
  try {
    const response = await axiosForBackend({
      url: `/api/task-groups/sub-tasks/${id}/skills`,
      method: 'PUT',
      data: { skillIds } satisfies UpdateSkillIdsDto,
    });
    return response.data;
  } catch (error) {
    logger.error(`更新子任务技能关联失败: ${id}`, error);
    throw error;
  }
}

export async function getTasksBySkill(
  skillId: string,
): Promise<TasksBySkillResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/task-groups/by-skill/${skillId}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error(`获取技能关联任务失败: ${skillId}`, error);
    throw error;
  }
}

export async function listAllSkills(): Promise<SkillWithMastery[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/task-groups/skills/all',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取全部技能列表失败', error);
    throw error;
  }
}
