# Troubleshooting

## Plugin shows `enabled: null`

### Symptom

SP logs on startup:

```
[info] Initializing plugin node executor
[info] { enabled: null, showDevTools: false, mode: 'bottom' }
```

No `Super Productivity plugin connected:` in the MCP server log.

### Root cause

The plugin's enabled state lives in SP's **IndexedDB** (a LevelDB-backed store inside `~/.config/superProductivity/IndexedDB/`). On a fresh VPS or after an empty IndexedDB is created, the plugin metadata is missing so the plugin does not load.

### Solution

Copy the full SP profile from a machine where the plugin **is** enabled, while SP is stopped on the VPS.

```bash
# 1. Stop SP on VPS
sudo systemctl stop super-productivity.service

# 2. On local machine — archive and transfer
cd ~/.config/superProductivity
tar czf - \
  IndexedDB \
  WebStorage \
  "Local Storage" \
  Preferences \
  plugins/mcp-bridge \
  2>/dev/null | ssh vps_user@vps_host \
  'cd ~/.config/superProductivity && tar xzf -'

# 3. Start SP on VPS
sudo systemctl start super-productivity.service
sleep 15
grep "enabled" ~/.config/superProductivity/logs/main.log | tail -5
```

If the transfer worked, the log will show `{ enabled: true, ... }`.

### If the copy was done while SP was running

SP may recreate an empty IndexedDB over the copied one on restart. Repeat Step 1–3 above, making sure SP is fully stopped before the files arrive.

---

## Verify plugin state via CDP

If `--remote-debugging-port=9222` is set in the SP service (see [HEADLESS_VPS_SETUP.md](HEADLESS_VPS_SETUP.md)), you can inspect the plugin's JavaScript environment directly:

```bash
# List debug targets
curl -s http://localhost:9222/json
```

Open the `webSocketDebuggerUrl` for the SP renderer in Chrome DevTools (`chrome://inspect`). The plugin's connect/disconnect/error logs appear in the Console tab.

To read `localStorage` from the DevTools console:

```js
JSON.parse(localStorage.getItem("pluginMetadata") || "[]")
```

To read the current sync config at runtime:

```js
// In the DevTools console
JSON.parse(localStorage.getItem("SP_GLOBAL_CFG") || "{}").sync
```

---

## Socket.IO connection timeout

### Symptom

MCP server or SP plugin console shows repeated connection errors or timeouts.

### Checks

**Is the MCP server listening?**

```bash
ss -tlnp | grep 3996
```

If nothing is returned, the server is not running on that port. Check:

```bash
# For Docker
docker ps | grep super-productivity-mcp
docker logs super-productivity-mcp --tail 30

# For systemd
systemctl is-active sp-mcp-server.service
journalctl -u sp-mcp-server.service -n 50 --no-pager
```

**Does the plugin URL match the server?**

```bash
grep "io(" ~/.config/superProductivity/plugins/mcp-bridge/plugin-logic.js
# Should be: http://127.0.0.1:3996
```

If the port differs, update the plugin file and restart SP.

**IPv4 vs IPv6 — use `127.0.0.1`, not `localhost`**

`localhost` may resolve to `::1` (IPv6) while the server is bound to `127.0.0.1` (IPv4). The plugin already uses `127.0.0.1`; do not change it to `localhost`.

---

## Super Productivity won't start on Xvfb

### Symptom

```bash
systemctl status super-productivity.service
# Active: failed  OR  immediately exits
```

Logs show GPU or sandbox errors.

### Checks

**Xvfb running?**

```bash
ps aux | grep "Xvfb :99"
```

If not, `sudo systemctl restart xvfb.service` and wait 2 s before starting SP.

**Electron flags set?**

```bash
grep ExecStart /etc/systemd/system/super-productivity.service
```

The unit should include at minimum `--no-sandbox --disable-software-rasterizer`. On some VPS kernels, also add `--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows`.

---

## MCP server crashes or restarts in a loop

### Symptom

```bash
systemctl status sp-mcp-server.service
# restarting every few seconds
```

### Diagnosis

Temporarily disable auto-restart to see the actual error:

```bash
sudo systemctl stop sp-mcp-server.service
sudo sed -i 's/^Restart=.*/Restart=no/' /etc/systemd/system/sp-mcp-server.service
sudo systemctl daemon-reload
sudo systemctl start sp-mcp-server.service
sleep 5
journalctl -u sp-mcp-server.service -n 50 --no-pager
```

After fixing, restore `Restart=always` and `daemon-reload`.

---

## Plugin metadata not syncing between machines

### Symptom

Copied `Preferences` and `plugins/mcp-bridge/` but plugin still shows `enabled: null`.

### Root cause

Preferences alone is not enough — SP reads the enabled state from IndexedDB. The `Preferences` file is only consulted on the very first run, before IndexedDB is populated.

### Solution

Include the `IndexedDB` directory in the transfer (see the full `tar` command at the top of this file).

---

## Getting help

Collect these before opening an issue:

```bash
# MCP server logs
docker logs super-productivity-mcp --tail 100 > /tmp/mcp-logs.txt
# or: journalctl -u sp-mcp-server.service -n 100 --no-pager > /tmp/mcp-logs.txt

# SP logs
tail -200 ~/.config/superProductivity/logs/main.log > /tmp/sp-logs.txt

# Service state and port
systemctl is-active xvfb.service super-productivity.service > /tmp/status.txt
ss -tlnp | grep -E "3996|9222" >> /tmp/status.txt
```
