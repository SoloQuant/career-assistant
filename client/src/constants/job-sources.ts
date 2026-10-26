// 岗位推荐增强：加入中国大学生就业平台+金融技能
// 更新岗位数据源配置
export const JOB_SOURCES = [
  { id: 'boss', name: 'BOSS直聘', enabled: true },
  { id: 'lagou', name: '拉勾网', enabled: true },
  { id: 'zhilian', name: '智联招聘', enabled: true },
  { id: '51job', name: '前程无忧', enabled: true },
  { id: 'liepin', name: '猎聘网', enabled: true },
  { id: '24365', name: '中国大学生就业平台(24365)', enabled: true },
  { id: 'shixiseng', name: '实习僧', enabled: true },
  { id: 'maimai', name: '脉脉', enabled: true },
  { id: 'lagou_intern', name: '拉勾实习', enabled: true },
  { id: 'boss_campus', name: 'BOSS校招', enabled: true },
  { id: 'autumn_recruit', name: '秋招平台', enabled: true },
  { id: 'spring_recruit', name: '春招平台', enabled: true },
  { id: 'platform_recruit', name: '平台直招', enabled: true },
  { id: 'chinahr', name: '中国人才网', enabled: true },
  { id: 'zhaopin', name: '智联校招', enabled: true },
  { id: 'kuaixiao', name: '快校招', enabled: true },
  { id: 'yingjiesheng', name: '应届生求职网', enabled: true }
];

// 技能分类扩展（加入金融类）
export const SKILL_CATEGORIES = [
  { id: 'programming', name: '编程语言', icon: 'code' },
  { id: 'database', name: '数据库', icon: 'database' },
  { id: 'bigdata', name: '大数据技术', icon: 'chart' },
  { id: 'ai', name: '人工智能', icon: 'robot' },
  { id: 'frontend', name: '前端开发', icon: 'layout' },
  { id: 'backend', name: '后端开发', icon: 'server' },
  { id: 'devops', name: '运维工具', icon: 'tool' },
  { id: 'finance', name: '金融知识', icon: 'money' },
  { id: 'soft', name: '软技能', icon: 'people' },
  { id: 'language', name: '语言能力', icon: 'language' },
  { id: 'certificate', name: '证书资质', icon: 'certificate' },
  { id: 'other', name: '其他', icon: 'other' }
];
