# Security

## Reporting a vulnerability

Please use [GitHub Security Advisories](https://github.com/raffaelenatale/super-productivity-mcp/security/advisories/new) for this repository if you can. That keeps details private until a fix is ready.

If you cannot use that flow, open a **private** issue only if the tracker supports it, or contact the maintainers through channels they publish on the repo homepage.

## Scope

This server bridges to **Super Productivity** over Socket.IO and exposes an **MCP over HTTP** surface. It is intended for trusted local use. Binding to all interfaces (`MCP_HOST=0.0.0.0`) without network controls increases risk; see [docs/MCP_SERVER.md](docs/MCP_SERVER.md).
