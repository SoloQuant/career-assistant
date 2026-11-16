import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like, or, and, asc, inArray } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { skillGraphNode, skillGraphEdge } from '../../database/schema';
import { SKILL_CATEGORIES } from '@shared/api.interface';
import type {
  SkillGraphData,
  SkillGraphNode as SkillGraphNodeType,
  SkillGraphEdge as SkillGraphEdgeType,
  SkillGraphNodeDetail,
} from '@shared/api.interface';

@Injectable()
export class KnowledgeGraphService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getGraph(category?: string, search?: string): Promise<SkillGraphData> {
    const whereConditions = [];
    if (category) {
      whereConditions.push(eq(skillGraphNode.category, category));
    }
    if (search) {
      whereConditions.push(
        or(
          like(skillGraphNode.name, `%${search}%`),
          like(skillGraphNode.description, `%${search}%`),
        ),
      );
    }

    const nodesQuery = whereConditions.length > 0
      ? this.db.select().from(skillGraphNode).where(and(...whereConditions)).orderBy(asc(skillGraphNode.level))
      : this.db.select().from(skillGraphNode).orderBy(asc(skillGraphNode.level));

    const nodes = await nodesQuery;

    const nodeIds = nodes.map((n) => n.id);
    const edges = nodeIds.length > 0
      ? await this.db
          .select()
          .from(skillGraphEdge)
          .where(
            and(
              inArray(skillGraphEdge.fromNodeId, nodeIds),
              inArray(skillGraphEdge.toNodeId, nodeIds),
            ),
          )
      : [];

    const categoryCounts: Record<string, number> = {};
    for (const node of nodes) {
      categoryCounts[node.category] = (categoryCounts[node.category] || 0) + 1;
    }

    const allCategories = SKILL_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      count: categoryCounts[c.key] || 0,
    }));

    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        skillId: n.skillId,
        name: n.name,
        category: n.category,
        description: n.description || '',
        level: n.level,
        xPos: n.xPos ? Number(n.xPos) : 0,
        yPos: n.yPos ? Number(n.yPos) : 0,
        relatedCourseIds: n.relatedCourseIds || [],
        relatedTaskIds: n.relatedTaskIds || [],
      })),
      edges: edges.map((e) => ({
        id: e.id,
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
        relationType: e.relationType,
        weight: Number(e.weight),
      })),
      categories: allCategories,
    };
  }

  async getNodeDetail(id: string): Promise<SkillGraphNodeDetail> {
    const [node] = await this.db
      .select()
      .from(skillGraphNode)
      .where(eq(skillGraphNode.id, id))
      .limit(1);

    if (!node) {
      throw new NotFoundException('技能节点不存在');
    }

    const prereqEdges = await this.db
      .select()
      .from(skillGraphEdge)
      .where(eq(skillGraphEdge.toNodeId, id));
    const nextEdges = await this.db
      .select()
      .from(skillGraphEdge)
      .where(eq(skillGraphEdge.fromNodeId, id));

    const prereqIds = prereqEdges.map((e) => e.fromNodeId);
    const nextIds = nextEdges.map((e) => e.toNodeId);

    const prerequisites = prereqIds.length > 0
      ? await this.db.select().from(skillGraphNode).where(inArray(skillGraphNode.id, prereqIds))
      : [];
    const nextSkills = nextIds.length > 0
      ? await this.db.select().from(skillGraphNode).where(inArray(skillGraphNode.id, nextIds))
      : [];

    const baseNode: SkillGraphNodeType = {
      id: node.id,
      skillId: node.skillId,
      name: node.name,
      category: node.category,
      description: node.description || '',
      level: node.level,
      xPos: node.xPos ? Number(node.xPos) : 0,
      yPos: node.yPos ? Number(node.yPos) : 0,
      relatedCourseIds: node.relatedCourseIds || [],
      relatedTaskIds: node.relatedTaskIds || [],
    };

    return {
      ...baseNode,
      prerequisites: prerequisites.map((p) => ({
        id: p.id,
        skillId: p.skillId,
        name: p.name,
        category: p.category,
        description: p.description || '',
        level: p.level,
        xPos: p.xPos ? Number(p.xPos) : 0,
        yPos: p.yPos ? Number(p.yPos) : 0,
        relatedCourseIds: p.relatedCourseIds || [],
        relatedTaskIds: p.relatedTaskIds || [],
      })),
      nextSkills: nextSkills.map((s) => ({
        id: s.id,
        skillId: s.skillId,
        name: s.name,
        category: s.category,
        description: s.description || '',
        level: s.level,
        xPos: s.xPos ? Number(s.xPos) : 0,
        yPos: s.yPos ? Number(s.yPos) : 0,
        relatedCourseIds: s.relatedCourseIds || [],
        relatedTaskIds: s.relatedTaskIds || [],
      })),
      relatedCourses: [],
      relatedTasks: [],
    };
  }
}
