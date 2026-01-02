# apps/docs Implementation

> Fumadocs + TanStack Start + Cloudflare Workers

## Overview

The `apps/docs` application is built with Fumadocs documentation system + TanStack Start full-stack framework, deployed to Cloudflare Workers.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | TanStack Start (React full-stack) |
| Documentation | Fumadocs (MDX-driven) |
| Styling | Tailwind CSS 4 |
| Deployment | Cloudflare Workers |
| Theme | Shadcn preset (inherits @memokit/ui colors) |

## Project Design System

The project uses these design conventions (from `packages/ui`):

- **Component Library**: Shadcn UI (radix-lyra style)
- **Base Colors**: Neutral (black/white/gray)
- **Color Space**: OKLCH
- **Border Radius**: `--radius: 0` (sharp corners)
- **Font**: JetBrains Mono (monospace)
- **Style**: Minimalist, technical

## Directory Structure

```
apps/docs/
├── src/
│   ├── routes/
│   │   ├── __root.tsx             # Root layout with RootProvider
│   │   ├── index.tsx              # Redirect to /docs
│   │   ├── docs/
│   │   │   └── $.tsx              # Documentation dynamic route
│   │   └── api/
│   │       └── search.ts          # Search API
│   ├── lib/
│   │   ├── source.ts              # Fumadocs source loader
│   │   └── layout.shared.tsx      # Shared layout config
│   ├── styles/
│   │   └── app.css                # Tailwind + Fumadocs styles
│   └── router.tsx                 # TanStack Router config
├── content/
│   └── docs/                      # MDX documentation content
│       ├── index.mdx
│       └── meta.json
├── .source/                       # (auto-generated) Fumadocs MDX output
├── source.config.ts               # Fumadocs MDX config
├── vite.config.ts                 # Vite config
├── wrangler.jsonc                 # Cloudflare Workers config
├── tsconfig.json
└── package.json
```

## Commands

```bash
# Development
pnpm --filter @memokit/docs dev

# Build
pnpm --filter @memokit/docs build

# Deploy to Cloudflare
pnpm --filter @memokit/docs deploy
```

## References

- [Fumadocs TanStack Start Installation](https://www.fumadocs.dev/docs/manual-installation/tanstack-start)
- [Fumadocs MDX Vite Configuration](https://www.fumadocs.dev/docs/mdx/vite)
- [Fumadocs Theme Configuration](https://www.fumadocs.dev/docs/ui/theme)
- [Cloudflare TanStack Start Deployment](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
- [TanStack Start Hosting Docs](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)

## Cloudflare Deployment Notes

1. Login to Wrangler first: `npx wrangler login`
2. Deploy command: `pnpm --filter @memokit/docs deploy`
3. Will deploy to `*.workers.dev` subdomain, or configure custom domain

---

*Status: Implemented | Updated: 2026-01*
