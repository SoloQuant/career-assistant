// 新闻资讯后端模块
import { Module, Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Controller('news')
export class NewsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getNews(@Query() query: any) {
    const where: any = {};
    if (query.category === 'finance') where.category = 'finance';
    if (query.category === 'important') where.importanceScore = { gte: 80 };
    return this.prisma.newsArticle.findMany({ 
      where, 
      orderBy: { publishTime: 'desc' },
      take: 50 
    });
  }
}

@Module({
  controllers: [NewsController],
  providers: [PrismaService]
})
export class NewsModule {}
