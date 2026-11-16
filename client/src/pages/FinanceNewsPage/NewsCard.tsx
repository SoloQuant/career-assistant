import {
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatRelativeTime,
  isBrandNew,
} from '@/utils/news-time';
import type { FinanceNewsItem } from '@shared/api.interface';

// source color map - tailwind class names for dark theme
const sourceColorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  '中国新闻网': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50', glow: 'shadow-[0_0_12px_rgba(239_68_68_0.3)]' },
  '中新网财经': { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/40', glow: 'shadow-[0_0_12px_rgba(239_68_68_0.25)]' },
  '东方财富网': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50', glow: 'shadow-[0_0_12px_rgba(249_115_22_0.3)]' },
  '财联社': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50', glow: 'shadow-[0_0_12px_rgba(59_130_246_0.3)]' },
  '第一财经': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50', glow: 'shadow-[0_0_12px_rgba(168_85_247_0.3)]' },
  '华尔街见闻': { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/50', glow: 'shadow-[0_0_12px_rgba(99_102_241_0.3)]' },
  '新浪财经': { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/50', glow: 'shadow-[0_0_12px_rgba(244_63_94_0.3)]' },
  '新浪科技': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/40', glow: 'shadow-[0_0_12px_rgba(59_130_246_0.25)]' },
  '新浪国内': { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/40', glow: 'shadow-[0_0_12px_rgba(239_68_68_0.25)]' },
  '新浪国际': { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/50', glow: 'shadow-[0_0_12px_rgba(100_116_139_0.3)]' },
  '和讯网': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50', glow: 'shadow-[0_0_12px_rgba(16_185_129_0.3)]' },
  '钛媒体': { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/50', glow: 'shadow-[0_0_12px_rgba(139_92_246_0.3)]' },
  '爱范儿': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50', glow: 'shadow-[0_0_12px_rgba(168_85_247_0.3)]' },
  '雷锋网': { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/50', glow: 'shadow-[0_0_12px_rgba(99_102_241_0.3)]' },
};

export function getSourceColor(source: string) {
  return sourceColorMap[source] ?? {
    bg: 'bg-primary/20',
    text: 'text-primary',
    border: 'border-primary/50',
    glow: 'shadow-[0_0_12px_hsl(190_90%_55%_/_0.3)]',
  };
}

export interface NewsCardProps {
  item: FinanceNewsItem;
}

export function NewsCard({ item }: NewsCardProps) {
  const color = getSourceColor(item.source);
  const brandNew = isBrandNew(item.publishDate);

  const handleOpen = () => {
    if (item.sourceUrl) {
      window.open(item.sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg relative overflow-hidden group ${
        item.isImportant ? 'border-l-4 border-l-red-500' : ''
      }`}
      onClick={handleOpen}
      data-ai-section-type="card-list"
    >
      {item.isImportant && (
        <div className="absolute top-0 left-0 z-10">
          <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-br-md">
            重要
          </div>
        </div>
      )}
      <CardContent className="p-5">
        {/* top row: source + time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`${color.bg} ${color.text} ${color.border} border text-[11px] px-2 py-0.5 font-medium`}
            >
              {item.source}
            </Badge>
            {item.isImportant && (
              <Badge
                variant="outline"
                className="bg-red-500/10 text-red-400 border-red-500/40 text-[11px] px-2 py-0.5"
              >
                <Sparkles className="size-3 mr-1" />
                重要
              </Badge>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {formatRelativeTime(item.publishDate)}
          </span>
        </div>

        {/* title */}
        <h3 className="text-base font-semibold leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2 flex items-start gap-2">
          {brandNew && (
            <span className="inline-flex items-center shrink-0 mt-0.5 px-1.5 py-0.5 rounded-sm bg-red-500 text-white text-[10px] font-bold leading-none animate-pulse">
              NEW
            </span>
          )}
          <span>{item.title}</span>
        </h3>

        {/* summary */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {item.summary}
        </p>

        {/* bottom: tags + view original */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-1.5">
            {item.tags?.slice(0, 3).map((tag: string) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[11px] px-2 py-0.5 bg-muted/50 text-muted-foreground border-border"
              >
                {tag}
              </Badge>
            ))}
          </div>
          <span className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            查看原文
            <ExternalLink className="size-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function NewsSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

