import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Profile, ProfileUpdateDto } from '@shared/api.interface';
import { ProfileService } from './profile.service';

@Controller('api/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@Req() req: Request): Promise<Profile> {
    const { userId } = req.userContext;
    const profile: Profile | null = await this.profileService.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('个人资料不存在');
    }
    return profile;
  }

  @Patch()
  async updateProfile(
    @Req() req: Request,
    @Body() dto: ProfileUpdateDto,
  ): Promise<Profile> {
    const { userId } = req.userContext;
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    return this.profileService.updateByUserId(userId, dto);
  }
}
