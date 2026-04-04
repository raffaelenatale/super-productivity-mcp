import { z } from "zod";

const batchCreateDataSchema = z
  .object({
    title: z.string(),
    projectId: z.string().optional(),
    notes: z.string().optional(),
    timeEstimate: z.number().optional(),
    tagIds: z.array(z.string()).optional(),
    parentId: z.string().optional(),
    dueDay: z.string().optional(),
    dueWithTime: z.number().optional(),
    deadlineDay: z.string().optional(),
    deadlineWithTime: z.number().optional(),
    remindAt: z.number().optional(),
    isDone: z.boolean().optional(),
  })
  .passthrough();

const batchUpdateFieldsSchema = z
  .object({
    title: z.string().optional(),
    notes: z.string().optional(),
    timeEstimate: z.union([z.number(), z.null()]).optional(),
    isDone: z.boolean().optional(),
    projectId: z.string().optional(),
    tagIds: z.union([z.array(z.string()), z.null()]).optional(),
    parentId: z.union([z.string(), z.null()]).optional(),
    dueDay: z.union([z.string(), z.null()]).optional(),
    dueWithTime: z.union([z.number(), z.null()]).optional(),
    deadlineDay: z.union([z.string(), z.null()]).optional(),
    deadlineWithTime: z.union([z.number(), z.null()]).optional(),
    remindAt: z.union([z.number(), z.null()]).optional(),
    timeSpent: z.union([z.number(), z.null()]).optional(),
    doneOn: z.union([z.number(), z.null()]).optional(),
  })
  .passthrough();

export const batchOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    tempId: z.string(),
    data: batchCreateDataSchema,
  }),
  z.object({
    type: z.literal("update"),
    taskId: z.string(),
    updates: batchUpdateFieldsSchema,
  }),
  z.object({
    type: z.literal("delete"),
    taskId: z.string(),
  }),
  z.object({
    type: z.literal("reorder"),
    taskIds: z.array(z.string()).min(1),
  }),
]);

export const batchOperationsArraySchema = z.array(batchOperationSchema).describe(
    [
      "Discriminated by type:",
      "create: { type, tempId, data } — data.title required; other fields optional (passthrough for app-specific keys).",
      "update: { type, taskId, updates } — partial task fields; null clears where supported.",
      "delete: { type, taskId }",
      "reorder: { type, taskIds } — non-empty ordered ids",
    ].join(" "),
  );

export type BatchOperation = z.infer<typeof batchOperationSchema>;
