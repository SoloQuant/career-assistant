import { Module } from '@nestjs/common';
import { SalaryCalcController } from './salary-calc.controller';
import { SalaryCalcService } from './salary-calc.service';

@Module({
  controllers: [SalaryCalcController],
  providers: [SalaryCalcService],
})
export class SalaryCalcModule {}
