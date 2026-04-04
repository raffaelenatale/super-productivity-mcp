import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SuperProductivityClient } from "../client/sp-client.js";

export function setupDataTools(server: McpServer, client: SuperProductivityClient) {
  server.registerTool(
    "persisted_data_load",
    {
      description: "Loads previously saved plugin-persisted data by key. Returns null if key does not exist.",
      inputSchema: { key: z.string().describe("Data key to load. Use a unique, namespaced key (e.g., 'my-plugin.settings').") },
    },
    async ({ key }) => {
      try {
        const data = await client.getPersistedData(key);
        return {
          content: [{ type: "text", text: JSON.stringify({ key, data }, null, 2) }],
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
    "persisted_data_save",
    {
      description: "Saves data to plugin-persistent storage. Overwrites any existing value for the key.",
      inputSchema: {
        key: z.string().describe("Data key. Use a unique, namespaced key (e.g., 'my-plugin.settings')."),
        data: z.any().describe("Data to save. Must be JSON-serializable."),
      },
    },
    async ({ key, data }) => {
      try {
        // Validate JSON-serializable
        JSON.stringify(data);
        await client.savePersistedData(key, data);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, key }) }],
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
