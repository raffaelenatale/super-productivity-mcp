# Install Super Productivity and the MCP Bridge plugin

## Super Productivity

1. Install [Super Productivity](https://super-productivity.com/) (desktop **v14+** required for the plugin API used here).
2. For **headless Linux** (no monitor), run the app on a virtual display (e.g. Xvfb `:99`) and set `DISPLAY=:99`. See [SYSTEMD.md](SYSTEMD.md) for example units.

## MCP Bridge plugin

The plugin lives in `mcp-bridge-plugin/` in this repository. To ship it as a single file for **Settings → Plugins → Install from file**, zip that folder so `manifest.json` sits at the root of the archive.

**Headless server tip:** install and **enable** the plugin on a machine with a real display first (using the ZIP or a manual folder copy), then rely on Super Productivity **sync** or a **copied profile** so a VPS or Xvfb-only host gets the same `plugins/mcp-bridge` tree and enabled state without fighting a plugin UI over SSH alone.

1. Copy the **contents** of `mcp-bridge-plugin/` into the Super Productivity plugins directory, for example:
   - `~/.config/superProductivity/plugins/mcp-bridge/`
2. On some systems the config folder may use different casing (e.g. `SuperProductivity`). Use the path your installation actually writes to.
3. In Super Productivity: **Settings → Plugins** — enable **MCP Bridge**.
4. Edit the Socket.IO URL in `plugin.js` / `plugin-logic.js` if needed:

   ```js
   var socket = io("http://127.0.0.1:3996", { ... });
   ```

   On Linux prefer **`127.0.0.1`** over `localhost` when the MCP server is published on IPv4 only (e.g. Docker `127.0.0.1:3996:3996`), because `localhost` may resolve to `::1` and the socket will not connect.

   The **port must match** the MCP server `PORT` (see [MCP_SERVER.md](MCP_SERVER.md)).

5. Restart Super Productivity after changing the plugin or server port.

## Verify

- Start the MCP server first, then Super Productivity (or restart the app after the server is up).
- In the MCP server logs you should see a line like: `Super Productivity plugin connected:` followed by a socket id.
