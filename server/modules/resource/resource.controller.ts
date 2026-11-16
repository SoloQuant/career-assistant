import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import type { LearningResource } from '@shared/api.interface';
import { ResourceService } from './resource.service';

@Controller('api/resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Get()
  async list(@Query('category') category?: string): Promise<LearningResource[]> {
    return this.resourceService.findAll(category);
  }
}
