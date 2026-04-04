import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SuperProductivityClient } from "../client/sp-client.js";

export function setupUITools(server: McpServer, client: SuperProductivityClient) {
  server.registerTool(
    "show_notification",
    {
      description: "Shows a desktop notification in Super Productivity. Uses the bridge's showNotification(message, type, duration).",
      inputSchema: {
        message: z.string().describe("Notification message text"),
        type: z.enum(["SUCCESS", "ERROR", "INFO"]).optional().default("INFO").describe("Notification type"),
        duration: z.number().optional().describe("Display duration in milliseconds"),
      },
    },
    async (params) => {
      try {
        await client.notify(params);
        return {
          content: [
            {
              type: "text",
              text: "Notification sent",
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
    }
  );

  server.registerTool(
    "show_snack",
    {
      description: "Shows a brief snack bar (toast) message in Super Productivity. Aligned with SnackCfg API.",
      inputSchema: {
        msg: z.string().describe("Snack bar message text"),
        type: z.enum(["SUCCESS", "ERROR", "WARNING", "INFO"]).optional().default("INFO").describe("Snack bar type"),
        ico: z.string().optional().describe("Icon identifier"),
        config: z.record(z.any()).optional().describe("Additional config (deprecated, prefer ico)"),
      },
    },
    async (params) => {
      try {
        const config = {
          msg: params.msg,
          type: params.type,
          ico: params.ico,
          ...params.config,
        };
        await client.showSnack(config);
        return {
          content: [
            {
              type: "text",
              text: "Snack shown",
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
    }
  );

  server.registerTool(
    "open_dialog",
    {
      description: "Opens a dialog in Super Productivity. Supports both a simple interface (type/title/message) and the official DialogCfg API (htmlContent/buttons).",
      inputSchema: {
        type: z.enum(["CONFIRM", "PROMPT"]).optional().default("CONFIRM").describe("Dialog type (simple interface)"),
        title: z.string().optional().describe("Dialog title (simple interface)"),
        message: z.string().describe("Dialog message body (simple interface)"),
        confirmText: z.string().optional().describe("Confirm button text (simple interface)"),
        cancelText: z.string().optional().describe("Cancel button text (simple interface)"),
        htmlContent: z.string().optional().describe("HTML content for dialog (official DialogCfg API)"),
        buttons: z
          .array(
            z.object({
              text: z.string().describe("Button label"),
              returnValue: z.any().optional().describe("Value returned when button is clicked"),
            }),
          )
          .optional()
          .describe("Custom buttons array (official DialogCfg API)"),
      },
    },
    async (params) => {
      try {
        if (params.htmlContent || params.buttons) {
          const config = {
            htmlContent: params.htmlContent,
            buttons: params.buttons,
          };
          const result = await client.openDialog(config);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        const config = {
          type: params.type,
          title: params.title,
          message: params.message,
          confirmText: params.confirmText,
          cancelText: params.cancelText,
        };
        const result = await client.openDialog(config);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
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
    }
  );
}
