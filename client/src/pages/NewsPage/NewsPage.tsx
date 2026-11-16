import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Newspaper,
  TrendingUp,
  Gauge,
  FileText,
  Search,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';
import { fetchNewsList } from '@/api/news';
import { NEWS_CATEGORIES, type NewsItem } from '@shared/api.interface';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; iconBg: string; icon: React.ReactNode }> = {
  industry: {
    bg: 'bg-[hsl(190_90%_55%)]/15',
    text: 'text-[hsl(190_90%_55%)]',
    border: 'border-[hsl(190_90%_55%)]/30',
    iconBg: 'from-[hsl(190_50%_25%)] to-[hsl(190_30%_15%)]',
    icon: <TrendingUp className="h-6 w-6 text-[hsl(190_90%_55%)]" />,
  },
  technology: {
    bg: 'bg-[hsl(270_80%_65%)]/15',
    text: 'text-[hsl(270_80%_65%)]',
    border: 'border-[hsl(270_80%_65%)]/30',
    iconBg: 'from-[hsl(270_40%_25%)] to-[hsl(270_25%_15%)]',
    icon: <Gauge className="h-6 w-6 text-[hsl(270_80%_65%)]" />,
  },
  policy: {
    bg: 'bg-[hsl(38_90%_55%)]/15',
    text: 'text-[hsl(38_90%_55%)]',
    border: 'border-[hsl(38_90%_55%)]/30',
    iconBg: 'from-[hsl(38_40%_25%)] to-[hsl(38_25%_15%)]',
    icon: <FileText className="h-6 w-6 text-[hsl(38_90%_55%)]" />,
  },
  recruitment: {
    bg: 'bg-[hsl(160_70%_50%)]/15',
    text: 'text-[hsl(160_70%_50%)]',
    border: 'border-[hsl(160_70%_50%)]/30',
    iconBg: 'from-[hsl(160_40%_25%)] to-[hsl(160_25%_15%)]',
    icon: <Search className="h-6 w-6 text-[hsl(160_70%_50%)]" />,
  },
  all: {
    bg: 'bg-primary/15',
    text: 'text-primary',
    border: 'border-primary/30',
    iconBg: 'from-[hsl(190_50%_25%)] to-[hsl(190_30%_15%)]',
    icon: <Newspaper className="h-6 w-6 text-primary" />,
  },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface NewsCardProps {
  item: NewsItem;
  index: number;
}

function NewsCard({ item, index }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.all;
  const categoryLabel = NEWS_CATEGORIES.find((c) => c.key === item.category)?.label ?? item.category;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        className="h-full flex flex-col overflow-hidden cursor-pointer transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg group"
        onClick={() => setExpanded((prev) => !prev)}
        data-ai-section-type="card-list"
      >
        {/* Thumbnail placeholder */}
        <div className={`relative h-[120px] bg-gradient-to-br ${style.iconBg} overflow-hidden`}>
          <div className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            {style.icon}
          </div>
          <div className="absolute top-3 left-3">
            <Badge
              variant="outline"
              className={`${style.bg} ${style.text} ${style.border} backdrop-blur-sm`}
            >
              {categoryLabel}
            </Badge>
          </div>
        </div>

        <CardContent className="flex-1 flex flex-col p-5">
          {/* Source + time */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {item.source}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(item.publishDate)}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold leading-snug line-clamp-2 mb-2">
            {item.title}
          </h3>

          {/* Summary */}
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-1">
            {item.summary}
          </p>

          {/* Tags + read more */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex flex-wrap gap-1">
              {item.tags?.slice(0, 2).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
            <span className={`text-xs flex items-center gap-0.5 transition-all ${style.text}`}>
              {expanded ? '收起' : '阅读更多'}
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
            </span>
          </div>

          {/* Expanded content */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {item.content}
              </p>
              {item.url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(item.url, '_blank', 'noopener,noreferrer');
                  }}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4" />
                  查看原文
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function NewsSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-[120px] bg-secondary/50" />
      <CardContent className="p-5 space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-1">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-3.5 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

const NewsPage = () => {
  const [category, setCategory] = useState<string>('all');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadNews = useCallback(
    async (cat: string, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await fetchNewsList(cat);
        setNews(data);
      } catch (err) {
        setError('加载失败，请稍后重试');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadNews(category);
  }, [category, loadNews]);

  const handleRefresh = () => {
    loadNews(category, true);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
  };

  const filteredNews = news.filter((item: NewsItem) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">资讯推荐</h2>
          <p className="text-sm text-muted-foreground mt-1">
            精选行业动态、技术趋势与政策解读
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索资讯..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            data-ai-section-type="button"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      {/* Category tabs - scrollable */}
      <Card>
        <CardContent className="p-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {NEWS_CATEGORIES.map((cat) => {
              const style = CATEGORY_STYLES[cat.key] ?? CATEGORY_STYLES.all;
              const isActive = category === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryChange(cat.key)}
                  className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {cat.key !== 'all' && <span className="scale-90">{style.icon}</span>}
                  {cat.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <NewsSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && filteredNews.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Newspaper className="size-6" />
                </EmptyMedia>
                <EmptyTitle>暂无资讯</EmptyTitle>
                <EmptyDescription>
                  当前分类下还没有资讯内容，试试切换其他分类或刷新页面
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      )}

      {!loading && !error && filteredNews.length > 0 && (
        <div
          className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          data-ai-section-type="card-menu"
        >
          {filteredNews.map((item: NewsItem, idx: number) => (
            <NewsCard key={item.id} item={item} index={idx} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default NewsPage;
