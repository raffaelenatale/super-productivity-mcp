import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SuperProductivityClient } from "../client/sp-client.js";

function normalizeCounterValue(id: string, raw: unknown): { id: string; value: number; raw?: unknown } {
  if (raw === null || raw === undefined) {
    return { id, value: 0 };
  }
  if (typeof raw === "number" && !Number.isNaN(raw)) {
    return { id, value: raw };
  }
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const v = (raw as { value: unknown }).value;
    if (typeof v === "number" && !Number.isNaN(v)) {
      return { id, value: v, raw };
    }
  }
  return { id, value: Number.NaN, raw };
}

export function setupCounterTools(server: McpServer, client: SuperProductivityClient) {
  server.registerTool(
    "counters_list",
    {
      description: "Lists all counters with their current values. Returns an array of { id, value } objects.",
      inputSchema: {},
    },
    async () => {
      try {
        const counters = await client.getCounters();
        // Normalize: if response is a record/object, convert to array
        let rows: { id: string; value: unknown }[];
        if (Array.isArray(counters)) {
          rows = counters.map((row: unknown, i: number) => {
            if (row && typeof row === "object" && "id" in row) {
              const o = row as { id: string; value?: unknown };
              return { id: String(o.id), value: o.value !== undefined ? o.value : row };
            }
            return { id: `index_${i}`, value: row };
          });
        } else {
          rows = Object.entries(counters || {}).map(([id, value]) => ({ id, value }));
        }
        const normalized = rows.map(({ id, value }) => normalizeCounterValue(id, value));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ count: normalized.length, counters: normalized }, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "counter_get",
    {
      description: "Gets the current value of a specific counter.",
      inputSchema: { id: z.string().describe("Counter ID") },
    },
    async ({ id }) => {
      try {
        const counter = await client.getCounter(id);
        const normalized = normalizeCounterValue(id, counter);
        return {
          content: [{ type: "text", text: JSON.stringify(normalized, null, 2) }],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "counter_set",
    {
      description: "Sets a counter to a specific value.",
      inputSchema: {
        id: z.string().describe("Counter ID"),
        value: z.number().describe("Value to set"),
      },
    },
    async ({ id, value }) => {
      try {
        await client.setCounter(id, value);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, id, value }) }],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "counter_increment",
    {
      description: "Increments a counter. Use incrementBy for custom step size.",
      inputSchema: {
        id: z.string().describe("Counter ID"),
        incrementBy: z.number().optional().describe("Amount to increment by (defaults to 1)"),
      },
    },
    async ({ id, incrementBy }) => {
      try {
        const result = await client.incrementCounter(id, incrementBy);
        const normalized = normalizeCounterValue(id, result);
        return {
          content: [{ type: "text", text: JSON.stringify(normalized, null, 2) }],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "counter_decrement",
    {
      description: "Decrements a counter. Use decrementBy for custom step size.",
      inputSchema: {
        id: z.string().describe("Counter ID"),
        decrementBy: z.number().optional().describe("Amount to decrement by (defaults to 1)"),
      },
    },
    async ({ id, decrementBy }) => {
      try {
        const result = await client.decrementCounter(id, decrementBy);
        const normalized = normalizeCounterValue(id, result);
        return {
          content: [{ type: "text", text: JSON.stringify(normalized, null, 2) }],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "counter_delete",
    {
      description: "⚠️ Permanently deletes a counter. This action cannot be undone.",
      inputSchema: { id: z.string().describe("Counter ID") },
    },
    async ({ id }) => {
      try {
        await client.deleteCounter(id);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, id }) }],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
