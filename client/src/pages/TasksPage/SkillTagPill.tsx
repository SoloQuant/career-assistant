import { Link } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SkillWithMastery } from '@shared/api.interface';

export function SkillTagPill({ skill }: { skill: SkillWithMastery }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={`/skills?highlight=${skill.id}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-background/60 backdrop-blur-sm transition-colors hover:border-primary/50 hover:text-primary"
            style={{
              borderColor: `color-mix(in srgb, ${getMasteryColor(skill.masteryLevel)} 35%, transparent)`,
              color: getMasteryColor(skill.masteryLevel),
            }}
          >
            <span className="text-[10px] font-mono opacity-70">
              {skill.masteryLevel}%
            </span>
            <span className="max-w-[120px] truncate">{skill.name}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{skill.name}</p>
          <p className="text-muted-foreground">掌握度 {skill.masteryLevel}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SkillTagSmall({ name, mastery }: { name: string; mastery: number }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border border-transparent"
      style={{
        backgroundColor: `color-mix(in srgb, ${getMasteryColor(mastery)} 12%, transparent)`,
        color: getMasteryColor(mastery),
      }}
    >
      {name}
    </span>
  );
}

export function SkillDot({ name, mastery }: { name: string; mastery: number }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: getMasteryColor(mastery) }}
          >
            {name.charAt(0)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{name}</p>
          <p className="text-muted-foreground">掌握度 {mastery}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function getMasteryColor(value: number): string {
  if (value < 40) return 'hsl(0 84% 60%)';
  if (value < 70) return 'hsl(38 90% 55%)';
  return 'hsl(160 70% 50%)';
}
