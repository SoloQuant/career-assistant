import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CareerPath,
  CareerStage,
  CareerPathWithStages,
  CreateCareerPathRequest,
  GenerateCareerPlanRequest,
  CareerPathListResponse,
} from '@shared/api.interface';

const BASE_PATH = '/api/career-path';

export async function getCareerPathList(): Promise<CareerPathListResponse> {
  logger.info('加载职业路径列表');
  const response = await axiosForBackend.get<CareerPathListResponse>(BASE_PATH);
  return response.data;
}

export async function getCareerPath(id: string): Promise<CareerPathWithStages> {
  logger.info('加载职业路径详情', id);
  const response = await axiosForBackend.get<CareerPathWithStages>(
    `${BASE_PATH}/${id}`,
  );
  return response.data;
}

export async function createCareerPath(
  data: CreateCareerPathRequest,
): Promise<CareerPathWithStages> {
  logger.info('创建职业路径', data.targetJob);
  const response = await axiosForBackend.post<CareerPathWithStages>(
    BASE_PATH,
    data,
  );
  return response.data;
}

export async function generatePlan(
  data: GenerateCareerPlanRequest,
): Promise<CareerPathWithStages> {
  logger.info('生成职业计划', data.targetJob);
  const response = await axiosForBackend.post<CareerPathWithStages>(
    `${BASE_PATH}/generate`,
    data,
  );
  return response.data;
}

export async function updateStageStatus(
  stageId: string,
  isCompleted: boolean,
): Promise<CareerStage> {
  logger.info('更新阶段状态', stageId, isCompleted);
  const response = await axiosForBackend.patch<CareerStage>(
    `${BASE_PATH}/stages/${stageId}/status`,
    { isCompleted },
  );
  return response.data;
}

export async function deleteCareerPath(id: string): Promise<void> {
  logger.info('删除职业路径', id);
  await axiosForBackend.delete(`${BASE_PATH}/${id}`);
}
