// 数据看板后端模块
import { Module, Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getDashboard() {
    const skillCount = await this.prisma.skill.count();
    const taskCount = await this.prisma.task.count();
    const completedTasks = await this.prisma.task.count({ where: { completed: true } });
    const applicationCount = await this.prisma.application.count();

    return {
      stats: {
        skillCount,
        taskCompletionRate: taskCount > 0 ? Math.round(completedTasks / taskCount * 100) : 0,
        applicationCount
      },
      radar: {}
    };
  }
}

@Module({
  controllers: [DashboardController],
  providers: [PrismaService]
})
export class DashboardModule {}
