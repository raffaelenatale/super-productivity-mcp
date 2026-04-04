# Contributing

## Repository URLs

If you forked this project, update `repository`, `bugs`, and `homepage` in [package.json](package.json) and the links in [SECURITY.md](SECURITY.md) to match your GitHub user or org.

## Build

Requires Node.js 18+.

```bash
npm ci
npm run build
```

Run the server:

```bash
npm start
```

Develop with reload:

```bash
npm run dev
```

## First-time Git

Do not commit `.env`, `.env.local`, or `node_modules/`. See [.gitignore](.gitignore).

Suggested first commit after `git init`:

```bash
git add -A
git status   # confirm no secrets or node_modules
git commit -m "Initial import"
```

## Pull requests

- Keep changes focused on one concern when possible.
- Ensure `npm run build` succeeds.

## Releases (maintainers)

1. Bump `version` in [package.json](package.json) (semver).
2. Update [mcp-bridge-plugin/manifest.json](mcp-bridge-plugin/manifest.json) `version` when plugin files shipped to users change.
3. Run `npm ci && npm run build`.
4. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.
5. **Plugin ZIP:** `npm run plugin:zip` and attach `mcp-bridge-plugin.zip` to the GitHub Release if you distribute that way.
6. **Docker:** build and optionally push to your registry (see [README.md](README.md)); compose / `docker:restart`: [docs/MCP_SERVER.md](docs/MCP_SERVER.md).
7. **npm registry:** only if you maintain an npm account; not required for this project’s day-to-day use.
