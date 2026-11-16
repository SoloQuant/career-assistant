# 职业发展助手系统 (Career Assistant)

---

## 复现性声明

本项目为完整可运行的全栈Web应用，所有代码、数据库Schema、API接口、前端页面均完整可复现。

- **代码仓库**：https://github.com/SoloQuant/career-assistant
- **本地运行**：Node.js >= 18 + npm >= 9
- **数据库**：内置SQLite开发模式，无需额外安装PostgreSQL
- **AI能力**：基于大语言模型API，配置Key后启用

---

## 复现指南

### 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18.0.0 | 推荐LTS版本 |
| npm | >= 9.0.0 | 随Node.js安装 |
| 浏览器 | Chrome/Edge 最新版 | 支持PWA |

### 第1步：克隆仓库

```bash
git clone git@github.com:SoloQuant/career-assistant.git
cd career-assistant
```

### 第2步：安装依赖

```bash
npm install
```

### 第3步：配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 数据库（开发模式默认使用内置SQLite）
DATABASE_URL=sqlite://./data/career.db

# AI API（可选，不配置则使用模拟数据）
AI_API_KEY=your_api_key_here
AI_API_BASE=https://api.openai.com/v1

# 服务端口
PORT=3000
```

### 第4步：启动开发环境

```bash
npm run dev
```

### 第5步：访问系统

打开浏览器访问：**http://localhost:3000**

---

## 环境变量模板 (.env.example)

```env
# ============ 数据库配置 ============
# 开发环境默认使用SQLite，生产环境可切换PostgreSQL
DATABASE_URL=sqlite://./data/career.db
# DATABASE_URL=postgresql://user:password@localhost:5432/career_assistant

# ============ 服务配置 ============
PORT=3000
NODE_ENV=development

# ============ AI能力配置（可选） ============
# 配置后启用：AI对话助手、智能任务拆分、简历优化、模拟面试
AI_API_KEY=
AI_API_BASE=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

# ============ 外部数据源（可选） ============
# 中国新闻网API
NEWS_API_KEY=
# 招聘平台数据（内置模拟数据，配置后接入真实数据）
JOB_DATA_SOURCE=mock

# ============ JWT认证（生产环境必须修改） ============
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d
```

---

## 项目结构

```
career-assistant/
├── client/                 # 前端应用（React + TypeScript + Vite）
│   ├── src/
│   │   ├── pages/          # 60个页面组件
│   │   ├── components/     # 190个通用组件
│   │   ├── api/            # 32个API接口封装
│   │   ├── hooks/          # 自定义Hooks
│   │   ├── types/         # TypeScript类型定义
│   │   └── utils/         # 工具函数
│   └── public/            # 静态资源 + PWA清单
├── server/                 # 后端应用（NestJS）
│   ├── modules/           # 33个业务模块
│   │   ├── profile/       # 个人资料
│   │   ├── skill/         # 技能评估
│   │   ├── job/          # 岗位推荐
│   │   ├── task/         # 任务管理
│   │   ├── task-group/   # 任务三级拆分
│   │   ├── news/         # 新闻资讯
│   │   ├── finance-news/ # 财经新闻
│   │   ├── ai-chat/      # AI对话助手
│   │   ├── interview/    # 面试题库
│   │   ├── mock-interview/ # 模拟面试
│   │   ├── resume/       # 简历管理
│   │   ├── career-path/ # 职业路径
│   │   ├── knowledge-graph/ # 知识图谱
│   │   ├── learning-plan/ # 学习计划
│   │   ├── growth-report/ # 成长报告
│   │   ├── salary-calc/  # 薪资计算器
│   │   └── ...          # 其余18个模块
│   ├── database/        # 数据库Schema（33张表）
│   ├── common/          # 公共组件（异常过滤器/响应格式）
│   └── capabilities/    # AI能力定义
├── shared/              # 前后端共享类型
├── scripts/             # 构建/开发脚本
├── job.csv / job.json   # 岗位示例数据集
└── package.json         # 依赖清单
```

---

## 核心功能模块

### 个人发展类
1. **个人资料管理** — 基本信息、求职意向、简历导入
2. **技能评估矩阵** — 每个技能独立卡片，掌握程度滑块，雷达图可视化
3. **任务三级拆分** — 任务组→里程碑→子任务，AI智能拆分，技能关联
4. **学习计划** — 根据技能缺口自动生成学习路径
5. **学习打卡** — 每日学习记录，连续天数统计
6. **笔记** — 富文本笔记，支持Markdown
7. **成长报告** — 阶段性成长数据分析报告

### 求职服务类
8. **岗位推荐** — 全国84城市，多数据源，匹配度计算
9. **岗位推送** — 新岗位自动推送，关键词订阅
10. **投递管理** — 投递状态跟踪（已投递/笔试/面试/Offer/拒绝）
11. **面试题库** — 按岗位分类的面试题目
12. **模拟面试** — AI面试模拟，答题评分
13. **笔试模拟** — 在线笔试练习
14. **错题本** — 错题收集与复习
15. **简历管理** — 简历模板与导出
16. **职业路径** — 可视化职业发展路径图
17. **公司评价** — 员工评价库

### 资讯学习类
18. **新闻资讯** — 综合新闻流
19. **财经新闻** — 财经动态，重要消息筛选
20. **重要消息** — 高价值消息分类，政策/行业/招聘趋势
21. **行业趋势** — 行业发展数据分析
22. **课程推荐** — 个性化课程推荐
23. **资源中心** — 学习资源导航

### 数据工具类
24. **数据看板** — 技能雷达图、薪资分布图、求职进度仪表盘
25. **薪资计算器** — 按城市/岗位/经验计算薪资范围
26. **竞争力分析** — 与同龄人竞争力对比
27. **知识图谱** — 技能关联知识图谱可视化
28. **日历** — 求职日程管理
29. **城市成本** — 各城市生活成本对比
30. **竞赛** — 竞赛信息推荐

### AI能力类
31. **AI对话助手** — 智能问答，求职建议
32. **个性化推荐** — 基于行为的内容推荐
33. **智能求职助手** — 全流程AI辅助

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18.x |
| 语言 | TypeScript | 5.x |
| 构建工具 | Vite | 5.x |
| UI组件 | Tailwind CSS + shadcn/ui | — |
| 图表 | ECharts | 5.x |
| 后端框架 | NestJS | 10.x |
| ORM | Drizzle ORM | 0.44.x |
| 数据库 | SQLite（开发）/ PostgreSQL（生产） | — |
| 状态管理 | TanStack Query | 5.x |
| PWA | Workbox | — |

---

## 开发命令

```bash
# 启动开发环境
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint

# 类型检查
npm run type:check

# 运行测试
npm run test
```

---

## 常见问题

**Q: 没有配置AI API Key能用吗？**
A: 可以。所有功能都有模拟数据兜底，AI相关功能会显示模拟结果。

**Q: 数据库需要单独安装吗？**
A: 开发环境默认使用内置SQLite，无需安装。生产环境可切换PostgreSQL。

**Q: 端口被占用怎么办？**
A: 修改 `.env` 中的 `PORT` 配置项。

**Q: 如何导入真实岗位数据？**
A: 项目根目录的 `job.csv` / `job.json` 为示例数据集，可替换为真实数据导入。

---

