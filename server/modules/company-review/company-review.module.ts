import { Module } from '@nestjs/common';
import { CompanyReviewController } from './company-review.controller';
import { CompanyReviewService } from './company-review.service';

@Module({
  controllers: [CompanyReviewController],
  providers: [CompanyReviewService],
})
export class CompanyReviewModule {}
