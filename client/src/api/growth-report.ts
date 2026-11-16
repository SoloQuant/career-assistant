import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  GrowthReportItem,
  GrowthReportListResponse,
  GenerateReportRequest,
} from '@shared/api.interface';

export async function getReports(params: {
  page?: number;
  pageSize?: number;
  reportType?: string;
}): Promise<GrowthReportListResponse> {
  const { data } = await axiosForBackend.get('/api/growth-report', { params });
  return data;
}

export async function getReportDetail(id: string): Promise<GrowthReportItem> {
  const { data } = await axiosForBackend.get(`/api/growth-report/${id}`);
  return data;
}

export async function generateReport(
  payload: GenerateReportRequest,
): Promise<GrowthReportItem> {
  const { data } = await axiosForBackend.post('/api/growth-report/generate', payload);
  return data;
}

export async function getLatestReport(reportType: string): Promise<GrowthReportItem> {
  const { data } = await axiosForBackend.get('/api/growth-report/latest/current', {
    params: { reportType },
  });
  return data;
}
