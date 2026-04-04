# Architecture

```mermaid
flowchart LR
  subgraph clients [MCP clients]
    Cursor[Cursor_or_IDE]
    OpenClaw[OpenClaw]
  end
  subgraph node [MCP server Node]
    HTTP[MCP_Streamable_HTTP]
    SIO[Socket_IO_server]
    HTTP --> SIO
  end
  subgraph sp [Super Productivity]
    Plugin[MCP_Bridge_plugin]
    App[Electron_app]
    Plugin --> App
  end
  clients -->|HTTP_POST_/mcp| HTTP
  SIO <-->|WebSocket| Plugin
  Plugin -->|PluginAPI| App
```

1. **MCP clients** call tools over **Streamable HTTP** (`/mcp`).
2. The **Node server** forwards work to the **plugin** via **Socket.IO** (plugin connects outbound to the server URL).
3. The **plugin** uses **Super Productivity Plugin API** (`getTasks`, `addTask`, etc.) against the running app.

Data stays in Super Productivity’s local store (and optional sync you configure there). The MCP server is a bridge, not a second database.
