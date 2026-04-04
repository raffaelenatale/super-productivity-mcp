# MCP server (Node)

The server exposes **Streamable HTTP** MCP at `POST /mcp` (and related session routes) and a **Socket.IO** server used by the in-app plugin on the same HTTP process.

## Build and run

```bash
cd super-productivity-mcp   # or this repo root
npm ci
npm run build
PORT=3996 npm start
```

`npm start` runs `node dist/index.js start`.

Default `PORT` is **3000** if unset. Docs often use **3996** as an example; any free port is fine as long as the plugin URL matches.

**Bind address:** `MCP_HOST` defaults to **`127.0.0.1`** so the HTTP and Socket.IO listener is not exposed on the LAN. Use **`MCP_HOST=0.0.0.0`** only when you need other machines or containers to reach the server (for example Docker port publishing). The MCP endpoint is not authenticated; treat exposure like any local admin surface.

## Environment

| Variable    | Purpose                          | Default      |
|------------|-----------------------------------|--------------|
| `PORT`     | HTTP listen port                  | `3000`       |
| `MCP_HOST` | Address to bind (`127.0.0.1`, `0.0.0.0`, …) | `127.0.0.1` |
| `NODE_ENV` | Typical value `production`        | —            |

Optional `.env` (if you use a loader) — do not commit secrets:

```env
PORT=3996
MCP_HOST=127.0.0.1
NODE_ENV=production
```

## Endpoints

- **MCP (Streamable HTTP):** `http://<host>:<PORT>/mcp`
- **Health (plugin):** plugin HTTP server on **3838** inside Electron (Express routes under `/api/...`) — used when the MCP server talks to Super Productivity via HTTP instead of Socket.IO (advanced / alternate setups).

The default integration path for this repo is: **MCP server ↔ Socket.IO ↔ plugin inside Super Productivity**.

## Socket.IO

The plugin connects **outbound** to the MCP server URL (e.g. `http://localhost:3996`). The server accepts the connection and routes tool calls to the plugin via acknowledged events (`tasks:get`, `tasks:create`, etc.).

Ensure no firewall blocks **localhost** traffic between the app and the Node process.

## Optional CLI (debugging)

The same binary exposes **commander** subcommands (`projects`, `tasks`, `tags`, …). They talk to Super Productivity only if a Socket.IO link is registered on the MCP server process.

**Normal setup:** the in-app plugin connects **to** the MCP server; you do not need this CLI for MCP HTTP clients.

**If you use the `connect` subcommand:** it opens `socket.io-client` to `http://localhost:1044` by default (see `src/index.ts`). That is an alternate/dev wiring; change the URL there if your listener differs. With a working socket, you can run:

```bash
npm run connect
npm run cli:projects
npm run cli:tasks
npm run cli:tags
```

Usually you will instead start `npm start`, enable the plugin pointing at the same `PORT`, and use MCP tools from your IDE or OpenClaw.

List all subcommands:

```bash
npm run cli -- --help
```
