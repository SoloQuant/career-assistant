import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ExamQuestion,
  ExamRecord,
  ExamQuestionListResponse,
  ExamRecordListResponse,
  SubmitExamRequest,
} from '@shared/api.interface';

export async function getQuestions(params: {
  page?: number;
  pageSize?: number;
  category?: string;
  subCategory?: string;
  difficulty?: string;
}): Promise<ExamQuestionListResponse> {
  const { data } = await axiosForBackend.get('/api/written-exam/questions', { params });
  return data;
}

export async function getQuestionDetail(id: string): Promise<ExamQuestion> {
  const { data } = await axiosForBackend.get(`/api/written-exam/questions/${id}`);
  return data;
}

export async function getRecords(
  params: { page?: number; pageSize?: number } = {},
): Promise<ExamRecordListResponse> {
  const { data } = await axiosForBackend.get('/api/written-exam/records', { params });
  return data;
}

export async function getRecordDetail(id: string): Promise<ExamRecord> {
  const { data } = await axiosForBackend.get(`/api/written-exam/records/${id}`);
  return data;
}

export async function submitExam(
  payload: SubmitExamRequest,
): Promise<ExamRecord> {
  const { data } = await axiosForBackend.post('/api/written-exam/submit', payload);
  return data;
}

export async function getExamStats(): Promise<{
  totalAttempts: number;
  avgScore: number;
  bestScore: number;
  totalQuestions: number;
}> {
  const { data } = await axiosForBackend.get('/api/written-exam/stats');
  return data;
}
