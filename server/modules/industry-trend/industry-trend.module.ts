import { Module } from '@nestjs/common';
import { IndustryTrendController } from './industry-trend.controller';
import { IndustryTrendService } from './industry-trend.service';

@Module({
  controllers: [IndustryTrendController],
  providers: [IndustryTrendService],
})
export class IndustryTrendModule {}
