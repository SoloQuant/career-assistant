import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
} from '@nestjs/common';
import type { NewsItem } from '@shared/api.interface';
import { NewsService } from './news.service';

@Controller('api/news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async list(@Query('category') category?: string): Promise<NewsItem[]> {
    return this.newsService.findAll(category);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<NewsItem> {
    const item: NewsItem | null = await this.newsService.findById(id);
    if (!item) {
      throw new NotFoundException('资讯不存在');
    }
    return item;
  }
}
