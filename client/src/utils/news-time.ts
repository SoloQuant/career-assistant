const BEIJING_OFFSET = 8 * 60; // minutes

export function getBeijingTime(date: Date): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + BEIJING_OFFSET * 60000);
}

/**
 * 格式化相对时间（基于北京时间计算）
 * 1分钟内 → 刚刚
 * 1小时内 → X分钟前
 * 24小时内 → X小时前
 * 超过24小时 → MM-DD HH:mm（北京时间）
 */
export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  const bjDate = getBeijingTime(date);
  const m = String(bjDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(bjDate.getUTCDate()).padStart(2, '0');
  const h = String(bjDate.getUTCHours()).padStart(2, '0');
  const min = String(bjDate.getUTCMinutes()).padStart(2, '0');
  return `${m}-${d} ${h}:${min}`;
}

/**
 * 格式化为完整北京时间 YYYY-MM-DD HH:mm
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const bj = getBeijingTime(d);
  const y = bj.getUTCFullYear();
  const m = String(bj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bj.getUTCDate()).padStart(2, '0');
  const h = String(bj.getUTCHours()).padStart(2, '0');
  const min = String(bj.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

/**
 * 格式化为 MM-DD HH:mm（北京时间）
 */
export function formatShortDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const bj = getBeijingTime(d);
  const m = String(bj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bj.getUTCDate()).padStart(2, '0');
  const h = String(bj.getUTCHours()).padStart(2, '0');
  const min = String(bj.getUTCMinutes()).padStart(2, '0');
  return `${m}-${day} ${h}:${min}`;
}

/**
 * 判断时间是否在 60 秒内（用于最后更新状态指示灯）
 */
export function isJustUpdated(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < 60000;
}

/**
 * 判断新闻是否为 5 分钟内发布的新消息（用于 NEW 标签）
 */
export function isBrandNew(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < 5 * 60 * 1000;
}
