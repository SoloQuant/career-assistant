import {
  Zap,
  Gavel,
  TrendingUp,
  Building2,
  Briefcase,
  BarChart3,
  ExternalLink,
  Clock,
  Star,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatRelativeTime,
  isBrandNew,
} from '@/utils/news-time';
import {
  IMPORTANT_NEWS_CATEGORIES,
  type FinanceNewsItem,
} from '@shared/api.interface';

const iconMap: Record<string, typeof Zap> = {
  Zap,
  Gavel,
  TrendingUp,
  Building2,
  Briefcase,
  BarChart3,
};

// category color map for left bar + category badge
const categoryColorMap: Record<string, { bar: string; bg: string; text: string; border: string }> = {
  policy: { bar: 'bg-blue-500', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/40' },
  market: { bar: 'bg-emerald-500', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  industry: { bar: 'bg-purple-500', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/40' },
  company: { bar: 'bg-orange-500', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/40' },
  economy_data: { bar: 'bg-rose-500', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/40' },
  all: { bar: 'bg-primary', bg: 'bg-primary/15', text: 'text-primary', border: 'border-primary/40' },
};

function getCategoryColor(key: string) {
  return categoryColorMap[key] ?? categoryColorMap.all;
}

export interface ImportantCardProps {
  item: FinanceNewsItem;
  isRead: boolean;
  onRead: (id: string) => void;
}

export function ImportantCard({ item, isRead, onRead }: ImportantCardProps) {
  const color = getCategoryColor(item.importantCategory ?? 'all');
  const categoryLabel =
    IMPORTANT_NEWS_CATEGORIES.find((c) => c.key === item.importantCategory)
      ?.label ?? '重要消息';
  const brandNew = isBrandNew(item.publishDate);
  const score = item.importanceScore ?? 0;
  const fullStars = Math.min(5, Math.round(score / 20));

  const handleClick = () => {
    if (!isRead) {
      onRead(item.id);
    }
    if (item.sourceUrl) {
      window.open(item.sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg relative overflow-hidden group border-l-4 ${
        color.bar
      } ${isRead ? 'opacity-75' : 'bg-card/90'}`}
      onClick={handleClick}
      data-ai-section-type="card-list"
    >
      <CardContent className="p-5">
        {/* top row: category + source + time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`${color.bg} ${color.text} ${color.border} border text-[11px] px-2 py-0.5 font-medium`}
            >
              {categoryLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">{item.source}</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {formatRelativeTime(item.publishDate)}
          </span>
        </div>

        {/* title with unread dot */}
        <h3
          className={`text-lg font-semibold leading-snug mb-2 transition-colors group-hover:text-primary flex items-start gap-2 ${
            isRead ? 'text-muted-foreground font-medium' : 'text-foreground'
          }`}
        >
          {!isRead && (
            <span className="inline-block w-2 h-2 rounded-full bg-primary mt-2 shrink-0 animate-pulse" />
          )}
          {brandNew && (
            <span className="inline-flex items-center shrink-0 mt-1 px-1.5 py-0.5 rounded-sm bg-red-500 text-white text-[10px] font-bold leading-none animate-pulse">
              NEW
            </span>
          )}
          <span className="line-clamp-2">{item.title}</span>
        </h3>

        {/* summary - 3 lines */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {item.summary}
        </p>

        {/* bottom: tags + importance + view original */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-1.5 items-center">
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-3.5 ${
                    i < fullStars
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-muted-foreground/40'
                  }`}
                />
              ))}
            </div>
            <span className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              查看原文
              <ExternalLink className="size-3" />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImportantSkeleton() {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-6 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
