import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { FinanceNewsController } from './finance-news.controller';
import { FinanceNewsService } from './finance-news.service';

@Module({
  imports: [ScheduleModule.forRoot(), HttpModule],
  controllers: [FinanceNewsController],
  providers: [FinanceNewsService],
})
export class FinanceNewsModule {}
