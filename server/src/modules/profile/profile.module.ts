// 个人档案后端模块
import { Module, Controller, Get, Put, Body } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Controller('profile')
export class ProfileController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getProfile() {
    return this.prisma.profile.findFirst();
  }

  @Put()
  async updateProfile(@Body() data: any) {
    return this.prisma.profile.upsert({
      where: { id: data.id || 1 },
      update: data,
      create: data
    });
  }
}

@Module({
  controllers: [ProfileController],
  providers: [PrismaService]
})
export class ProfileModule {}
