# 职业发展助手系统 - 10分钟极速复现指南

## 项目简介
职业发展助手是一款面向大学生的综合职业发展管理平台，围绕"技能提升→任务拆解→岗位匹配→求职管理→资讯学习"的完整链路设计，包含20+功能模块、29张数据库表、17个招聘数据源。

---

## 环境要求

| 环境 | 版本要求 |
|------|----------|
| Node.js | >= 18.0.0 |
| npm | >= 9.0.0 |
| PostgreSQL | >= 14.0 |
| 浏览器 | Chrome/Edge 最新版 |

---

## 快速复现步骤（10分钟）

### 第1步：克隆代码仓库（1分钟）
```bash
git clone https://github.com/your-username/career-assistant.git
cd career-assistant
```

### 第2步：安装依赖（2分钟）
```bash
# 安装前端依赖
cd client
npm install

# 安装后端依赖
cd ../server
npm install
```

### 第3步：配置环境变量（1分钟）
```bash
# 复制环境变量模板
cp server/.env.example server/.env
```

编辑 `server/.env`：
```env
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/career_assistant

# JWT密钥
JWT_SECRET=your_jwt_secret_key

# AI API配置（可选，用于AI对话和智能推荐）
AI_API_KEY=your_ai_api_key
AI_API_BASE=https://api.example.com/v1
```

### 第4步：初始化数据库（2分钟）
```bash
# 创建数据库
createdb career_assistant

# 运行数据库迁移
cd server
npm run migrate

# 导入种子数据
npm run seed
```

### 第5步：启动服务（2分钟）
```bash
# 启动后端服务（端口3001）
cd server
npm run dev

# 新开终端，启动前端（端口3000）
cd client
npm run dev
```

### 第6步：访问系统（1分钟）
打开浏览器访问：http://localhost:3000

默认账号：
- 用户名：demo
- 密码：demo123

---

## 项目结构

```
career-assistant/
├── client/                 # 前端（React + TypeScript）
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/     # 通用组件
│   │   ├── api/           # API接口
│   │   ├── hooks/         # 自定义Hooks
│   │   └── utils/         # 工具函数
│   └── package.json
├── server/                 # 后端（Node.js + NestJS）
│   ├── src/
│   │   ├── modules/       # 业务模块
│   │   ├── common/        # 公共模块
│   │   └── config/        # 配置
│   ├── prisma/            # 数据库模型
│   └── package.json
└── README.md               # 本文档
```

---

## 核心功能模块清单

1. 个人档案管理
2. 技能管理（含知识点拆解）
3. 任务管理（三级拆分+AI智能拆分）
4. 岗位推荐（17个数据源）
5. 求职投递管理
6. 数据可视化看板
7. 新闻资讯（财经+重要消息筛选）
8. 学习资源推荐
9. 职业路径规划
10. 简历生成器
11. 面试题库
12. 模拟面试（AI）
13. 笔试模拟
14. 学习打卡
15. AI对话助手
16. 公司评价库
17. 成长报告
18. 实用工具（薪资计算器/日历/笔记）
19. 首页仪表盘
20. PWA桌面安装

---

## 技术栈

- **前端**：React 18 + TypeScript + Vite + TailwindCSS + ECharts
- **后端**：Node.js + NestJS + Prisma ORM
- **数据库**：PostgreSQL
- **AI能力**：大语言模型API（对话、任务拆分、推荐）
- **部署**：Docker + Nginx

---

## 常见问题

**Q: 数据库连接失败怎么办？**
A: 检查PostgreSQL是否启动，.env中的数据库配置是否正确。

**Q: 前端启动白屏？**
A: 检查后端是否启动，API代理配置是否正确。

**Q: AI功能无法使用？**
A: AI功能需要配置AI_API_KEY，不配置也能正常使用其他功能。
