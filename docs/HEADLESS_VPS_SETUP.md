# Headless VPS Setup

Deploy Super Productivity + MCP Bridge on a headless Linux server using Xvfb and systemd.

## Architecture

```
MCP client (Cursor / Claude Code / etc.)
    ↓ HTTP POST /mcp
MCP Server (Node.js, port 3996)
    ↔ Socket.IO
MCP Bridge Plugin (runs inside SP / Electron)
    ↔ SP data (tasks, projects, tags)
```

SP runs under Xvfb (virtual display) on the same host. The MCP server can run as a Docker container or a systemd service.

## Prerequisites

- Linux VPS with root/sudo access
- Node.js 18+
- Super Productivity v14+ (.deb or AppImage)
- Xvfb

## Step 1: Install dependencies

```bash
sudo apt-get update
sudo apt-get install -y xvfb libgtk-3-0 libnss3 libxss1 libasound2

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Super Productivity — .deb
wget https://github.com/super-productivity/super-productivity/releases/latest/download/super-productivity_amd64.deb
sudo dpkg -i super-productivity_amd64.deb
# fix missing deps if needed: sudo apt-get install -f

# Or AppImage
mkdir -p ~/bin
wget -O ~/bin/super-productivity.AppImage \
  "$(curl -s https://api.github.com/repos/super-productivity/super-productivity/releases/latest \
     | grep -o 'https://.*AppImage' | head -1)"
chmod +x ~/bin/super-productivity.AppImage
sudo ln -s ~/bin/super-productivity.AppImage /usr/local/bin/super-productivity
```

## Step 2: Enable the plugin on a GUI machine

There is no command-line option to enable plugins in SP. The plugin must be enabled on a machine with a real display; the resulting configuration is then copied to the VPS.

1. On your local machine, build the plugin ZIP:
   ```bash
   cd path/to/super-productivity-mcp
   npm ci && npm run plugin:zip
   ```
2. In SP: **Settings → Plugins → Install from file** → select `mcp-bridge-plugin.zip`
3. In SP: **Settings → Plugins → MCP Bridge → Enable**

The enabled state is stored in SP's IndexedDB, not in a plain config file.

## Step 3: Copy the configuration to the VPS

Copy the full SP profile from your local machine to the VPS. This carries the plugin's enabled state (IndexedDB), plugin files, and settings.

**Stop SP on the VPS before copying.** If SP is running when the files arrive, it may overwrite the new IndexedDB with an empty one on next restart.

```bash
# On VPS — stop SP
sudo systemctl stop super-productivity.service

# On local machine — archive and transfer in one pipe
cd ~/.config/superProductivity
tar czf - \
  IndexedDB \
  WebStorage \
  "Local Storage" \
  Preferences \
  plugins/mcp-bridge \
  2>/dev/null | ssh vps_user@vps_host \
  'cd ~/.config/superProductivity && tar xzf -'

# On VPS — confirm the files are there
ls ~/.config/superProductivity/IndexedDB/
ls ~/.config/superProductivity/plugins/mcp-bridge/
```

The `2>/dev/null` suppresses warnings for paths that may not exist locally.

## Step 4: Deploy the MCP server

### Docker (recommended)

Create a `docker-compose.yml` for the MCP server. You can keep this file outside the repo clone.

```yaml
services:
  super-productivity-mcp:
    build:
      context: /path/to/super-productivity-mcp
    container_name: super-productivity-mcp
    restart: unless-stopped
    ports:
      - "127.0.0.1:3996:3996"
    environment:
      - PORT=3996
      - MCP_HOST=0.0.0.0
```

```bash
docker compose up -d
```

`MCP_HOST=0.0.0.0` makes the server accept connections from the host (via the published port). The plugin still connects to `http://127.0.0.1:3996`.

To rebuild and redeploy: `npm run docker:restart` (requires `MCP_DOCKER_COMPOSE_DIR` in `.env` if the compose file is outside the repo).

### systemd

```bash
cd /path/to/super-productivity-mcp
npm ci && npm run build
```

`/etc/systemd/system/sp-mcp-server.service`:

```ini
[Unit]
Description=Super Productivity MCP Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/super-productivity-mcp
Environment="PORT=3996"
Environment="MCP_HOST=127.0.0.1"
ExecStart=/usr/bin/node dist/index.js start
Restart=always
User=your_user

[Install]
WantedBy=multi-user.target
```

## Step 5: Create systemd units for Xvfb and Super Productivity

### `/etc/systemd/system/xvfb.service`

```ini
[Unit]
Description=X Virtual Framebuffer
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/Xvfb :99 -screen 0 1920x1080x24 -ac
Restart=always
User=your_user

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/super-productivity.service`

```ini
[Unit]
Description=Super Productivity
After=xvfb.service
Requires=xvfb.service

[Service]
Type=simple
Environment="DISPLAY=:99"
ExecStart=/usr/local/bin/super-productivity \
  --remote-debugging-port=9222 \
  --no-sandbox \
  --disable-software-rasterizer \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows
Restart=always
User=your_user

[Install]
WantedBy=multi-user.target
```

`--remote-debugging-port=9222` enables the Chrome DevTools Protocol for headless debugging (see [below](#inspect-the-plugin-via-cdp)).

### Enable and start

Start in order: Xvfb first, then the MCP server, then SP.

```bash
sudo systemctl daemon-reload
sudo systemctl enable xvfb.service super-productivity.service

sudo systemctl start xvfb.service
sleep 2
sudo systemctl start super-productivity.service
```

## Step 6: Verify

```bash
# Service state
systemctl is-active xvfb.service super-productivity.service

# MCP server port
ss -tlnp | grep 3996

# SP log — plugin should connect within ~10 s of startup
tail -f ~/.config/superProductivity/logs/main.log
```

Expected in SP logs once the plugin loads:

```
[info] Initializing plugin node executor
[info] { enabled: true, showDevTools: false, mode: 'bottom' }
[MCP Bridge ...] Connected to MCP Server socketId=... transport=websocket
```

Expected in MCP server logs:

```
Super Productivity plugin connected: <socketId>
```

If the log shows `enabled: null` instead of `enabled: true`, the IndexedDB was not copied correctly. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Inspect the plugin via CDP

With `--remote-debugging-port=9222`, you can inspect the SP renderer remotely:

```bash
# List available debug targets
curl -s http://localhost:9222/json
```

Open the `webSocketDebuggerUrl` from the output in Chrome DevTools (`chrome://inspect` or the full WebSocket URL in DevTools → Connect). The plugin's `console.log` / `console.error` output appears in the Console tab.

This is the most direct way to see what the plugin is doing — connection state, errors, and event traffic — without needing a local display.

## Configure sync (WebDAV / Nextcloud)

Sync settings are stored in SP's IndexedDB. The recommended approach is to configure sync in SP's GUI on your local machine, then copy the full profile to the VPS (Step 3). The sync settings carry over with the IndexedDB.

To configure sync directly on the VPS (when SP is stopped), write the settings to the Preferences file. SP reads Preferences on first startup if the sync key is not yet in IndexedDB.

```bash
sudo systemctl stop super-productivity.service

python3 - <<'EOF'
import json, os
path = os.path.expanduser("~/.config/superProductivity/Preferences")
prefs = json.load(open(path)) if os.path.exists(path) else {}
prefs.setdefault("globalConfig", {})["sync"] = {
    "isEnabled": True,
    "syncProvider": "webDav",
    "syncInterval": 60000,
    "webDav": {
        "baseUrl": "https://your-nextcloud.example/remote.php/dav/files/username/",
        "userName": "username",
        "password": "app-password",
        "syncFolderPath": "super-productivity"
    }
}
json.dump(prefs, open(path, "w"), indent=2)
print("Preferences updated")
EOF

sudo systemctl start super-productivity.service
```

## Keep the plugin updated

After a `git pull` that changes plugin files:

```bash
# Copy updated runtime files into the SP profile
rsync -a \
  mcp-bridge-plugin/manifest.json \
  mcp-bridge-plugin/plugin.js \
  mcp-bridge-plugin/plugin-logic.js \
  mcp-bridge-plugin/socket.io.min.js \
  ~/.config/superProductivity/plugins/mcp-bridge/

# Then restart SP on the VPS
sudo systemctl restart super-productivity.service
```

After restarting the MCP server for any reason, also restart SP — the plugin does not reconnect automatically if the server was down when it started.

## References

- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — common issues and solutions
- [SYSTEMD.md](SYSTEMD.md) — unit file templates
- [MCP_SERVER.md](MCP_SERVER.md) — MCP server configuration
- [INSTALL.md](INSTALL.md) — plugin installation on a local machine
