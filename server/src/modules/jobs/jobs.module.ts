// 岗位推荐后端模块
import { Module, Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Controller('jobs')
export class JobsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getJobs(@Query() query: any) {
    const where: any = {};
    if (query.city) where.city = { contains: query.city };
    if (query.type) where.type = query.type;
    if (query.source) where.source = query.source;
    return this.prisma.job.findMany({ where, take: 50 });
  }
}

@Module({
  controllers: [JobsController],
  providers: [PrismaService]
})
export class JobsModule {}
