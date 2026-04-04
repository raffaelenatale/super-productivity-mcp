import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SuperProductivityClient } from "../client/sp-client.js";
import {
  assertDispatchActionAllowed,
  describeActionsAllowlistEnv,
} from "../actions-allowlist.js";

export function setupMiscTools(server: McpServer, client: SuperProductivityClient) {
  server.registerTool(
    "config_get",
    {
      description:
        "Returns the full Super Productivity config. WARNING: May contain sensitive data (API keys, tokens, credentials). Use with caution.",
      inputSchema: {},
    },
    async () => {
      try {
        const config = await client.getConfig();
        return {
          content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "actions_dispatch",
    {
      description:
        "⚠️ DANGEROUS: Dispatches NgRx actions via PluginAPI.dispatchAction. Prefer dedicated MCP tools. " +
        describeActionsAllowlistEnv(),
      inputSchema: {
        action: z
          .string()
          .describe(
            "NgRx action type string. When SP_MCP_ACTIONS_ALLOWLIST is set, only listed actions are allowed; use * for any; omit env var for backward-compatible open mode.",
          ),
        payload: z
          .any()
          .optional()
          .describe("Second argument to dispatchAction; shape depends on the action type."),
      },
    },
    async ({ action, payload }) => {
      try {
        assertDispatchActionAllowed(action);
        await client.dispatchAction(action, payload);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, action }) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "window_focused",
    {
      description:
        "Focuses the Super Productivity application window (brings it to the foreground). Does NOT check if the window is focused — use is_window_focused for that.",
      inputSchema: {},
    },
    async () => {
      try {
        await client.focusWindow();
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, message: "Window focus requested" }) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
