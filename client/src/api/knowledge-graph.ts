import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { SkillGraphData, SkillGraphNodeDetail } from '@shared/api.interface';

export async function getKnowledgeGraph(category?: string, search?: string): Promise<SkillGraphData> {
  try {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (search) params.search = search;
    const res = await axiosForBackend.get('/api/knowledge-graph', { params });
    return res.data;
  } catch (error) {
    logger.error('获取知识图谱失败', error);
    throw error;
  }
}

export async function getNodeDetail(id: string): Promise<SkillGraphNodeDetail> {
  try {
    const res = await axiosForBackend.get(`/api/knowledge-graph/${id}`);
    return res.data;
  } catch (error) {
    logger.error('获取技能节点详情失败', error);
    throw error;
  }
}
