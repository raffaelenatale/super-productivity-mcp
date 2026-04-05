# Super Productivity MCP

[MCP](https://modelcontextprotocol.io/) server that connects **[Super Productivity](https://super-productivity.com/)** to external tools via **Streamable HTTP**, using an in-app **MCP Bridge** plugin and **Socket.IO**.

This repository is an **independent community bridge**, not the official Super Productivity app. The maintainers of **super-productivity-mcp** are **not** the owners or core team of Super Productivity. For the app itself, see the [project website](https://super-productivity.com/) and the upstream source at [github.com/super-productivity/super-productivity](https://github.com/super-productivity/super-productivity).

## Features

- Task and project operations (list, create, update, delete, batch, reorder, duplicate, …)
- Tags, counters, UI helpers, persisted plugin data, optional action dispatch (restricted)
- Runs beside Super Productivity; data remains in the app

## Requirements

- **Node.js** 18+
- **[Super Productivity](https://super-productivity.com/)** 14+ (plugin API; [upstream repo](https://github.com/super-productivity/super-productivity))
- Plugin files from `mcp-bridge-plugin/` installed into the app’s plugin directory

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/HEADLESS_VPS_SETUP.md](docs/HEADLESS_VPS_SETUP.md) | **Complete headless VPS setup** with Xvfb, systemd, and profile sync (recommended for production) |
| [docs/INSTALL.md](docs/INSTALL.md) | Super Productivity + plugin install (manual, local machine) |
| [docs/MCP_SERVER.md](docs/MCP_SERVER.md) | Build, run, ports, Socket.IO configuration |
| [docs/SYSTEMD.md](docs/SYSTEMD.md) | Example systemd units (reference; see HEADLESS_VPS_SETUP.md for full instructions) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data flow and architecture diagram |
| [docs/CLIENTS.md](docs/CLIENTS.md) | Cursor and generic MCP clients |
| [docs/OPENCLAW.md](docs/OPENCLAW.md) | OpenClaw `streamable-http` setup |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and solutions |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Build, Git, PR notes |
| [SECURITY.md](SECURITY.md) | Vulnerability reporting |

## Quick start

```bash
npm ci
npm run build
npm start          # listens on 127.0.0.1:3000 by default
# or: PORT=3996 npm start
```

Install the plugin (see [docs/INSTALL.md](docs/INSTALL.md)), ensure `plugin-logic.js` points at the same port and host as the server (the plugin defaults to `http://127.0.0.1:3996`; use `MCP_HOST=0.0.0.0` for Docker or LAN-only setups — see [docs/MCP_SERVER.md](docs/MCP_SERVER.md)), then start Super Productivity. The server log shows `Super Productivity plugin connected:` when the bridge attaches.

### For headless VPS deployments ⭐

**Do not skip the [HEADLESS_VPS_SETUP.md](docs/HEADLESS_VPS_SETUP.md) guide.** It covers the complete, tested workflow for deploying on a headless Linux VPS:

- Installing Xvfb (virtual display)
- Creating systemd units for Xvfb, MCP Server, and Super Productivity
- **Syncing the plugin enabled state** from your local machine (required, because there’s no way to enable plugins on a headless session)
- Verifying the setup and troubleshooting common issues

### Plugin ZIP, enabling on a machine with a display, and a headless VPS

You **must** enable the plugin on a machine **with a normal display and GUI** first, because Super Productivity has no CLI option to enable plugins.

1. **On your local machine:**
   - Install the plugin: zip `mcp-bridge-plugin/` with `manifest.json` at the archive root (`npm run plugin:zip` does this)
   - Install via **Settings → Plugins → Install from file**
   - Enable it under **Settings → Plugins → MCP Bridge**

2. **After enabling**, plugin files and settings live under the Super Productivity profile (e.g. `~/.config/superProductivity/` on Linux).

3. **Sync to the VPS:**
   - If you use **Super Productivity’s own sync** (WebDAV / Nextcloud / etc.), the same profile—including the plugin folder and enabled state—can propagate to another machine.
   - **Or**, copy the configuration tree to the server after enabling on the GUI machine (see [HEADLESS_VPS_SETUP.md](docs/HEADLESS_VPS_SETUP.md) Step 3).
   - A **VPS running Super Productivity on Xvfb** can then end up with the plugin **already present and enabled**.

## MCP URL

```
http://localhost:<PORT>/mcp
```

## Tools (overview)

Task tools include `list_tasks`, `create_task`, `update_task`, `duplicate_task`, `delete_task`, `complete_task`, `batch_update_tasks`, `reorder_tasks`, and scheduling-related fields where the app supports them. There are also project, tag, counter, UI, data, and productivity-helper tools. Inspect the running server with your MCP client’s tool list for the authoritative set.

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run MCP server (`node dist/index.js start`) |
| `npm run dev` | Watch mode server reload (`tsx watch … start`) |
| `npm run connect` | CLI: attach socket client (see [docs/MCP_SERVER.md](docs/MCP_SERVER.md)) |
| `npm run cli:projects` / `cli:tasks` / `cli:tags` | CLI: dump lists (server + plugin must be up) |
| `npm run cli -- --help` | List all CLI subcommands |
| `npm run docker:build` / `docker:run` | Build and run the container image |
| `npm run docker:restart` | `compose down` + `up -d --build` + logs (see [.env.example](.env.example) `MCP_DOCKER_COMPOSE_DIR`) |
| `npm run plugin:zip` | Zip runtime plugin files to `mcp-bridge-plugin.zip` (for install or sync) |

## Development

```bash
npm run dev
```

## Docker

The image sets `MCP_HOST=0.0.0.0` so the server accepts connections from outside the container (for example published ports).

```bash
npm run docker:build
npm run docker:run
```

Redeploy from a compose file (optional `MCP_DOCKER_COMPOSE_DIR` in `.env`): `npm run docker:restart`.

Optional: tag and push the image to a registry you control (`docker tag`, `docker push`, `docker login`).

Compose outside the clone (personal paths off the public repo): see [docs/MCP_SERVER.md](docs/MCP_SERVER.md) (section *Docker Compose (optional)*).

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## CLI

After `npm run build`, run `node dist/index.js start` or `npm start`. The [package.json](package.json) `bin` field also allows `npm link` from a clone so `super-productivity-mcp` is on your `PATH`.

## License

ISC — see [LICENSE](LICENSE). This project builds on ideas and code from the Super Productivity ecosystem; respect upstream licenses when redistributing.

## Attribution

- **Super Productivity** (the desktop/web app): [super-productivity.com](https://super-productivity.com/) · [super-productivity/super-productivity](https://github.com/super-productivity/super-productivity) (MIT). This MCP server is a separate, community-maintained project and is not the official Super Productivity product or team.
- **Prior art / inspiration:** community work around [rochadelon/super-productivity-mcp](https://github.com/rochadelon/super-productivity-mcp).
