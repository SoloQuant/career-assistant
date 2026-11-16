import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CompanyReview,
  CompanyReviewListResponse,
  CreateCompanyReviewRequest,
} from '@shared/api.interface';

export async function getReviews(params: {
  page?: number;
  pageSize?: number;
  companyName?: string;
  overallRating?: number;
  overtimeLevel?: string;
  sortBy?: string;
}): Promise<CompanyReviewListResponse> {
  const { data } = await axiosForBackend.get('/api/company-review', { params });
  return data;
}

export async function getReviewDetail(id: string): Promise<CompanyReview> {
  const { data } = await axiosForBackend.get(`/api/company-review/${id}`);
  return data;
}

export async function createReview(
  payload: CreateCompanyReviewRequest,
): Promise<CompanyReview> {
  const { data } = await axiosForBackend.post('/api/company-review', payload);
  return data;
}

export async function markHelpful(id: string): Promise<{ helpfulCount: number }> {
  const { data } = await axiosForBackend.post(`/api/company-review/${id}/helpful`);
  return data;
}

export async function getCompanyStats(companyName: string): Promise<{
  companyName: string;
  reviewCount: number;
  avgOverallRating: number;
  avgWorkLifeBalanceRating: number;
  avgSalaryRating: number;
  avgGrowthRating: number;
  avgCultureRating: number;
}> {
  const { data } = await axiosForBackend.get('/api/company-review/stats/company', {
    params: { companyName },
  });
  return data;
}
