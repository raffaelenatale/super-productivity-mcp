# systemd deployment

Example layout: **Xvfb** (virtual display) → **MCP server** (Node) → **Super Productivity** (Electron).

Replace `YOUR_USER`, paths to `node`, and paths to the app binary with your system values.

## Order

```bash
sudo systemctl start xvfb.service
sudo systemctl start sp-mcp-server.service
sleep 2
sudo systemctl start super-productivity.service
```

After restarting **only** the MCP server, restart Super Productivity so the plugin reconnects:

```bash
sudo systemctl restart sp-mcp-server.service
sleep 2
sudo systemctl restart super-productivity.service
```

Set `PORT` and optionally `MCP_HOST` in the MCP server unit (default bind is loopback; use `MCP_HOST=0.0.0.0` only if something on another interface must connect). See [MCP_SERVER.md](MCP_SERVER.md).

## Example units

Templates are in [examples/](examples/):

- [examples/xvfb.service](examples/xvfb.service)
- [examples/sp-mcp-server.service](examples/sp-mcp-server.service)
- [examples/super-productivity.service](examples/super-productivity.service)

Copy to `/etc/systemd/system/`, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable xvfb.service sp-mcp-server.service super-productivity.service
```

## Logs

```bash
systemctl is-active xvfb.service sp-mcp-server.service super-productivity.service
journalctl -u sp-mcp-server.service -n 50 --no-pager
```

## Electron flags (headless)

Common flags to reduce GPU/sandbox issues without a real display:

- `--no-sandbox`
- `--disable-software-rasterizer`

Adjust `ExecStart` in your unit to match your packaged binary (AppImage, `.deb`, etc.).
