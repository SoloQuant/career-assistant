import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  SalaryCalcResult,
  SalaryCalcHistoryResponse,
  SalaryCalcRequest,
} from '@shared/api.interface';

export async function calculateSalary(payload: {
  city: string;
  grossSalary: number;
  fundRatio?: number;
  bonusMonth?: number;
  specialDeduction?: number;
}): Promise<SalaryCalcResult> {
  const { data } = await axiosForBackend.post('/api/salary-calc/calculate', payload);
  return data;
}

export async function getCityList(): Promise<{ city: string; socialBase: number; fundBase: number; fundRatio: number }[]> {
  const { data } = await axiosForBackend.get('/api/salary-calc/cities');
  return data;
}

export async function getHistory(
  params: { page?: number; pageSize?: number } = {},
): Promise<SalaryCalcHistoryResponse> {
  const { data } = await axiosForBackend.get('/api/salary-calc/history', { params });
  return data;
}

export async function getRecordDetail(id: string): Promise<SalaryCalcResult> {
  const { data } = await axiosForBackend.get(`/api/salary-calc/${id}`);
  return data;
}
