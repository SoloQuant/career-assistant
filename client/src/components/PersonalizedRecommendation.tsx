import { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  RefreshCw,
  Briefcase,
  GraduationCap,
  Newspaper,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { personalizedRec } from '@/api';
import type {
  PersonalizedItem,
  PersonalizedRecommendations,
} from '@shared/api.interface';

interface RecColumnProps {
  title: string;
  icon: React.ReactNode;
  items: PersonalizedItem[];
  loading: boolean;
  accentColor: string;
}

const RecColumn: React.FC<RecColumnProps> = ({
  title,
  icon,
  items,
  loading,
  accentColor,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-md" />
          <Skeleton className="h-4 w-20" />
        </div>
        {[1, 2, 3].map((n: number) => (
          <div key={n} className="space-y-2 p-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentColor}`}
        >
          {icon}
        </div>
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            暂无推荐
          </div>
        ) : (
          items.map((item: PersonalizedItem) => (
            <div
              key={item.id}
              className="group p-3 rounded-lg border border-border/60 bg-background hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <h5 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {item.itemTitle}
                </h5>
                <Badge
                  variant="secondary"
                  className="flex-shrink-0 text-[10px] h-5 min-w-[40px] justify-center px-1.5"
                >
                  {Math.round(item.score * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                {item.reason}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const PersonalizedRecommendation: React.FC = () => {
  const [data, setData] = useState<PersonalizedRecommendations | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadRecommendations = async (): Promise<void> => {
    try {
      const res = await personalizedRec.getDashboardRecommendations(5);
      setData(res);
    } catch (error) {
      logger.error('加载个性化推荐失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecommendations();
  }, []);

  const handleRefresh = async (): Promise<void> => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await personalizedRec.refreshRecommendations();
      await loadRecommendations();
    } catch (error) {
      logger.error('刷新推荐失败', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">为你推荐</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              根据你的学习和浏览行为智能推荐
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          刷新推荐
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <RecColumn
            title="岗位推荐"
            icon={<Briefcase className="w-4 h-4 text-blue-600" />}
            items={data?.jobs ?? []}
            loading={loading}
            accentColor="bg-blue-50"
          />
          <RecColumn
            title="课程推荐"
            icon={<GraduationCap className="w-4 h-4 text-emerald-600" />}
            items={data?.courses ?? []}
            loading={loading}
            accentColor="bg-emerald-50"
          />
          <RecColumn
            title="新闻推荐"
            icon={<Newspaper className="w-4 h-4 text-amber-600" />}
            items={data?.news ?? []}
            loading={loading}
            accentColor="bg-amber-50"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalizedRecommendation;
