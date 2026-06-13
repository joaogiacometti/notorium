import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  FlashcardStatisticsStreak,
  FlashcardStatisticsTrendPoint,
} from "@/lib/server/api-contracts";

interface ReviewHeatmapProps {
  heatmap: FlashcardStatisticsTrendPoint[];
  streak: FlashcardStatisticsStreak;
}

type HeatmapCell = FlashcardStatisticsTrendPoint | null;

// Opacity of the --chart-2 hue per intensity level (index 0 is the empty cell).
const levelOpacity = [0, 30, 50, 70, 100];

function getIntensityLevel(count: number): number {
  if (count <= 0) return 0;
  if (count < 4) return 1;
  if (count < 9) return 2;
  if (count < 16) return 3;
  return 4;
}

function cellBackground(level: number): string {
  if (level === 0) {
    return "var(--muted)";
  }
  return `color-mix(in oklab, var(--chart-2) ${levelOpacity[level]}%, transparent)`;
}

function formatCellLabel(point: FlashcardStatisticsTrendPoint): string {
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${point.date}T00:00:00.000Z`));
  const noun = point.count === 1 ? "review" : "reviews";
  return `${point.count} ${noun} on ${label}`;
}

function buildWeeks(heatmap: FlashcardStatisticsTrendPoint[]): HeatmapCell[][] {
  if (heatmap.length === 0) {
    return [];
  }
  const firstWeekday = new Date(`${heatmap[0].date}T00:00:00.000Z`).getUTCDay();
  const cells: HeatmapCell[] = [
    ...Array.from<HeatmapCell>({ length: firstWeekday }).fill(null),
    ...heatmap,
  ];
  const weeks: HeatmapCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

function StreakStat({
  label,
  value,
}: Readonly<{ label: string; value: number }>) {
  return (
    <div className="flex items-center gap-1.5">
      <Flame className="size-3.5 text-(--chart-2)" />
      <span className="text-base font-semibold leading-none tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span>Less</span>
      {levelOpacity.map((opacity, level) => (
        <span
          key={opacity}
          className="size-2.5 rounded-[2px]"
          style={{ backgroundColor: cellBackground(level) }}
        />
      ))}
      <span>More</span>
    </div>
  );
}

export function ReviewHeatmap({
  heatmap,
  streak,
}: Readonly<ReviewHeatmapProps>) {
  const weeks = buildWeeks(heatmap);
  const totalReviews = heatmap.reduce((sum, point) => sum + point.count, 0);

  return (
    <Card className="gap-0 rounded-xl border-border/70 py-0 shadow-none">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-0">
        <CardTitle className="text-sm">Review activity</CardTitle>
        <div className="flex items-center gap-4">
          <StreakStat label="day streak" value={streak.current} />
          <StreakStat label="longest" value={streak.longest} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        {totalReviews === 0 ? (
          <p className="text-xs text-muted-foreground">
            No reviews in the last year. Start reviewing to build a streak.
          </p>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-[3px]">
              {weeks.map((week, weekIndex) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: week columns are positional and stable
                  key={weekIndex}
                  className="flex flex-col gap-[3px]"
                >
                  {week.map((cell, dayIndex) =>
                    cell ? (
                      <span
                        key={cell.date}
                        title={formatCellLabel(cell)}
                        className="size-2.5 rounded-[2px]"
                        style={{
                          backgroundColor: cellBackground(
                            getIntensityLevel(cell.count),
                          ),
                        }}
                      />
                    ) : (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: leading pad cells have no date
                        key={`pad-${weekIndex}-${dayIndex}`}
                        className="size-2.5"
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {totalReviews} reviews in the last year
          </p>
          <HeatmapLegend />
        </div>
      </CardContent>
    </Card>
  );
}
