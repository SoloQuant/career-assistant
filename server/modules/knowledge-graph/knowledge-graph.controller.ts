import { Controller, Get, Param, Query } from '@nestjs/common';
import { KnowledgeGraphService } from './knowledge-graph.service';
import type {
  SkillGraphData,
  SkillGraphNodeDetail,
} from '@shared/api.interface';

@Controller('api/knowledge-graph')
export class KnowledgeGraphController {
  constructor(private readonly service: KnowledgeGraphService) {}

  @Get()
  async getGraph(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ): Promise<SkillGraphData> {
    return this.service.getGraph(category, search);
  }

  @Get(':id')
  getNodeDetail(@Param('id') id: string): Promise<SkillGraphNodeDetail> {
    return this.service.getNodeDetail(id);
  }
}
