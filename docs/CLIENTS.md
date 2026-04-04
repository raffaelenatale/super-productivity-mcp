# MCP clients

Any client that supports **Streamable HTTP** (or your chosen transport) can point at this server.

## Requirements

- **URL:** `http://<host>:<PORT>/mcp`
- **Transport:** `streamable-http` (or the name your client uses for the MCP Streamable HTTP profile)
- **Reachability:** `<host>` must be an address where the MCP server is listening (`MCP_HOST` and firewall; see [MCP_SERVER.md](MCP_SERVER.md)).

## Cursor

In Cursor MCP settings, add a server with the URL above. If the IDE runs on another machine than the server, use SSH port forwarding or a VPN so `localhost` resolves correctly from the IDE host.

Example tunnel:

```bash
ssh -L 3996:127.0.0.1:3996 user@server
```

Then use `http://127.0.0.1:3996/mcp` in Cursor.

## OpenClaw

See [OPENCLAW.md](OPENCLAW.md).

## Claude Desktop / stdio

Some clients expect a **stdio** MCP process. This server is primarily **HTTP + Socket.IO**. Use an MCP proxy or a client that supports **remote HTTP** MCP, or run a small stdio wrapper (not included here).
