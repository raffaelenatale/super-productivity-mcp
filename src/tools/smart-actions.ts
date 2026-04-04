import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SuperProductivityClient } from "../client/sp-client.js";

function endOfUtcDayFromYyyyMmDd(day: string): number {
  const parts = day.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return Date.now();
  const [y, m, d] = parts;
  return Date.UTC(y, m - 1, d, 23, 59, 59, 999);
}

const suggestDailyPlanInputSchema = {
  availableHours: z
    .number()
    .default(8)
    .describe("Hours available for focused work (default: 8)"),
  includeBreaks: z.boolean().default(true).describe("Reserve ~15% of time for breaks (default: true)"),
};

async function runSuggestDailyPlan(
  client: SuperProductivityClient,
  availableHours: number,
  includeBreaks: boolean,
) {
  const tasks = await client.getCurrentContextTasks();
  const pendingTasks = tasks.filter((t) => !t.isDone);

  const availableMinutes = availableHours * 60;
  const breakMinutes = includeBreaks ? Math.floor(availableMinutes * 0.15) : 0;
  const workMinutes = availableMinutes - breakMinutes;

  const selectedTasks: { id: unknown; title: unknown; estimatedMinutes: number; order: number }[] =
    [];
  let totalTime = 0;

  for (const task of pendingTasks) {
    const estimatedMinutes = ((task.timeEstimate as number) || 3600000) / (1000 * 60);
    if (totalTime + estimatedMinutes <= workMinutes) {
      selectedTasks.push({
        id: task.id,
        title: task.title,
        estimatedMinutes: Math.round(estimatedMinutes),
        order: selectedTasks.length + 1,
      });
      totalTime += estimatedMinutes;
    }
  }

  const plan = {
    date: new Date().toISOString().split("T")[0],
    totalAvailableTime: `${availableHours} hours`,
    workTime: `${Math.round(workMinutes / 60)} hours`,
    breakTime: includeBreaks ? `${Math.round(breakMinutes / 60)} hours` : "None",
    plannedTasks: selectedTasks,
    totalPlannedTime: `${Math.round(totalTime / 60)} hours ${Math.round(totalTime % 60)} minutes`,
    utilizationRate: `${((totalTime / workMinutes) * 100).toFixed(1)}%`,
    note: "Read-only suggestion; does not modify Super Productivity. Use batch_update_tasks or manual edits to apply.",
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(plan, null, 2),
      },
    ],
  };
}

function taskSchedulingInstantMs(task: Record<string, unknown>): number | null {
  if (typeof task.dueWithTime === "number" && task.dueWithTime > 0) {
    return task.dueWithTime;
  }
  if (typeof task.dueDay === "string" && task.dueDay.length >= 8) {
    return endOfUtcDayFromYyyyMmDd(task.dueDay);
  }
  if (typeof task.deadlineWithTime === "number" && task.deadlineWithTime > 0) {
    return task.deadlineWithTime;
  }
  if (typeof task.deadlineDay === "string" && task.deadlineDay.length >= 8) {
    return endOfUtcDayFromYyyyMmDd(task.deadlineDay);
  }
  return null;
}

export function setupSmartActions(
  server: McpServer,
  client: SuperProductivityClient,
) {
  server.registerTool(
    "analyze_productivity",
    {
      description: "Analyzes task productivity over the specified period. Returns completion rate, time estimation accuracy, and actionable insights. Read-only — does not modify any data.",
      inputSchema: {
        days: z.number().default(7).describe("Number of days to analyze (default: 7)"),
      },
    },
    async ({ days }) => {
      try {
        const tasks = await client.getTasks();
        const now = Date.now();
        const startDate = now - days * 24 * 60 * 60 * 1000;

        const recentTasks = tasks.filter(
          (t) => t.created >= startDate || (t.doneOn && t.doneOn >= startDate),
        );

        const completedTasks = recentTasks.filter((t) => t.isDone);
        const totalEstimated = recentTasks.reduce(
          (sum, t) => sum + (t.timeEstimate || 0),
          0,
        );
        const totalSpent = recentTasks.reduce((sum, t) => sum + t.timeSpent, 0);

        const analysis = {
          period: `${days} days`,
          totalTasks: recentTasks.length,
          completedTasks: completedTasks.length,
          completionRate:
            recentTasks.length > 0
              ? `${((completedTasks.length / recentTasks.length) * 100).toFixed(1)}%`
              : "0%",
          totalTimeEstimated: `${(totalEstimated / (1000 * 60 * 60)).toFixed(1)} hours`,
          totalTimeSpent: `${(totalSpent / (1000 * 60 * 60)).toFixed(1)} hours`,
          estimationAccuracy:
            totalEstimated > 0
              ? `${((totalSpent / totalEstimated) * 100).toFixed(1)}%`
              : "N/A",
          insights: generateInsights(
            recentTasks,
            completedTasks,
            totalEstimated,
            totalSpent,
          ),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "suggest_priorities",
    {
      description: "Suggests which tasks to work on next based on urgency (due dates), age, and complexity. Returns scored tasks with priority reasons. Read-only.",
      inputSchema: {
        projectId: z.string().optional().describe("Filter by project ID. If omitted, analyzes all projects."),
        maxTasks: z.number().default(5).describe("Maximum number of priority suggestions (default: 5)"),
      },
    },
    async ({ projectId, maxTasks }) => {
      try {
        let tasks = await client.getCurrentContextTasks();
        if (projectId) {
          tasks = tasks.filter((t) => t.projectId === projectId);
        }

        const pendingTasks = tasks.filter((t) => !t.isDone);

        const scoredTasks = pendingTasks.map((task) => {
          let score = 0;

          const dueMs = taskSchedulingInstantMs(task);
          if (dueMs !== null) {
            const daysUntilDue = (dueMs - Date.now()) / (1000 * 60 * 60 * 24);
            if (daysUntilDue < 1) score += 50;
            else if (daysUntilDue < 3) score += 30;
            else if (daysUntilDue < 7) score += 10;
          }

          if (!task.timeEstimate) score += 15;

          if (task.subTaskIds && (task.subTaskIds as unknown[]).length > 0) score += 20;

          const ageInDays = (Date.now() - (task.created as number)) / (1000 * 60 * 60 * 24);
          if (ageInDays > 7) score += 10;
          if (ageInDays > 14) score += 15;

          return { task, score };
        });

        const topTasks = scoredTasks
          .sort((a, b) => b.score - a.score)
          .slice(0, maxTasks)
          .map(({ task, score }) => ({
            id: task.id,
            title: task.title,
            priorityScore: score,
            reasons: explainPriority(task, score),
          }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  suggestions: topTasks,
                  message: `Top ${topTasks.length} priority tasks identified`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "suggest_daily_plan",
    {
      description:
        "Suggests a read-only daily work plan: fits pending context tasks into available hours (optional break allowance). Does not write to Super Productivity — use batch_update_tasks or other tools to apply.",
      inputSchema: suggestDailyPlanInputSchema,
    },
    async ({ availableHours, includeBreaks }) => {
      try {
        return await runSuggestDailyPlan(client, availableHours, includeBreaks);
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "create_daily_plan",
    {
      description:
        "Deprecated: use suggest_daily_plan. Same behavior — read-only JSON plan, no writes to the app.",
      inputSchema: suggestDailyPlanInputSchema,
    },
    async ({ availableHours, includeBreaks }) => {
      try {
        return await runSuggestDailyPlan(client, availableHours, includeBreaks);
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

function generateInsights(
  recentTasks: Record<string, unknown>[],
  completedTasks: Record<string, unknown>[],
  totalEstimated: number,
  totalSpent: number,
): string[] {
  const insights = [];
  const completionRate = recentTasks.length
    ? completedTasks.length / recentTasks.length
    : 0;

  if (completionRate > 0.8) {
    insights.push("Strong completion rate for this period.");
  } else if (completionRate < 0.4) {
    insights.push(
      "Low completion rate. Consider reviewing estimates or reducing work in progress.",
    );
  }

  if (totalEstimated > 0) {
    const accuracy = totalSpent / totalEstimated;
    if (accuracy > 1.2) {
      insights.push(
        "Time spent exceeds estimates; consider adding buffer to future estimates.",
      );
    } else if (accuracy < 0.8) {
      insights.push(
        "Tasks are finishing faster than estimated; estimates may be conservative.",
      );
    }
  }

  const tasksWithoutEstimate = recentTasks.filter(
    (t) => !t.timeEstimate,
  ).length;
  if (tasksWithoutEstimate > recentTasks.length * 0.3) {
    insights.push(
      `${tasksWithoutEstimate} tasks lack time estimates; adding them improves planning.`,
    );
  }

  return insights;
}

function explainPriority(task: Record<string, unknown>, score: number): string[] {
  const reasons = [];

  const dueMs = taskSchedulingInstantMs(task);
  if (dueMs !== null) {
    const daysUntilDue = (dueMs - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilDue < 1) reasons.push("Due within 24 hours");
    else if (daysUntilDue < 3) reasons.push("Due within 3 days");
  }

  if (!task.timeEstimate) reasons.push("No time estimate");

  if (task.subTaskIds && (task.subTaskIds as unknown[]).length > 0) {
    reasons.push(`Has ${(task.subTaskIds as unknown[]).length} subtasks`);
  }

  const ageInDays = (Date.now() - (task.created as number)) / (1000 * 60 * 60 * 24);
  if (ageInDays > 14) reasons.push("Task older than 2 weeks");

  return reasons;
}
