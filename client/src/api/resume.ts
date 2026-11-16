import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ResumeTemplate,
  UserResume,
  CreateResumeRequest,
  UpdateResumeRequest,
  ResumeListResponse,
} from '@shared/api.interface';

const BASE = '/api/resume';

export async function getTemplates(): Promise<{ items: ResumeTemplate[] }> {
  logger.info('获取简历模板列表');
  const resp = await axiosForBackend.get(`${BASE}/templates`);
  return resp.data;
}

export async function getResumeList(): Promise<ResumeListResponse> {
  logger.info('获取简历列表');
  const resp = await axiosForBackend.get(BASE);
  return resp.data;
}

export async function getResume(id: string): Promise<UserResume> {
  logger.info('获取简历详情', id);
  const resp = await axiosForBackend.get(`${BASE}/${id}`);
  return resp.data;
}

export async function createResume(
  data: CreateResumeRequest,
): Promise<UserResume> {
  logger.info('创建简历', data.title);
  const resp = await axiosForBackend.post(BASE, data);
  return resp.data;
}

export async function updateResume(
  id: string,
  data: UpdateResumeRequest,
): Promise<UserResume> {
  logger.info('更新简历', id);
  const resp = await axiosForBackend.patch(`${BASE}/${id}`, data);
  return resp.data;
}

export async function deleteResume(id: string): Promise<void> {
  logger.info('删除简历', id);
  await axiosForBackend.delete(`${BASE}/${id}`);
}

export async function setDefault(id: string): Promise<UserResume> {
  logger.info('设置默认简历', id);
  const resp = await axiosForBackend.post(`${BASE}/${id}/default`);
  return resp.data;
}

export async function exportResume(id: string): Promise<{
  format: string;
  content: string;
  filename: string;
}> {
  logger.info('导出简历', id);
  const resp = await axiosForBackend.get(`${BASE}/${id}/export`, {
    params: { format: 'markdown' },
  });
  return resp.data;
}
