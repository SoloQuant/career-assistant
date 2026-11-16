import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import SkillsPage from './pages/SkillsPage/SkillsPage';
import TasksPage from './pages/TasksPage/TasksPage';
import TaskGroupDetailPage from './pages/TasksPage/TaskGroupDetailPage';
import JobsPage from './pages/JobsPage/JobsPage';
import ApplicationsPage from './pages/ApplicationsPage/ApplicationsPage';
import JobHuntingPage from './pages/JobHuntingPage/JobHuntingPage';
import NewsPage from './pages/NewsPage/NewsPage';
import ResourcesPage from './pages/ResourcesPage/ResourcesPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import FinanceNewsPage from './pages/FinanceNewsPage/FinanceNewsPage';
import ImportantNewsPage from './pages/ImportantNewsPage/ImportantNewsPage';
import DesktopInstallPage from './pages/DesktopInstallPage/DesktopInstallPage';
import CareerPathPage from './pages/career-path';
import ResumePage from './pages/resume';
import InterviewPage from './pages/interview';
import CheckinPage from './pages/checkin';
import AiChatPage from './pages/ai-chat';
import IndustryTrendPage from './pages/industry-trend';
import MockInterviewPage from './pages/mock-interview';
import WrittenExamPage from './pages/written-exam';
import CompanyReviewPage from './pages/company-review';
import CourseRecPage from './pages/course-rec';
import WrongQuestionPage from './pages/wrong-question';
import GrowthReportPage from './pages/growth-report';
import SalaryCalcPage from './pages/salary-calc';
import CalendarPage from './pages/calendar';
import NotePage from './pages/note';
import CompetitivenessPage from './pages/competitiveness';
import CityCostPage from './pages/city-cost';
import JobCompetitionPage from './pages/job-competition';
import KnowledgeGraphPage from './pages/knowledge-graph';
import LearningPlanPage from './pages/learning-plan';
import CareerAssistantPage from './pages/career-assistant';
import JobPushPage from './pages/job-push';

import { registerServiceWorker } from './utils/pwa';

const RoutesComponent = () => {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/group/:id" element={<TaskGroupDetailPage />} />
        <Route path="career-path" element={<CareerPathPage />} />
        <Route path="resume" element={<ResumePage />} />
        <Route path="interview" element={<InterviewPage />} />
        <Route path="checkin" element={<CheckinPage />} />
        <Route path="ai-chat" element={<AiChatPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="job-hunting" element={<JobHuntingPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="finance-news" element={<FinanceNewsPage />} />
        <Route path="important-news" element={<ImportantNewsPage />} />
        <Route path="industry-trend" element={<IndustryTrendPage />} />
        <Route path="mock-interview" element={<MockInterviewPage />} />
        <Route path="written-exam" element={<WrittenExamPage />} />
        <Route path="company-review" element={<CompanyReviewPage />} />
        <Route path="course-rec" element={<CourseRecPage />} />
        <Route path="wrong-question" element={<WrongQuestionPage />} />
        <Route path="growth-report" element={<GrowthReportPage />} />
        <Route path="salary-calc" element={<SalaryCalcPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="note" element={<NotePage />} />
        <Route path="competitiveness" element={<CompetitivenessPage />} />
        <Route path="city-cost" element={<CityCostPage />} />
        <Route path="job-competition" element={<JobCompetitionPage />} />
        <Route path="knowledge-graph" element={<KnowledgeGraphPage />} />
        <Route path="learning-plan" element={<LearningPlanPage />} />
        <Route path="career-assistant" element={<CareerAssistantPage />} />
        <Route path="job-push" element={<JobPushPage />} />
        <Route path="desktop-install" element={<DesktopInstallPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
