import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc, count, and, gte, lt } from 'drizzle-orm';
import { salaryCalcRecord } from '@server/database/schema';
import type {
  SalaryCalcRequest,
  SalaryCalcResult,
  SalaryCalcHistoryResponse,
} from '@shared/api.interface';

interface CitySocialParams {
  city: string;
  socialBase: number;
  fundBase: number;
  fundRatio: number;
}

const CITY_PARAMS: CitySocialParams[] = [
  { city: '北京', socialBase: 7226, fundBase: 33891, fundRatio: 0.12 },
  { city: '上海', socialBase: 7310, fundBase: 36549, fundRatio: 0.07 },
  { city: '广州', socialBase: 5284, fundBase: 38082, fundRatio: 0.12 },
  { city: '深圳', socialBase: 2792, fundBase: 43021, fundRatio: 0.05 },
  { city: '杭州', socialBase: 5092, fundBase: 38390, fundRatio: 0.12 },
  { city: '成都', socialBase: 4511, fundBase: 28405, fundRatio: 0.12 },
  { city: '南京', socialBase: 4494, fundBase: 33385, fundRatio: 0.12 },
  { city: '武汉', socialBase: 4548, fundBase: 28342, fundRatio: 0.12 },
  { city: '西安', socialBase: 4556, fundBase: 26244, fundRatio: 0.12 },
  { city: '苏州', socialBase: 4494, fundBase: 33385, fundRatio: 0.12 },
  { city: '天津', socialBase: 4400, fundBase: 26244, fundRatio: 0.12 },
  { city: '重庆', socialBase: 4359, fundBase: 22925, fundRatio: 0.12 },
];

interface TaxBracket {
  threshold: number;
  rate: number;
  quickDeduction: number;
  label: string;
}

const TAX_BRACKETS: TaxBracket[] = [
  { threshold: 3000, rate: 0.03, quickDeduction: 0, label: '3%' },
  { threshold: 12000, rate: 0.1, quickDeduction: 210, label: '10%' },
  { threshold: 25000, rate: 0.2, quickDeduction: 1410, label: '20%' },
  { threshold: 35000, rate: 0.25, quickDeduction: 2660, label: '25%' },
  { threshold: 55000, rate: 0.3, quickDeduction: 4410, label: '30%' },
  { threshold: 80000, rate: 0.35, quickDeduction: 7160, label: '35%' },
  { threshold: Infinity, rate: 0.45, quickDeduction: 15160, label: '45%' },
];

const PENSION_RATE = 0.08;
const MEDICAL_RATE = 0.02;
const UNEMPLOYMENT_RATE = 0.005;
const INJURY_RATE = 0;
const MATERNITY_RATE = 0;
const TAX_THRESHOLD = 5000;
const DEFAULT_SPECIAL_DEDUCTION = 1500;

function calcTax(taxableIncome: number): { tax: number; bracket: string } {
  if (taxableIncome <= 0) {
    return { tax: 0, bracket: '0%' };
  }
  for (let i = 0; i < TAX_BRACKETS.length; i += 1) {
    const bracket: TaxBracket = TAX_BRACKETS[i];
    if (taxableIncome <= bracket.threshold) {
      const tax: number = taxableIncome * bracket.rate - bracket.quickDeduction;
      return { tax: Math.max(0, tax), bracket: bracket.label };
    }
  }
  const last: TaxBracket = TAX_BRACKETS[TAX_BRACKETS.length - 1];
  return { tax: taxableIncome * last.rate - last.quickDeduction, bracket: last.label };
}

function calcYearEndBonusTax(bonus: number): { tax: number; bracket: string } {
  if (bonus <= 0) return { tax: 0, bracket: '0%' };
  const monthly: number = bonus / 12;
  const { bracket } = calcTax(monthly);
  // 年终奖直接按总额 * 税率 - 速算扣除数（月度）
  let rate: number = 0;
  let quickDeduction: number = 0;
  for (let i = 0; i < TAX_BRACKETS.length; i += 1) {
    const b: TaxBracket = TAX_BRACKETS[i];
    if (monthly <= b.threshold) {
      rate = b.rate;
      quickDeduction = b.quickDeduction;
      break;
    }
  }
  const tax: number = bonus * rate - quickDeduction;
  return { tax: Math.max(0, tax), bracket };
}

function getCityParams(city: string): CitySocialParams {
  const found: CitySocialParams | undefined = CITY_PARAMS.find(
    (c: CitySocialParams) => c.city === city,
  );
  return found ?? CITY_PARAMS[0];
}

@Injectable()
export class SalaryCalcService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  getCities(): CitySocialParams[] {
    return CITY_PARAMS.map((c: CitySocialParams) => ({
      city: c.city,
      socialBase: c.socialBase,
      fundBase: c.fundBase,
      fundRatio: c.fundRatio,
    }));
  }

  calculate(dto: SalaryCalcRequest, userId: string | null): SalaryCalcResult {
    const cityParams: CitySocialParams = getCityParams(dto.city);
    const socialBase: number = dto.socialBase ?? cityParams.socialBase;
    const fundBase: number = dto.fundBase ?? cityParams.fundBase;
    const fundRatio: number = dto.fundRatio ?? cityParams.fundRatio;
    const specialDeduction: number = dto.specialDeduction ?? DEFAULT_SPECIAL_DEDUCTION;

    const pension: number = socialBase * PENSION_RATE;
    const medical: number = socialBase * MEDICAL_RATE;
    const unemployment: number = socialBase * UNEMPLOYMENT_RATE;
    const injury: number = 0;
    const maternity: number = 0;
    const socialInsurance: number = pension + medical + unemployment + injury + maternity;
    const housingFund: number = fundBase * fundRatio;

    const taxableIncome: number = dto.grossSalary - socialInsurance - housingFund - TAX_THRESHOLD - specialDeduction;
    const { tax: incomeTax, bracket: taxBracket } = calcTax(taxableIncome);

    const netSalary: number = dto.grossSalary - socialInsurance - housingFund - incomeTax;

    let yearEndBonusTax: number = 0;
    let annualNetIncome: number = netSalary * 12;
    const yearEndBonus: number | undefined = dto.yearEndBonus;
    if (yearEndBonus !== undefined && yearEndBonus > 0) {
      const bonusResult = calcYearEndBonusTax(yearEndBonus);
      yearEndBonusTax = bonusResult.tax;
      annualNetIncome += yearEndBonus - yearEndBonusTax;
    }

    const result: SalaryCalcResult = {
      city: dto.city,
      grossSalary: dto.grossSalary,
      socialInsurance: Number(socialInsurance.toFixed(2)),
      housingFund: Number(housingFund.toFixed(2)),
      incomeTax: Number(incomeTax.toFixed(2)),
      netSalary: Number(netSalary.toFixed(2)),
      socialBase,
      fundBase,
      fundRatio,
      yearEndBonus: dto.yearEndBonus,
      annualNetIncome: Number(annualNetIncome.toFixed(2)),
      details: {
        pension: Number(pension.toFixed(2)),
        medical: Number(medical.toFixed(2)),
        unemployment: Number(unemployment.toFixed(2)),
        injury,
        maternity,
        specialDeduction,
        taxBracket,
      },
    };

    if (userId) {
      void this.saveRecord(userId, result);
    }

    return result;
  }

  private async saveRecord(userId: string, result: SalaryCalcResult): Promise<void> {
    try {
      await this.db.insert(salaryCalcRecord).values({
        city: result.city,
        grossSalary: String(result.grossSalary),
        socialInsurance: String(result.socialInsurance),
        housingFund: String(result.housingFund),
        incomeTax: String(result.incomeTax),
        netSalary: String(result.netSalary),
        socialBase: result.socialBase !== undefined ? String(result.socialBase) : null,
        fundBase: result.fundBase !== undefined ? String(result.fundBase) : null,
        fundRatio: result.fundRatio !== undefined ? String(result.fundRatio) : null,
        yearEndBonus: result.yearEndBonus !== undefined ? String(result.yearEndBonus) : null,
        annualNetIncome: result.annualNetIncome !== undefined ? String(result.annualNetIncome) : null,
        details: result.details,
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (err) {
      // 保存失败不影响计算结果
    }
  }

  async getRecords(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<SalaryCalcHistoryResponse> {
    const offset: number = (page - 1) * pageSize;
    const [records, totalResult] = await Promise.all([
      this.db
        .select()
        .from(salaryCalcRecord)
        .where(eq(salaryCalcRecord.createdBy, userId))
        .orderBy(desc(salaryCalcRecord.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(salaryCalcRecord)
        .where(eq(salaryCalcRecord.createdBy, userId)),
    ]);

    const total: number = Number(totalResult[0]?.count ?? 0);
    const items: SalaryCalcResult[] = records.map(
      (record: typeof salaryCalcRecord.$inferSelect) =>
        this.mapRecordToResult(record),
    );

    return { items, total };
  }

  async deleteRecord(userId: string, id: string): Promise<void> {
    const record = await this.db
      .select({ id: salaryCalcRecord.id, createdBy: salaryCalcRecord.createdBy })
      .from(salaryCalcRecord)
      .where(eq(salaryCalcRecord.id, id))
      .limit(1);

    if (record.length === 0) {
      throw new NotFoundException('记录不存在');
    }

    if (record[0].createdBy !== userId) {
      throw new ForbiddenException('无权删除该记录');
    }

    await this.db.delete(salaryCalcRecord).where(eq(salaryCalcRecord.id, id));
  }

  private mapRecordToResult(
    record: typeof salaryCalcRecord.$inferSelect,
  ): SalaryCalcResult {
    const details = record.details as SalaryCalcResult['details'];
    return {
      id: record.id,
      city: record.city,
      grossSalary: Number(record.grossSalary),
      socialInsurance: Number(record.socialInsurance),
      housingFund: Number(record.housingFund),
      incomeTax: Number(record.incomeTax),
      netSalary: Number(record.netSalary),
      socialBase: record.socialBase ? Number(record.socialBase) : undefined,
      fundBase: record.fundBase ? Number(record.fundBase) : undefined,
      fundRatio: record.fundRatio ? Number(record.fundRatio) : undefined,
      yearEndBonus: record.yearEndBonus ? Number(record.yearEndBonus) : undefined,
      annualNetIncome: record.annualNetIncome
        ? Number(record.annualNetIncome)
        : undefined,
      details,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
