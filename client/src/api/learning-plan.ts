import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  LearningPlanListResponse,
  LearningPlanDetail,
  LearningPlanAdjustRequest,
} from '@shared/api.interface';

export async function getLearningPlans(): Promise<LearningPlanListResponse> {
  try {
    const res = await axiosForBackend.get('/api/learning-plan');
    return res.data;
  } catch (error) {
    logger.error('获取学习计划列表失败', error);
    throw error;
  }
}

export async function getCurrentPlan(): Promise<LearningPlanDetail> {
  try {
    const res = await axiosForBackend.get('/api/learning-plan/active/current');
    return res.data;
  } catch (error) {
    logger.error('获取当前学习计划失败', error);
    throw error;
  }
}

export async function getPlanDetail(id: string): Promise<LearningPlanDetail> {
  try {
    const res = await axiosForBackend.get(`/api/learning-plan/${id}`);
    return res.data;
  } catch (error) {
    logger.error('获取学习计划详情失败', error);
    throw error;
  }
}

export async function adjustPlanItem(itemId: string, data: LearningPlanAdjustRequest): Promise<void> {
  try {
    await axiosForBackend.patch(`/api/learning-plan/item/${itemId}/adjust`, data);
  } catch (error) {
    logger.error('调整学习计划失败', error);
    throw error;
  }
}

export async function replanLearningPlan(planId: string): Promise<LearningPlanDetail> {
  try {
    const res = await axiosForBackend.post('/api/learning-plan/replanning', { planId });
    return res.data;
  } catch (error) {
    logger.error('重新规划学习计划失败', error);
    throw error;
  }
}
