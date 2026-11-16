import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Clock,
  BookOpen,
  Tag,
  Sparkles,
  Search,
  PlayCircle,
  GraduationCap,
  Code2,
  Database,
  Brain,
  BarChart3,
  Wallet,
  TrendingUp,
  FileSpreadsheet,
  Globe2,
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
import { fetchResources } from '@/api/resources';
import {
  RESOURCE_CATEGORIES,
  type LearningResource,
} from '@shared/api.interface';

const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  Coursera: { bg: 'bg-[hsl(210_90%_60%)]/20', text: 'text-[hsl(210_90%_60%)]' },
  Udemy: { bg: 'bg-[hsl(38_90%_55%)]/20', text: 'text-[hsl(38_90%_55%)]' },
  '极客时间': { bg: 'bg-[hsl(0_84%_60%)]/20', text: 'text-[hsl(0_84%_60%)]' },
  B站: { bg: 'bg-[hsl(190_90%_55%)]/20', text: 'text-[hsl(190_90%_55%)]' },
  '中国大学MOOC': { bg: 'bg-[hsl(160_70%_50%)]/20', text: 'text-[hsl(160_70%_50%)]' },
  YouTube: { bg: 'bg-[hsl(0_84%_60%)]/20', text: 'text-[hsl(0_84%_60%)]' },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <BookOpen className="h-4 w-4" />,
  python: <Code2 className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
  bigdata_framework: <BarChart3 className="h-4 w-4" />,
  machine_learning: <Brain className="h-4 w-4" />,
  bigdata: <GraduationCap className="h-4 w-4" />,
  finance: <Wallet className="h-4 w-4" />,
  economics: <TrendingUp className="h-4 w-4" />,
  office: <FileSpreadsheet className="h-4 w-4" />,
  language: <Globe2 className="h-4 w-4" />,
};

function getPlatformStyle(platform: string) {
  return (
    PLATFORM_COLORS[platform] ?? {
      bg: 'bg-primary/20',
      text: 'text-primary',
    }
  );
}

interface ResourceCardProps {
  item: LearningResource;
  index: number;
}

function ResourceCard({ item, index }: ResourceCardProps) {
  const platformStyle = getPlatformStyle(item.platform);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="h-full"
    >
      <Card className="flex flex-col h-full transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg group overflow-hidden">
        <CardContent className="flex flex-col flex-1 gap-4 p-5">
          {/* Platform row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${platformStyle.bg}`}
              >
                <PlayCircle className={`h-5 w-5 ${platformStyle.text}`} />
              </div>
              <div>
                <div className="text-sm font-medium">{item.platform}</div>
                <div className="text-xs text-muted-foreground">
                  {item.relatedSkill}
                </div>
              </div>
            </div>
            {item.isFree ? (
              <Badge className="bg-[hsl(160_70%_50%)]/15 text-[hsl(160_70%_50%)] border-[hsl(160_70%_50%)]/30 hover:bg-[hsl(160_70%_50%)]/15">
                <Sparkles className="h-3 w-3 mr-0.5" />
                免费
              </Badge>
            ) : (
              <Badge className="bg-[hsl(38_90%_55%)]/15 text-[hsl(38_90%_55%)] border-[hsl(38_90%_55%)]/30 hover:bg-[hsl(38_90%_55%)]/15">
                付费
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold leading-snug line-clamp-2">
            {item.name}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
            {item.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              <Tag className="h-3 w-3 mr-1" />
              {item.relatedSkill}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Clock className="h-3.5 w-3.5" />
              {item.duration}
            </span>
          </div>

          {/* Bottom button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              window.open(item.url, '_blank', 'noopener,noreferrer')
            }
            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
            data-ai-section-type="button"
          >
            开始学习
            <ExternalLink className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ResourceSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-8 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

const ResourcesPage = () => {
  const [category, setCategory] = useState<string>('all');
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadResources = useCallback(async (cat: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchResources(cat);
      setResources(data);
    } catch (err) {
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources(category);
  }, [category, loadResources]);

  const handleCategoryChange = (value: string) => {
    setCategory(value);
  };

  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return resources;
    const q = searchQuery.toLowerCase();
    return resources.filter(
      (r: LearningResource) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.platform.toLowerCase().includes(q) ||
        r.relatedSkill.toLowerCase().includes(q),
    );
  }, [resources, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">学习资源</h2>
          <p className="text-sm text-muted-foreground mt-1">
            精选大数据相关优质学习资源，助你快速提升
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索资源名称、平台..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category tabs - scrollable */}
      <Card>
        <CardContent className="p-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {RESOURCE_CATEGORIES.map((cat) => {
              const isActive = category === cat.key;
              const icon = CATEGORY_ICONS[cat.key] ?? <BookOpen className="h-4 w-4" />;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryChange(cat.key)}
                  className={`shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {icon}
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
            <ResourceSkeleton key={i} />
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

      {!loading && !error && filteredResources.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpen className="size-6" />
                </EmptyMedia>
                <EmptyTitle>暂无资源</EmptyTitle>
                <EmptyDescription>
                  当前分类下还没有学习资源，试试切换其他分类
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      )}

      {!loading && !error && filteredResources.length > 0 && (
        <div
          className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          data-ai-section-type="card-menu"
        >
          {filteredResources.map((item: LearningResource, idx: number) => (
            <ResourceCard key={item.id} item={item} index={idx} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ResourcesPage;
