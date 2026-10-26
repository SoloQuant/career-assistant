// 技能管理后端模块
import { Module, Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Controller('skills')
export class SkillsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getSkills() {
    return this.prisma.skill.findMany({ include: { knowledgePoints: true } });
  }

  @Post()
  async createSkill(@Body() data: any) {
    return this.prisma.skill.create({ data });
  }

  @Put(':id')
  async updateSkill(@Param('id') id: string, @Body() data: any) {
    return this.prisma.skill.update({ where: { id: +id }, data });
  }

  @Delete(':id')
  async deleteSkill(@Param('id') id: string) {
    return this.prisma.skill.delete({ where: { id: +id } });
  }
}

@Module({
  controllers: [SkillsController],
  providers: [PrismaService]
})
export class SkillsModule {}
