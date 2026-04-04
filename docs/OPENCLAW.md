# OpenClaw (and other remote MCP clients)

OpenClaw can use the same MCP server over **Streamable HTTP** if it can reach the host and port where Node listens.

## Configuration snippet

Add an entry under `mcp.servers` in your OpenClaw config (path depends on install; often `openclaw.json` or equivalent):

```json
{
  "mcp": {
    "servers": {
      "superproductivity": {
        "url": "http://127.0.0.1:3996/mcp",
        "transport": "streamable-http"
      }
    }
  }
}
```

- Replace **`3996`** with your real `PORT`.
- Replace **`127.0.0.1`** with the correct host if OpenClaw runs elsewhere (see below).
- The server defaults to **`MCP_HOST=127.0.0.1`**. If OpenClaw runs in another network namespace (Docker, remote host), ensure the server is bound so that address is reachable (`MCP_HOST=0.0.0.0` in Docker is common; see [MCP_SERVER.md](MCP_SERVER.md)).

A copy-paste template without other secrets is in [examples/openclaw-mcp-snippet.json](examples/openclaw-mcp-snippet.json).

## Docker / LAN

If OpenClaw runs **inside a container** and the MCP server on the host:

- Use the host gateway IP from the container’s perspective (e.g. `172.17.0.1`, `host.docker.internal`, or your documented bridge address).
- Example only: `http://172.17.0.1:3996/mcp` — **do not** commit real internal IPs or tokens.

Ensure the port is **published** or reachable from that network namespace.

## MCP session after server restart

Streamable HTTP clients cache an **`mcp-session-id`**. If you **`systemctl restart`** (or otherwise restart) the MCP server, that id is no longer valid server-side.

**Symptom:** HTTP `400` with `Bad Request: No valid session ID`.

**Mitigation:** restart the OpenClaw process (or reconnect the MCP server in the client using /new) so a new session is established.

## Security

- Prefer **loopback** (`127.0.0.1`) or a private network; avoid exposing `/mcp` on the public internet without TLS and authentication. The Streamable HTTP MCP surface is not authenticated by default.
- Do not paste API keys or real `openclaw.json` files into public bug reports.
