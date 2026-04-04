# Private Docker deploy (example)

Keep machine-specific paths **out of the public repository**.

1. Copy this file to **`deploy.local.md`** (that name is in `.gitignore` — never committed).
2. Put a `docker-compose.yml` in a folder **outside** this repo if you prefer, and set `build.context` to the **absolute path** of your clone of `super-productivity-mcp`.
3. From that folder: `docker compose up -d --build`.

Adjust `ports` and `PORT` so they match the Socket.IO URL in the MCP Bridge plugin (`plugin.js` / `plugin-logic.js`).
