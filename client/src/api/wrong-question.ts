import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  WrongQuestionItem,
  WrongQuestionListResponse,
  UpdateWrongQuestionRequest,
} from '@shared/api.interface';

export async function getWrongQuestions(params: {
  page?: number;
  pageSize?: number;
  source?: string;
  category?: string;
  masterLevel?: string;
}): Promise<WrongQuestionListResponse> {
  const { data } = await axiosForBackend.get('/api/wrong-question', { params });
  return data;
}

export async function getWrongQuestionDetail(id: string): Promise<WrongQuestionItem> {
  const { data } = await axiosForBackend.get(`/api/wrong-question/${id}`);
  return data;
}

export async function practice(id: string): Promise<WrongQuestionItem> {
  const { data } = await axiosForBackend.post(`/api/wrong-question/${id}/practice`);
  return data;
}

export async function markMastered(
  id: string,
  payload: { masterLevel: string },
): Promise<WrongQuestionItem> {
  const { data } = await axiosForBackend.patch(`/api/wrong-question/${id}/master`, payload);
  return data;
}

export async function removeWrongQuestion(id: string): Promise<void> {
  await axiosForBackend.delete(`/api/wrong-question/${id}`);
}

export async function getWrongQuestionStats(): Promise<{
  totalCount: number;
  masteredCount: number;
  reviewCount: number;
  byCategory: { category: string; count: number }[];
}> {
  const { data } = await axiosForBackend.get('/api/wrong-question/stats/summary');
  return data;
}
