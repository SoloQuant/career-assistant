// ---- plugin:intelligent_task_splitter_1 ----
// ============================================================
// 插件 intelligent_task_splitter_1 (智能任务拆分工具) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface IntelligentTaskSplitterOneInput {
  /** 总任务详细描述，包含目标、要求、时间约束等信息 */
  task_description: string;
  /** 总任务名称 */
  task_name: string;
}

/**
 * capabilityClient.load('intelligent_task_splitter_1').call<IntelligentTaskSplitterOneOutput>('textToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { milestones } = result;
 * 返回值形如：
 *   {"milestones":[]}
 */
export interface IntelligentTaskSplitterOneOutput {
  /** 里程碑列表，items schema: {name: string(里程碑名称), description: string(里程碑详细描述), subTasks: Array(子任务列表，items schema: {name: string(子任务名称), description: string(子任务详细描述), estimatedMinutes: Number(子任务预估完成时间，单位分钟)})} */
  milestones: unknown[];
}
// ---- end:intelligent_task_splitter_1 ----

// ---- plugin:task_skill_auto_recognition_1 ----
// ============================================================
// 插件 task_skill_auto_recognition_1 (任务技能自动识别) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface TaskSkillAutoRecognitionOneInput {
  /** 总任务名称、描述以及里程碑子任务结构信息 */
  task_info: string;
  /** 45个技能库的完整列表内容 */
  skill_library: string;
}

/**
 * capabilityClient.load('task_skill_auto_recognition_1').call<TaskSkillAutoRecognitionOneOutput>('textToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { overall_task_skills, milestones } = result;
 * 返回值形如：
 *   {"overall_task_skills":[],"milestones":[]}
 */
export interface TaskSkillAutoRecognitionOneOutput {
  /** 总任务匹配的技能名称数组，items schema: string(技能名称) */
  overall_task_skills: unknown[];
  /** 里程碑列表，items schema: {milestone_name: string(里程碑名称), skills: Array<string>(该里程碑匹配的技能名称数组), subtasks: Array<{subtask_name: string(子任务名称), skills: Array<string>(该子任务匹配的技能名称数组)}>} */
  milestones: unknown[];
}
// ---- end:task_skill_auto_recognition_1 ----