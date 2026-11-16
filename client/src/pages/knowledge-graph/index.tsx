import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { knowledgeGraph } from '@client/src/api';
import type { SkillGraphData, SkillGraphNode, SkillGraphNodeDetail } from '@shared/api.interface';
import { Badge } from '@client/src/components/ui/badge';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { SKILL_CATEGORIES } from '@shared/api.interface';

const NODE_RADIUS = 32;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const SCALE_STEP = 0.15;

const LEVEL_COLORS: Record<number, { fill: string; stroke: string; label: string }> = {
  1: { fill: '#3b82f6', stroke: '#2563eb', label: '基础' },
  2: { fill: '#22c55e', stroke: '#16a34a', label: '进阶' },
  3: { fill: '#f97316', stroke: '#ea580c', label: '高级' },
};

const KnowledgeGraphPage: React.FC = () => {
  const [graphData, setGraphData] = useState<SkillGraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeDetail, setNodeDetail] = useState<SkillGraphNodeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [scale, setScale] = useState<number>(1);
  const [translate, setTranslate] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, SkillGraphNode>();
    if (graphData) {
      graphData.nodes.forEach((node: SkillGraphNode) => {
        map.set(node.id, node);
      });
    }
    return map;
  }, [graphData]);

  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    SKILL_CATEGORIES.forEach((c) => {
      map.set(c.key, c.label);
    });
    if (graphData) {
      graphData.categories.forEach((c) => {
        if (!map.has(c.key)) map.set(c.key, c.label);
      });
    }
    return map;
  }, [graphData]);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const cat = category === 'all' ? undefined : category;
      const q = search.trim() || undefined;
      const data: SkillGraphData = await knowledgeGraph.getKnowledgeGraph(cat, q);
      setGraphData(data);
      setSelectedNodeId(null);
      setNodeDetail(null);
    } catch (error) {
      logger.error('加载知识图谱失败', error);
      setGraphData({ nodes: [], edges: [], categories: [] });
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    void fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      void fetchGraph();
    }, 400);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const autoFit = useCallback(() => {
    if (!graphData || !containerRef.current || graphData.nodes.length === 0) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    graphData.nodes.forEach((node: SkillGraphNode) => {
      if (node.xPos < minX) minX = node.xPos;
      if (node.yPos < minY) minY = node.yPos;
      if (node.xPos > maxX) maxX = node.xPos;
      if (node.yPos > maxY) maxY = node.yPos;
    });

    const padding = 80;
    const graphWidth = maxX - minX + NODE_RADIUS * 2 + padding * 2;
    const graphHeight = maxY - minY + NODE_RADIUS * 2 + padding * 2;
    const newScale = Math.min(width / graphWidth, height / graphHeight, 1.2);
    const boundedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    const offsetX = (width - (maxX + minX) * boundedScale) / 2 - NODE_RADIUS * boundedScale;
    const offsetY = (height - (maxY + minY) * boundedScale) / 2 - NODE_RADIUS * boundedScale;

    setScale(boundedScale);
    setTranslate({ x: offsetX, y: offsetY });
  }, [graphData]);

  useEffect(() => {
    if (!loading && graphData && graphData.nodes.length > 0) {
      autoFit();
    }
  }, [loading, graphData, autoFit]);

  const handleNodeClick = useCallback(async (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setDetailLoading(true);
    try {
      const detail: SkillGraphNodeDetail = await knowledgeGraph.getNodeDetail(nodeId);
      setNodeDetail(detail);
    } catch (error) {
      logger.error('加载节点详情失败', error);
      setNodeDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setScale((prev) => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta));
      if (!svgRef.current || next === prev) return prev;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const ratio = next / prev;
      setTranslate((t) => ({
        x: mouseX - (mouseX - t.x) * ratio,
        y: mouseY - (mouseY - t.y) * ratio,
      }));
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== e.currentTarget && !(e.target as SVGElement).classList.contains('graph-bg')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(MAX_SCALE, prev + SCALE_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(MIN_SCALE, prev - SCALE_STEP));
  }, []);

  const handleReset = useCallback(() => {
    autoFit();
  }, [autoFit]);

  const getLevelColor = (level: number) => LEVEL_COLORS[level] || LEVEL_COLORS[1];

  const focusNode = useCallback((nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node || !containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const targetX = width / 2 - node.xPos * scale;
    const targetY = height / 2 - node.yPos * scale;
    setTranslate({ x: targetX, y: targetY });
    void handleNodeClick(nodeId);
  }, [nodeMap, scale, handleNodeClick]);

  const edges = graphData?.edges ?? [];
  const nodes = graphData?.nodes ?? [];

  const renderEdgePath = (from: SkillGraphNode | undefined, to: SkillGraphNode | undefined) => {
    if (!from || !to) return null;
    const x1 = from.xPos + NODE_RADIUS;
    const y1 = from.yPos + NODE_RADIUS;
    const x2 = to.xPos + NODE_RADIUS;
    const y2 = to.yPos + NODE_RADIUS;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const startX = x1 + ux * NODE_RADIUS;
    const startY = y1 + uy * NODE_RADIUS;
    const endX = x2 - ux * (NODE_RADIUS + 6);
    const endY = y2 - uy * (NODE_RADIUS + 6);
    const markerId = `arrow-${from.id}-${to.id}`;
    return (
      <g key={`edge-${from.id}-${to.id}`}>
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
          </marker>
        </defs>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#9ca3af"
          strokeWidth={1.5}
          markerEnd={`url(#${markerId})`}
        />
      </g>
    );
  };

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] min-h-[600px] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">知识图谱</h2>
          <p className="text-sm text-muted-foreground mt-1">
            可视化展示技能之间的依赖关系，点击节点查看详情
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-card border rounded-xl p-3">
        <div className="w-48">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {(graphData?.categories ?? []).map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label} ({c.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 max-w-md">
          <Input
            placeholder="搜索技能名称..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleZoomOut}
            className="w-9 h-9 flex items-center justify-center border rounded-md hover:bg-secondary transition-colors text-lg font-medium"
            title="缩小"
          >
            −
          </button>
          <span className="w-14 text-center text-sm text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="w-9 h-9 flex items-center justify-center border rounded-md hover:bg-secondary transition-colors text-lg font-medium"
            title="放大"
          >
            +
          </button>
          <button
            onClick={handleReset}
            className="ml-2 px-3 h-9 flex items-center justify-center border rounded-md hover:bg-secondary transition-colors text-sm"
          >
            重置视图
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div
          ref={containerRef}
          className="flex-1 bg-card border rounded-xl overflow-hidden relative min-w-0"
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-card/80">
              <div className="text-muted-foreground">加载中...</div>
            </div>
          )}
          {!loading && nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center text-muted-foreground">
                <div className="text-lg mb-2">暂无节点</div>
                <div className="text-sm">尝试更换分类或搜索关键词</div>
              </div>
            </div>
          )}
          <svg
            ref={svgRef}
            className="w-full h-full graph-bg cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <rect
              className="graph-bg"
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="transparent"
            />
            <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
              {edges.map((edge) => {
                const fromNode = nodeMap.get(edge.fromNodeId);
                const toNode = nodeMap.get(edge.toNodeId);
                return renderEdgePath(fromNode, toNode);
              })}
              {nodes.map((node: SkillGraphNode) => {
                const colors = getLevelColor(node.level);
                const isSelected = node.id === selectedNodeId;
                const cx = node.xPos + NODE_RADIUS;
                const cy = node.yPos + NODE_RADIUS;
                return (
                  <g
                    key={node.id}
                    className="cursor-pointer"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      void handleNodeClick(node.id);
                    }}
                  >
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={NODE_RADIUS + 6}
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth={3}
                        opacity={0.4}
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={NODE_RADIUS}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={2}
                    />
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fill="white"
                      fontSize={12}
                      fontWeight={600}
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.name.length > 4 ? node.name.slice(0, 4) + '…' : node.name}
                    </text>
                    <text
                      x={cx}
                      y={cy + NODE_RADIUS + 16}
                      textAnchor="middle"
                      fill="#374151"
                      fontSize={11}
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="absolute bottom-3 left-3 flex gap-2">
            {Object.entries(LEVEL_COLORS).map(([lvl, colors]) => (
              <div key={lvl} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors.fill }}
                />
                {colors.label}
              </div>
            ))}
          </div>
        </div>

        <div
          className="bg-card border rounded-xl p-5 flex-shrink-0 overflow-y-auto"
          style={{ width: '320px', minWidth: '280px' }}
        >
          {!selectedNodeId && (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                <span className="text-xl">ℹ</span>
              </div>
              <div className="font-medium text-foreground mb-1">选择一个节点</div>
              <div className="text-sm">点击图谱中的技能节点查看详细信息</div>
            </div>
          )}

          {selectedNodeId && detailLoading && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              加载详情中...
            </div>
          )}

          {selectedNodeId && !detailLoading && nodeDetail && (
            <div className="space-y-5">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold">{nodeDetail.name}</h3>
                  <Badge variant="secondary">{getLevelColor(nodeDetail.level).label}</Badge>
                </div>
                <div className="mt-2">
                  <Badge variant="outline">
                    {categoryLabelMap.get(nodeDetail.category) || nodeDetail.category}
                  </Badge>
                </div>
              </div>

              {nodeDetail.description && (
                <div>
                  <div className="text-sm font-medium text-foreground mb-1.5">技能描述</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {nodeDetail.description}
                  </p>
                </div>
              )}

              {nodeDetail.prerequisites.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-foreground mb-1.5">前置技能</div>
                  <div className="flex flex-wrap gap-1.5">
                    {nodeDetail.prerequisites.map((pre: SkillGraphNode) => (
                      <button
                        key={pre.id}
                        onClick={() => focusNode(pre.id)}
                        className="px-2 py-1 text-xs border rounded-md hover:bg-secondary transition-colors"
                      >
                        {pre.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {nodeDetail.nextSkills.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-foreground mb-1.5">后续技能</div>
                  <div className="flex flex-wrap gap-1.5">
                    {nodeDetail.nextSkills.map((next: SkillGraphNode) => (
                      <button
                        key={next.id}
                        onClick={() => focusNode(next.id)}
                        className="px-2 py-1 text-xs border rounded-md hover:bg-secondary transition-colors"
                      >
                        {next.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {nodeDetail.relatedCourses.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-foreground mb-1.5">
                    关联课程 ({nodeDetail.relatedCourses.length})
                  </div>
                  <div className="space-y-1.5">
                    {nodeDetail.relatedCourses.map((course) => (
                      <div
                        key={course.id}
                        className="text-sm p-2 bg-secondary/50 rounded-md"
                      >
                        <div className="font-medium">{course.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {course.platform}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {nodeDetail.relatedTasks.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-foreground mb-1.5">
                    关联任务 ({nodeDetail.relatedTasks.length})
                  </div>
                  <div className="space-y-1.5">
                    {nodeDetail.relatedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="text-sm p-2 bg-secondary/50 rounded-md"
                      >
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          状态：{task.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphPage;
