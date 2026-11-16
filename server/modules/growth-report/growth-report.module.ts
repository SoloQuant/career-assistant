import { Module } from '@nestjs/common';
import { GrowthReportController } from './growth-report.controller';
import { GrowthReportService } from './growth-report.service';

@Module({
  controllers: [GrowthReportController],
  providers: [GrowthReportService],
})
export class GrowthReportModule {}
