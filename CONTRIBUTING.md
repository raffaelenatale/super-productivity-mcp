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
