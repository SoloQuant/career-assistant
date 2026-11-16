export interface KnowledgePoint {
  name: string;
  mastered: boolean;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  masteryLevel: number;
  knowledgePoints: KnowledgePoint[];
  selfRating: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillCategoryInfo {
  key: string;
  label: string;
}

export const SKILL_CATEGORIES: SkillCategoryInfo[] = [
  { key: 'programming_language', label: '编程语言' },
  { key: 'bigdata_framework', label: '大数据框架' },
  { key: 'database', label: '数据库' },
  { key: 'machine_learning', label: '机器学习' },
  { key: 'visualization', label: '可视化' },
  { key: 'data_it_other', label: '数据与IT其他' },
  { key: 'finance', label: '金融类' },
  { key: 'economics_business', label: '经济与商业' },
  { key: 'office_skills', label: '通用办公技能' },
  { key: 'language_communication', label: '语言与沟通' },
  { key: 'soft_skill', label: '软技能' },
  { key: 'certification', label: '证书与资质' },
];

export interface Profile {
  id: string;
  userId: string;
  name: string;
  school: string;
  department: string;
  major: string;
  grade: string;
  city: string;
  jobIntention: string;
  contact: string;
  email: string;
  bio: string;
}

export interface ProfileUpdateDto {
  name?: string;
  school?: string;
  department?: string;
  major?: string;
  grade?: string;
  city?: string;
  jobIntention?: string;
  contact?: string;
  email?: string;
  bio?: string;
}

export interface CreateSkillDto {
  name: string;
  category: string;
  description?: string;
  knowledgePoints?: KnowledgePoint[];
}

export interface UpdateSkillDto {
  name?: string;
  category?: string;
  description?: string;
  knowledgePoints?: KnowledgePoint[];
  selfRating?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  relatedSkills: string[];
  estimatedTime: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  taskType: 'learning' | 'job_search';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  relatedSkills?: string[];
  estimatedTime?: number;
  priority?: 'low' | 'medium' | 'high';
  taskType?: 'learning' | 'job_search';
  dueDate?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  relatedSkills?: string[];
  estimatedTime?: number;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed';
  taskType?: 'learning' | 'job_search';
  dueDate?: string;
}

export interface TaskSubTask {
  id: string;
  milestoneId: string;
  groupId: string;
  title: string;
  description: string;
  sortOrder: number;
  estimatedMinutes: number;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  relatedSkillIds: string[];
}

export interface TaskMilestone {
  id: string;
  groupId: string;
  title: string;
  description: string;
  sortOrder: number;
  totalSubTasks: number;
  completedSubTasks: number;
  progress: number;
  subTasks: TaskSubTask[];
  relatedSkillIds: string[];
}

export interface TaskGroup {
  id: string;
  title: string;
  description: string;
  relatedSkills: string[];
  relatedSkillIds: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  totalMilestones: number;
  totalSubTasks: number;
  completedSubTasks: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
  milestones: TaskMilestone[];
}

export interface TaskGroupSummary {
  id: string;
  title: string;
  description: string;
  relatedSkills: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  totalMilestones: number;
  totalSubTasks: number;
  completedSubTasks: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskGroupDto {
  title: string;
  description?: string;
  relatedSkills?: string[];
  skillIds?: string[];
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  milestones: Array<{
    title: string;
    description?: string;
    sortOrder?: number;
    skillIds?: string[];
    subTasks: Array<{
      title: string;
      description?: string;
      estimatedMinutes?: number;
      sortOrder?: number;
      skillIds?: string[];
    }>;
  }>;
}

export interface TaskSplitPreview {
  milestones: Array<{
    name: string;
    description: string;
    skillNames: string[];
    subTasks: Array<{
      name: string;
      description: string;
      estimatedMinutes: number;
      skillNames: string[];
    }>;
  }>;
}

export interface SkillWithMastery {
  id: string;
  name: string;
  category: string;
  masteryLevel: number;
}

export interface TaskSkillPreview {
  overallSkillNames: string[];
  milestones: Array<{
    name: string;
    description: string;
    skillNames: string[];
    subTasks: Array<{
      name: string;
      description: string;
      estimatedMinutes: number;
      skillNames: string[];
    }>;
  }>;
}

export interface TaskGroupSkillsResult {
  groupSkills: SkillWithMastery[];
  milestoneSkillsMap: Record<string, SkillWithMastery[]>;
  subTaskSkillsMap: Record<string, SkillWithMastery[]>;
}

export interface TaskMilestoneWithGroup {
  id: string;
  title: string;
  groupId: string;
  groupTitle: string;
  progress: number;
}

export interface TaskSubTaskWithParents {
  id: string;
  title: string;
  milestoneId: string;
  milestoneTitle: string;
  groupId: string;
  groupTitle: string;
  isCompleted: boolean;
}

export interface TasksBySkillResponse {
  groups: TaskGroupSummary[];
  milestones: TaskMilestoneWithGroup[];
  subTasks: TaskSubTaskWithParents[];
}

export interface UpdateSkillIdsDto {
  skillIds: string[];
}

export interface CreateTaskSplitDto {
  title: string;
  description?: string;
  relatedSkills?: string[];
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface UpdateTaskGroupDto {
  title?: string;
  description?: string;
  relatedSkills?: string[];
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
}

export interface CreateMilestoneDto {
  groupId: string;
  title: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateMilestoneDto {
  title?: string;
  description?: string;
  sortOrder?: number;
}

export interface CreateSubTaskDto {
  milestoneId: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  sortOrder?: number;
}

export interface UpdateSubTaskDto {
  title?: string;
  description?: string;
  estimatedMinutes?: number;
  sortOrder?: number;
  isCompleted?: boolean;
}

export interface ReorderMilestonesDto {
  orders: Array<{ id: string; sortOrder: number }>;
}

export interface ReorderSubTasksDto {
  orders: Array<{ id: string; sortOrder: number }>;
}

export interface TaskOverviewStats {
  totalGroups: number;
  activeGroups: number;
  completedGroups: number;
  totalSubTasks: number;
  completedSubTasks: number;
  overallProgress: number;
}

export interface Application {
  id: string;
  company: string;
  position: string;
  city: string;
  salary: string;
  applicationDate: string;
  status: 'submitted' | 'written_test' | 'interview' | 'offer' | 'rejection';
  applicationType: 'campus' | 'internship' | 'full_time';
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationDto {
  company: string;
  position: string;
  city?: string;
  salary?: string;
  applicationDate?: string;
  status?: 'submitted' | 'written_test' | 'interview' | 'offer' | 'rejection';
  applicationType?: 'campus' | 'internship' | 'full_time';
  source?: string;
  notes?: string;
}

export interface UpdateApplicationDto {
  company?: string;
  position?: string;
  city?: string;
  salary?: string;
  applicationDate?: string;
  status?: 'submitted' | 'written_test' | 'interview' | 'offer' | 'rejection';
  applicationType?: 'campus' | 'internship' | 'full_time';
  source?: string;
  notes?: string;
}

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  submitted: '已投递',
  written_test: '笔试',
  interview: '面试',
  offer: 'Offer',
  rejection: '拒信',
};

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  url: string;
  category: string;
  tags: string[];
  publishDate: string;
}

export const NEWS_CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'industry', label: '行业动态' },
  { key: 'technology', label: '技术趋势' },
  { key: 'policy', label: '政策动态' },
  { key: 'recruitment', label: '招聘信息' },
];

export interface JobItem {
  id: string;
  title: string;
  company: string;
  city: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  requirements: string;
  description: string;
  requiredSkills: string[];
  jobType: string;
  source: string;
  applyUrl: string;
  publishDate: string;
  matchScore?: number;
  matchReasons?: string[];
  gapSkills?: string[];
}

export interface JobFilterParams {
  city?: string;
  jobType?: string;
  salaryMin?: number;
  salaryMax?: number;
  source?: string;
}

export const JOB_SOURCE_OPTIONS: SkillCategoryInfo[] = [
  { key: 'all', label: '全部来源' },
  { key: '中国大学生就业平台', label: '中国大学生就业平台' },
  { key: '智联招聘', label: '智联招聘' },
  { key: 'BOSS直聘', label: 'BOSS直聘' },
  { key: '猎聘', label: '猎聘' },
  { key: '前程无忧', label: '前程无忧' },
  { key: '企业官网', label: '企业官网' },
];

export interface LearningResource {
  id: string;
  name: string;
  platform: string;
  category: string;
  isFree: boolean;
  relatedSkill: string;
  url: string;
  description: string;
  duration: string;
}

export const RESOURCE_CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'python', label: 'Python' },
  { key: 'database', label: 'SQL/数据库' },
  { key: 'bigdata_framework', label: 'Hadoop/Spark' },
  { key: 'machine_learning', label: '机器学习' },
  { key: 'bigdata', label: '大数据综合' },
  { key: 'finance', label: '金融类' },
  { key: 'economics', label: '经济与商业' },
  { key: 'office', label: '通用办公' },
  { key: 'language', label: '语言学习' },
];

export interface SkillAssessmentHistory {
  id: string;
  skillId: string;
  masteryLevel: number;
  assessmentDate: string;
}

export interface SkillGrowthDataPoint {
  date: string;
  totalMastery: number;
  skillsCount: number;
}

export interface ApplicationStats {
  submitted: number;
  writtenTest: number;
  interview: number;
  offer: number;
  rejection: number;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionRate: number;
}

export interface RadarChartData {
  category: string;
  value: number;
}

export interface ResumeData {
  profile: Profile;
  skills: Skill[];
  tasks: Task[];
  applications: Application[];
}

export interface FinanceNewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  sourceUrl: string;
  category: string;
  tags: string[];
  isImportant: boolean;
  importanceScore: number;
  importantCategory?: string;
  publishDate: string;
}

export interface FinanceNewsListResponse {
  items: FinanceNewsItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const FINANCE_NEWS_SOURCES = [
  { key: 'all', label: '全部来源', color: 'cyan' },
  { key: '中国新闻网', label: '中国新闻网', color: 'red', highlight: true },
  { key: '中新网财经', label: '中新网财经', color: 'orange' },
  { key: '新浪财经', label: '新浪财经', color: 'amber' },
  { key: '新浪科技', label: '新浪科技', color: 'blue' },
  { key: '新浪国内', label: '新浪国内', color: 'red' },
  { key: '新浪国际', label: '新浪国际', color: 'slate' },
  { key: '钛媒体', label: '钛媒体', color: 'violet' },
  { key: '爱范儿', label: '爱范儿', color: 'purple' },
  { key: '雷锋网', label: '雷锋网', color: 'indigo' },
];

export const IMPORTANT_NEWS_CATEGORIES = [
  { key: 'all', label: '全部重要', icon: 'Zap' },
  { key: 'policy', label: '政策动态', icon: 'Gavel' },
  { key: 'market', label: '市场要闻', icon: 'TrendingUp' },
  { key: 'industry', label: '行业大事', icon: 'Building2' },
  { key: 'company', label: '公司重磅', icon: 'Briefcase' },
  { key: 'economy_data', label: '经济数据', icon: 'BarChart3' },
];

export interface NewsFetchLog {
  id: string;
  source: string;
  fetchedAt: string;
  newCount: number;
  status: 'success' | 'failed';
  errorMsg?: string;
}

export interface NewsRefreshStatus {
  lastRefreshAt: string;
  isRefreshing: boolean;
  todayImportantCount: number;
  todayTotalCount: number;
}

export interface NewsRefreshResult {
  success: boolean;
  newCount: number;
  lastRefreshAt: string;
}

// ==================== Career Path ====================

export interface CareerPath {
  id: string;
  title: string;
  targetJob: string;
  description: string;
  durationMonths: number;
  status: 'planning' | 'in_progress' | 'completed' | 'paused';
  currentStage: number;
  totalStages: number;
  createdAt: string;
}

export interface CareerStage {
  id: string;
  pathId: string;
  title: string;
  description: string;
  sortOrder: number;
  durationWeeks: number;
  requiredSkills: string[];
  tasks: string[];
  resources: string[];
  isCompleted: boolean;
  completedAt?: string;
}

export interface CareerPathWithStages extends CareerPath {
  stages: CareerStage[];
}

export interface CreateCareerPathRequest {
  targetJob: string;
  title?: string;
  durationMonths?: number;
  currentSkills?: string[];
}

export interface GenerateCareerPlanRequest {
  targetJob: string;
  currentSkills: string[];
  durationMonths: number;
}

export interface CareerPathListResponse {
  items: CareerPath[];
  total: number;
}

export interface UpdateStageStatusRequest {
  isCompleted: boolean;
}

// ==================== Resume ====================

export interface ResumeTemplate {
  id: string;
  name: string;
  templateKey: string;
  description: string;
  previewUrl: string;
  styleCategory: string;
  isActive: boolean;
}

export interface ResumePersonalInfo {
  name: string;
  phone: string;
  email: string;
  city: string;
  jobIntention: string;
  avatarUrl: string;
}

export interface ResumeEducationItem {
  school: string;
  major: string;
  degree: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ResumeExperienceItem {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ResumeProjectItem {
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  techStack: string[];
}

export interface ResumeSkillItem {
  name: string;
  level: string;
}

export interface ResumeCertificateItem {
  name: string;
  issuer: string;
  date: string;
}

export interface UserResume {
  id: string;
  templateId?: string;
  title: string;
  personalInfo: ResumePersonalInfo;
  education: ResumeEducationItem[];
  experience: ResumeExperienceItem[];
  projects: ResumeProjectItem[];
  skills: ResumeSkillItem[];
  certificates: ResumeCertificateItem[];
  selfEvaluation: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateResumeRequest {
  templateId?: string;
  title: string;
  generateFromProfile?: boolean;
}

export interface UpdateResumeRequest {
  templateId?: string;
  title?: string;
  personalInfo?: Partial<ResumePersonalInfo>;
  education?: ResumeEducationItem[];
  experience?: ResumeExperienceItem[];
  projects?: ResumeProjectItem[];
  skills?: ResumeSkillItem[];
  certificates?: ResumeCertificateItem[];
  selfEvaluation?: string;
  isDefault?: boolean;
}

export interface ResumeListResponse {
  items: UserResume[];
  total: number;
}

export interface ResumeExportRequest {
  resumeId: string;
  format: 'pdf' | 'html' | 'markdown';
}

// ==================== Interview ====================

export interface InterviewQuestion {
  id: string;
  title: string;
  content: string;
  answer: string;
  category: 'technical' | 'behavior' | 'hr';
  jobType: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  source: string;
}

export interface InterviewRecord {
  id: string;
  questionId: string;
  status: 'unattempted' | 'correct' | 'wrong' | 'marked';
  isFavorite: boolean;
  isWrong: boolean;
  userAnswer: string;
  note: string;
  attemptCount: number;
  lastAttemptAt?: string;
}

export interface InterviewQuestionWithRecord extends InterviewQuestion {
  record?: InterviewRecord;
}

export interface InterviewListResponse {
  items: InterviewQuestionWithRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InterviewListParams {
  category?: string;
  jobType?: string;
  difficulty?: string;
  isFavorite?: boolean;
  isWrong?: boolean;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateInterviewRecordRequest {
  status?: 'unattempted' | 'correct' | 'wrong' | 'marked';
  isFavorite?: boolean;
  isWrong?: boolean;
  userAnswer?: string;
  note?: string;
}

export interface InterviewStats {
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  favorite: number;
  correctRate: number;
}

// ==================== Study Checkin ====================

export interface StudyCheckin {
  id: string;
  checkinDate: string;
  durationMinutes: number;
  content: string;
  relatedSkills: string[];
  mood: 'great' | 'good' | 'normal' | 'tired' | 'bad';
  createdAt: string;
}

export interface CreateCheckinRequest {
  checkinDate: string;
  durationMinutes: number;
  content: string;
  relatedSkills?: string[];
  mood?: 'great' | 'good' | 'normal' | 'tired' | 'bad';
}

export interface UpdateCheckinRequest {
  durationMinutes?: number;
  content?: string;
  relatedSkills?: string[];
  mood?: 'great' | 'good' | 'normal' | 'tired' | 'bad';
}

export interface CheckinStats {
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  thisMonthDays: number;
  thisMonthMinutes: number;
}

export interface CheckinCalendarResponse {
  year: number;
  month: number;
  days: { date: string; checkedIn: boolean; durationMinutes: number }[];
}

export interface CheckinListResponse {
  items: StudyCheckin[];
  total: number;
}

// ==================== AI Chat ====================

export interface AiChatSession {
  id: string;
  title: string;
  contextType: string;
  contextData: Record<string, string>;
  lastMessageAt?: string;
  createdAt: string;
}

export interface AiChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  sortOrder: number;
  createdAt: string;
}

export interface CreateSessionRequest {
  title?: string;
  contextType?: string;
  contextData?: Record<string, string>;
}

export interface SendMessageRequest {
  sessionId: string;
  content: string;
}

export interface ChatSessionListResponse {
  items: AiChatSession[];
  total: number;
}

export interface ChatMessageListResponse {
  items: AiChatMessage[];
  total: number;
}

// ==================== Industry Trend ====================

export interface IndustryTrendItem {
  id: string;
  jobType: string;
  city: string;
  period: string;
  avgSalary: number;
  demandCount: number;
  topSkills: string[];
  trendDirection: 'rising' | 'stable' | 'declining';
  trendPercentage: number;
}

export interface TrendListParams {
  jobType?: string;
  city?: string;
  period?: string;
}

export interface SalaryPredictionResult {
  city: string;
  jobType: string;
  skills: string[];
  experienceYears: number;
  predictedMin: number;
  predictedMax: number;
  predictedAvg: number;
  confidence: number;
  factors: {
    topPositive: string[];
    topNegative: string[];
  };
}

export interface SalaryPredictionRequest {
  city: string;
  jobType: string;
  skills: string[];
  experienceYears: number;
}

export interface SkillJobHeatmapItem {
  skillName: string;
  jobTypes: { jobType: string; matchRate: number; avgSalary: number }[];
}

// ==================== Milestone Reminder ====================

export interface MilestoneReminder {
  id: string;
  milestoneId: string;
  remindDaysBefore: number;
  isEnabled: boolean;
  lastRemindedAt?: string;
}

export interface UpdateReminderRequest {
  remindDaysBefore?: number;
  isEnabled?: boolean;
}

// ==================== Dashboard ====================

export interface DashboardData {
  todayTasks: { id: string; title: string; groupTitle: string; dueDate?: string; priority: string }[];
  skillOverview: { total: number; mastered: number; inProgress: number; avgMastery: number };
  recommendedJobs: { id: string; title: string; company: string; salary: string; matchScore: number }[];
  checkinStatus: { checkedInToday: boolean; currentStreak: number; todayMinutes: number };
  importantNews: { id: string; title: string; source: string; publishDate: string }[];
  upcomingMilestones: { id: string; title: string; groupTitle: string; dueDate?: string; daysLeft: number }[];
}

// ==================== Mock Interview ====================

export interface MockInterviewSession {
  id: string;
  jobType: string;
  interviewType: 'technical' | 'hr' | 'project';
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  score?: number;
  feedback?: string;
  strengths?: string;
  weaknesses?: string;
  suggestions?: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface MockInterviewMessage {
  id: string;
  sessionId: string;
  role: 'interviewer' | 'candidate' | 'system';
  content: string;
  questionIndex: number;
  sortOrder: number;
  createdAt: string;
}

export interface CreateMockInterviewRequest {
  jobType: string;
  interviewType: 'technical' | 'hr' | 'project';
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions?: number;
}

export interface SubmitAnswerRequest {
  sessionId: string;
  answer: string;
}

export interface InterviewSessionListResponse {
  items: MockInterviewSession[];
  total: number;
}

// ==================== Written Exam ====================

export interface ExamQuestion {
  id: string;
  category: string;
  subCategory?: string;
  questionType: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'coding';
  title: string;
  options: { label: string; value: string }[];
  correctAnswer: string;
  analysis?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  timeLimitSeconds?: number;
  tags: string[];
}

export interface ExamRecord {
  id: string;
  title: string;
  category: string;
  totalScore: number;
  userScore: number;
  correctCount: number;
  totalCount: number;
  timeSpentSeconds: number;
  answers: { questionId: string; userAnswer: string; isCorrect: boolean }[];
  status: 'in_progress' | 'finished';
  createdAt: string;
}

export interface ExamQuestionListResponse {
  items: ExamQuestion[];
  total: number;
}

export interface ExamRecordListResponse {
  items: ExamRecord[];
  total: number;
}

export interface StartExamRequest {
  category: string;
  title: string;
  questionIds?: string[];
}

export interface SubmitExamRequest {
  recordId: string;
  answers: { questionId: string; userAnswer: string }[];
  timeSpentSeconds: number;
}

// ==================== Company Review ====================

export interface CompanyReview {
  id: string;
  companyName: string;
  companyId?: string;
  overallRating: number;
  workLifeBalanceRating?: number;
  salaryRating?: number;
  growthRating?: number;
  cultureRating?: number;
  overtimeLevel?: string;
  realSalary?: string;
  interviewExperience?: string;
  pros?: string;
  cons?: string;
  jobTitle?: string;
  employmentStatus?: string;
  isAnonymous: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface CreateCompanyReviewRequest {
  companyName: string;
  overallRating: number;
  workLifeBalanceRating?: number;
  salaryRating?: number;
  growthRating?: number;
  cultureRating?: number;
  overtimeLevel?: string;
  realSalary?: string;
  interviewExperience?: string;
  pros?: string;
  cons?: string;
  jobTitle?: string;
  employmentStatus?: string;
  isAnonymous?: boolean;
}

export interface CompanyReviewListResponse {
  items: CompanyReview[];
  total: number;
}

// ==================== Course Recommendation ====================

export interface CourseItem {
  id: string;
  title: string;
  platform: string;
  platformUrl?: string;
  skillName: string;
  category?: string;
  difficulty: 'beginner' | 'intermediate' | 'hard';
  estimatedHours?: number;
  priority: number;
  description?: string;
  coverUrl?: string;
  rating?: number;
  studentCount?: number;
  instructor?: string;
  isFree: boolean;
  tags: string[];
  createdAt: string;
}

export interface CourseListResponse {
  items: CourseItem[];
  total: number;
}

export interface PersonalizedCourseRequest {
  targetSkills?: string[];
  skillGaps?: string[];
}

// ==================== Wrong Question ====================

export interface WrongQuestionItem {
  id: string;
  sourceType: 'interview' | 'exam';
  sourceId: string;
  questionTitle: string;
  questionContent?: string;
  userAnswer?: string;
  correctAnswer?: string;
  analysis?: string;
  wrongCount: number;
  isMastered: boolean;
  category?: string;
  tags: string[];
  lastWrongAt: string;
  createdAt: string;
}

export interface WrongQuestionListResponse {
  items: WrongQuestionItem[];
  total: number;
}

export interface AddWrongQuestionRequest {
  sourceType: 'interview' | 'exam';
  sourceId: string;
  questionTitle: string;
  questionContent?: string;
  userAnswer?: string;
  correctAnswer?: string;
  analysis?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateWrongQuestionRequest {
  isMastered?: boolean;
  wrongCount?: number;
}

// ==================== Growth Report ====================

export interface GrowthReportItem {
  id: string;
  reportType: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  skillsGained: { name: string; level: number }[];
  skillsImproved: { name: string; before: number; after: number }[];
  taskCompletionRate: number;
  checkinDays: number;
  totalStudyMinutes: number;
  applicationCount: number;
  interviewCount: number;
  offerCount: number;
  summary?: string;
  highlights?: string;
  improvements?: string;
  nextGoals?: string;
  createdAt: string;
}

export interface GrowthReportListResponse {
  items: GrowthReportItem[];
  total: number;
}

export interface GenerateReportRequest {
  reportType: 'weekly' | 'monthly';
  periodStart?: string;
  periodEnd?: string;
}

// ==================== City Cost of Living ====================

export interface CityCostItem {
  id: string;
  city: string;
  avgRent: number;
  avgFood: number;
  avgTransport: number;
  avgUtilities: number;
  avgEntertainment: number;
  avgTotal: number;
  costIndex: number;
  avgSalary: number;
  disposableIncome: number;
  createdAt: string;
}

// ==================== Job Competition ====================

export interface JobCompetitionItem {
  id: string;
  jobTitle: string;
  jobType?: string;
  city?: string;
  totalApplicants: number;
  totalPositions: number;
  acceptanceRate: number;
  hotLevel: 'cold' | 'medium' | 'hot' | 'very_hot';
  hotScore: number;
  avgSalary?: number;
  trendDirection?: 'rising' | 'stable' | 'declining';
  trendPercentage?: number;
  requiredSkills: string[];
  createdAt: string;
}

export interface JobCompetitionListResponse {
  items: JobCompetitionItem[];
  total: number;
}

// ==================== Calendar Event ====================

export interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  relatedTaskId?: string;
  relatedCompany?: string;
  priority: 'low' | 'medium' | 'high';
  isAllDay: boolean;
  reminderMinutesBefore?: number;
  isReminderSent: boolean;
  color?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  eventType?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  relatedTaskId?: string;
  relatedCompany?: string;
  priority?: 'low' | 'medium' | 'high';
  isAllDay?: boolean;
  reminderMinutesBefore?: number;
  color?: string;
}

// ==================== Note ====================

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  wordCount: number;
  relatedSkill?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  title: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPinned?: boolean;
  relatedSkill?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPinned?: boolean;
  relatedSkill?: string;
}

export interface NoteListResponse {
  items: NoteItem[];
  total: number;
}

// ==================== Salary Calculator ====================

export interface SalaryCalcResult {
  id?: string;
  city: string;
  grossSalary: number;
  socialInsurance: number;
  housingFund: number;
  incomeTax: number;
  netSalary: number;
  socialBase?: number;
  fundBase?: number;
  fundRatio?: number;
  yearEndBonus?: number;
  annualNetIncome?: number;
  details: {
    pension: number;
    medical: number;
    unemployment: number;
    injury: number;
    maternity: number;
    specialDeduction: number;
    taxBracket: string;
  };
  createdAt?: string;
}

export interface SalaryCalcRequest {
  city: string;
  grossSalary: number;
  socialBase?: number;
  fundBase?: number;
  fundRatio?: number;
  yearEndBonus?: number;
  specialDeduction?: number;
}

export interface SalaryCalcHistoryResponse {
  items: SalaryCalcResult[];
  total: number;
}

// ==================== Competitiveness Analysis ====================

export interface CompetitivenessAnalysis {
  targetJob: string;
  overallScore: number;
  strengths: { name: string; userLevel: number; requiredLevel: number; gap: number }[];
  weaknesses: { name: string; userLevel: number; requiredLevel: number; gap: number }[];
  matchedSkills: string[];
  missingSkills: string[];
  improvementSuggestions: string[];
  skillRadarData: {
    userData: number[];
    requiredData: number[];
    indicators: string[];
  };
}

// ==================== Knowledge Graph ====================

export interface SkillGraphNode {
  id: string;
  skillId: string;
  name: string;
  category: string;
  description: string;
  level: number;
  xPos: number;
  yPos: number;
  relatedCourseIds: string[];
  relatedTaskIds: string[];
}

export interface SkillGraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: string;
  weight: number;
}

export interface SkillGraphData {
  nodes: SkillGraphNode[];
  edges: SkillGraphEdge[];
  categories: { key: string; label: string; count: number }[];
}

export interface SkillGraphNodeDetail extends SkillGraphNode {
  prerequisites: SkillGraphNode[];
  nextSkills: SkillGraphNode[];
  relatedCourses: { id: string; name: string; platform: string }[];
  relatedTasks: { id: string; title: string; status: string }[];
}

export interface SkillGraphFilterQuery {
  category?: string;
  search?: string;
}

// ==================== Learning Plan ====================

export interface LearningPlan {
  id: string;
  planName: string;
  targetSkill: string;
  startDate: string;
  endDate: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  autoAdjust: boolean;
  progress: number;
}

export interface LearningPlanItem {
  id: string;
  planId: string;
  title: string;
  description: string;
  skillId?: string;
  taskType: string;
  plannedDate: string;
  durationMinutes: number;
  status: string;
  priority: number;
  orderIndex: number;
  completedAt?: string;
  originalDate?: string;
  adjustmentReason?: string;
}

export interface LearningPlanDetail extends LearningPlan {
  items: LearningPlanItem[];
  todayTasks: LearningPlanItem[];
  delayedCount: number;
  completedToday: number;
}

export interface LearningPlanListResponse {
  items: LearningPlan[];
  total: number;
}

export interface LearningPlanAdjustRequest {
  itemId: string;
  newDate?: string;
  newStatus?: string;
  reason?: string;
}

export interface LearningPlanReplanningRequest {
  planId: string;
}

// ==================== Career Assistant ====================

export interface CareerAssistantSession {
  id: string;
  sessionType: string;
  title: string;
  lastMessage: string;
  lastAdviceType: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CareerAssistantMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  adviceType?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CareerAssistantSessionListResponse {
  items: CareerAssistantSession[];
  unreadCount: number;
}

export interface CareerAssistantMessageListResponse {
  items: CareerAssistantMessage[];
}

export interface CareerAssistantSendRequest {
  sessionId?: string;
  message: string;
  sessionType?: string;
  title?: string;
}

export interface CareerAssistantAdviceSummary {
  type: string;
  label: string;
  count: number;
  unread: number;
}

// ==================== Job Push ====================

export interface JobPushItem {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  city: string;
  salary: string;
  matchScore: number;
  matchReasons: string[];
  status: string;
  isViewed: boolean;
  isApplied: boolean;
  isIgnored: boolean;
  pushedAt: string;
}

export interface JobPushListResponse {
  items: JobPushItem[];
  total: number;
  newCount: number;
}

export interface JobPushActionRequest {
  action: 'view' | 'apply' | 'ignore' | 'unignore';
}

// ==================== Personalized Recommendation ====================

export interface PersonalizedItem {
  id: string;
  recType: string;
  itemId: string;
  itemTitle: string;
  itemData?: Record<string, unknown>;
  score: number;
  reason: string;
  generatedAt: string;
}

export interface PersonalizedRecommendations {
  jobs: PersonalizedItem[];
  courses: PersonalizedItem[];
  news: PersonalizedItem[];
}

// ==================== Competition ====================

export interface CompetitionInfo {
  id: string;
  name: string;
  officialUrl?: string;
  description?: string;
  trackIntroduction?: string;
  registrationStart?: string;
  registrationEnd?: string;
  competitionStart?: string;
  competitionEnd?: string;
  submissionDeadline?: string;
  requirements?: string;
  awardsConfig?: CompetitionAward[];
  status: 'upcoming' | 'registering' | 'ongoing' | 'ended';
  organizer?: string;
}

export interface CompetitionAward {
  name: string;
  level: string;
  count: number;
  description?: string;
}

export interface CompetitionEntry {
  id: string;
  competitionId: string;
  projectName: string;
  projectIntro?: string;
  techStack?: TechStackItem[];
  featureModules?: FeatureModule[];
  highlights?: string;
  teamInfo?: TeamMember[];
  screenshots?: ScreenshotItem[];
  projectUrl?: string;
  status: 'draft' | 'submitted' | 'reviewing' | 'awarded';
}

export interface TechStackItem {
  name: string;
  category: string;
}

export interface FeatureModule {
  name: string;
  description: string;
}

export interface TeamMember {
  name: string;
  role: string;
  avatar?: string;
}

export interface ScreenshotItem {
  url: string;
  caption: string;
}

export interface CompetitionPrepTask {
  id: string;
  competitionId: string;
  title: string;
  description?: string;
  category: 'project' | 'document' | 'demo' | 'registration' | 'other';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  orderIndex: number;
  linkedTaskId?: string;
}

export interface CompetitionPrepTaskListResponse {
  items: CompetitionPrepTask[];
  total: number;
  completedCount: number;
}

export interface CompetitionReminderItem {
  id: string;
  title: string;
  date: string;
  type: 'registration' | 'submission' | 'competition' | 'other';
  daysLeft: number;
}

export interface ProjectDocSection {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
}

export interface ProjectDocResponse {
  projectName: string;
  sections: ProjectDocSection[];
}
