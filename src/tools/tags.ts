import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SuperProductivityClient } from "../client/sp-client.js";

export function setupTagTools(server: McpServer, client: SuperProductivityClient) {
  server.registerTool(
    "list_tags",
    {
      description: "Lists all tags in Super Productivity. Returns count and array of tag objects.",
      inputSchema: {},
    },
    async () => {
      try {
        const tags = await client.getTags();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: tags.length,
                  tags: tags,
                },
                null,
                2
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
    }
  );

  server.registerTool(
    "create_tag",
    {
      description: "Creates a new tag for organizing and filtering tasks.",
      inputSchema: {
        title: z.string().describe("Tag title/name"),
        color: z.string().optional().describe("Tag color as hex code (e.g., '#ff5722')"),
        icon: z.string().optional().describe("Tag icon identifier"),
      },
    },
    async (params) => {
      try {
        const tagId = await client.createTag(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                tagId,
                message: `Tag created: ${params.title}`,
              }),
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
    "update_tag",
    {
      description: "Updates an existing tag's title, color, or icon.",
      inputSchema: {
        tagId: z.string().describe("Tag ID to update"),
        title: z.string().optional().describe("New tag title"),
        color: z.string().optional().describe("New tag color as hex code"),
        icon: z.string().optional().describe("New tag icon identifier"),
      },
    },
    async ({ tagId, ...updates }) => {
      try {
        await client.updateTag(tagId, updates);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Tag updated successfully",
              }),
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
    "delete_tag",
    {
      description: "⚠️ Permanently deletes a tag. Tasks using this tag will have the tag reference removed.",
      inputSchema: {
        tagId: z.string().describe("Tag ID to delete"),
      },
    },
    async ({ tagId }) => {
      try {
        await client.deleteTag(tagId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Tag deleted",
              }),
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
