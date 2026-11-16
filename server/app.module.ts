import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { ProfileModule } from './modules/profile/profile.module';
import { SkillModule } from './modules/skill/skill.module';
import { TaskModule } from './modules/task/task.module';
import { ApplicationModule } from './modules/application/application.module';
import { NewsModule } from './modules/news/news.module';
import { JobModule } from './modules/job/job.module';
import { ResourceModule } from './modules/resource/resource.module';
import { StatsModule } from './modules/stats/stats.module';
import { FinanceNewsModule } from './modules/finance-news/finance-news.module';
import { TaskGroupModule } from './modules/task-group/task-group.module';
import { CareerPathModule } from './modules/career-path/career-path.module';
import { ResumeModule } from './modules/resume/resume.module';
import { InterviewModule } from './modules/interview/interview.module';
import { CheckinModule } from './modules/checkin/checkin.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { IndustryTrendModule } from './modules/industry-trend/industry-trend.module';
import { MockInterviewModule } from './modules/mock-interview/mock-interview.module';
import { WrittenExamModule } from './modules/written-exam/written-exam.module';
import { CompanyReviewModule } from './modules/company-review/company-review.module';
import { CourseRecModule } from './modules/course-rec/course-rec.module';
import { WrongQuestionModule } from './modules/wrong-question/wrong-question.module';
import { GrowthReportModule } from './modules/growth-report/growth-report.module';
import { SalaryCalcModule } from './modules/salary-calc/salary-calc.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { NoteModule } from './modules/note/note.module';
import { KnowledgeGraphModule } from './modules/knowledge-graph/knowledge-graph.module';
import { LearningPlanModule } from './modules/learning-plan/learning-plan.module';
import { CareerAssistantModule } from './modules/career-assistant/career-assistant.module';
import { JobPushModule } from './modules/job-push/job-push.module';
import { PersonalizedRecModule } from './modules/personalized-rec/personalized-rec.module';
import { CompetitionModule } from './modules/competition/competition.module';

@Module({
  imports: [
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    ProfileModule,
    SkillModule,
    TaskModule,
    ApplicationModule,
    NewsModule,
    JobModule,
    ResourceModule,
    StatsModule,
    FinanceNewsModule,
    TaskGroupModule,
    CareerPathModule,
    ResumeModule,
    InterviewModule,
    CheckinModule,
    AiChatModule,
    IndustryTrendModule,
    MockInterviewModule,
    WrittenExamModule,
    CompanyReviewModule,
    CourseRecModule,
    WrongQuestionModule,
    GrowthReportModule,
    SalaryCalcModule,
    CalendarModule,
    NoteModule,
    KnowledgeGraphModule,
    LearningPlanModule,
    CareerAssistantModule,
    JobPushModule,
    PersonalizedRecModule,
    CompetitionModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
