import { Module } from '@nestjs/common';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { KnowledgeGraphService } from './knowledge-graph.service';

@Module({
  controllers: [KnowledgeGraphController],
  providers: [KnowledgeGraphService],
})
export class KnowledgeGraphModule {}
