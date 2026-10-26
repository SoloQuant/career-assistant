// 任务管理后端模块（基础版）
import { Module, Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Controller('tasks')
export class TasksController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getTasks() {
    return this.prisma.task.findMany();
  }

  @Post()
  async createTask(@Body() data: any) {
    return this.prisma.task.create({ data });
  }

  @Put(':id')
  async updateTask(@Param('id') id: string, @Body() data: any) {
    return this.prisma.task.update({ where: { id: +id }, data });
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: string) {
    return this.prisma.task.delete({ where: { id: +id } });
  }
}

@Module({
  controllers: [TasksController],
  providers: [PrismaService]
})
export class TasksModule {}
