// 任务三级拆分模块：任务组→里程碑→子任务 + 技能关联
// 数据模型定义

export interface TaskGroup {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  startDate: string;
  endDate: string;
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
  milestones?: TaskMilestone[];
  skills?: Skill[];
}

export interface TaskMilestone {
  id: number;
  taskGroupId: number;
  title: string;
  description: string;
  sortOrder: number;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
  subTasks?: TaskSubTask[];
  skills?: Skill[];
}

export interface TaskSubTask {
  id: number;
  milestoneId: number;
  title: string;
  description: string;
  estimatedHours: number;
  completed: boolean;
  completedAt?: string;
  skills?: Skill[];
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  level: number; // 0-100
}

// AI智能拆分：输入大任务标题，自动拆分为里程碑和子任务
export const aiSplitTask = async (title: string, description: string) => {
  const response = await fetch('/api/tasks/ai-split', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });
  return response.json();
};
