import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CourseItem,
  CourseListResponse,
  PersonalizedCourseRequest,
} from '@shared/api.interface';

export async function getCourses(params: {
  page?: number;
  pageSize?: number;
  skillName?: string;
  category?: string;
  difficulty?: string;
  platform?: string;
  isFree?: boolean;
  sortBy?: string;
}): Promise<CourseListResponse> {
  const { data } = await axiosForBackend.get('/api/course-rec', { params });
  return data;
}

export async function getCourseDetail(id: string): Promise<CourseItem> {
  const { data } = await axiosForBackend.get(`/api/course-rec/${id}`);
  return data;
}

export async function getPersonalizedCourses(params: {
  page?: number;
  pageSize?: number;
  targetJob?: string;
}): Promise<CourseListResponse> {
  const { data } = await axiosForBackend.get('/api/course-rec/personalized/recommend', {
    params,
  });
  return data;
}

export async function getLearningPaths(): Promise<{
  paths: {
    name: string;
    description: string;
    skillSequence: string[];
    totalHours: number;
    difficulty: string;
  }[];
}> {
  const { data } = await axiosForBackend.get('/api/course-rec/learning-paths');
  return data;
}
