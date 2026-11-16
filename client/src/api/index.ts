import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export * as financeNews from './finance-news';
export * as taskGroup from './task-group';
export * as careerPath from './career-path';
export * as resume from './resume';
export * as interview from './interview';
export * as checkin from './checkin';
export * as aiChat from './ai-chat';
export * as industryTrend from './industry-trend';
export * as mockInterview from './mock-interview';
export * as writtenExam from './written-exam';
export * as companyReview from './company-review';
export * as courseRec from './course-rec';
export * as wrongQuestion from './wrong-question';
export * as growthReport from './growth-report';
export * as salaryCalc from './salary-calc';
export * as calendar from './calendar';
export * as note from './note';
export * as knowledgeGraph from './knowledge-graph';
export * as learningPlan from './learning-plan';
export * as careerAssistant from './career-assistant';
export * as jobPush from './job-push';
export * as personalizedRec from './personalized-rec';
export * as competition from './competition';


// Add more API functions here, use axios instance (`axiosForBackend`) to make requests.
// 
// 使用示例：
// export async function getUserData(userId: string) {
//   try {
//     const response = await axiosForBackend({
//       url: `/api/users/${userId}`,
//       method: 'GET'
//     });
//     return response.data;
//   } catch (error) {
//     logger.error('获取用户数据失败', error);
//     throw error;
//   }
// }
