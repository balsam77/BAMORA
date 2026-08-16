# BAMORA — Architecture & Spec

Premium unified marketplace. Customers see one luxury store; merchants operate invisibly behind it.

## Brand

| Token | Value | Usage |
|-------|-------|-------|
| Black | `#000000` | Splash, headers, text |
| White | `#FFFFFF` | Page backgrounds |
| Gold | `#C9A962` | **Logo**, accents, CTAs |
| Gold Light | `#E8D5A3` | Borders, hints |
| Gold Dark | `#A68B4B` | Links, secondary gold |

**Logo:** always gold. Splash = gold logo on black.

## Geography

| Zone | Code | Status |
|------|------|--------|
| West Bank (full) | `PS-WB` | Active |
| Jerusalem | `PS-JM` | Active |
| Israel | `IL` | Active |
| Gaza Strip | `PS-GZ` | **Excluded** |

## Core Rules

1. Customers never see merchant names.
2. Merchants only see their own products, inventory, and orders.
3. One customer order can split into multiple internal merchant sub-orders.
4. UI colors: white, black, gold only.

## Monorepo Structure

```
bamora/
├── apps/
│   ├── customer/   # Public storefront (port 3000)
│   ├── merchant/   # Merchant portal (port 3001)
│   └── admin/      # Admin panel (port 3002)
├── packages/
│   └── ui/         # Design tokens, shared constants
└── docs/
    └── ARCHITECTURE.md
```

## Customer Opening Flow

1. **Splash** — black screen, gold logo, tap anywhere
2. **Intro** — 2–3s logo animation
3. **Daily message** — inspirational quote (AR + EN), gold seasonal overlay
4. **Home** — "How can we help you today?" + 6 intent cards

## Homepage Cards

- Find a gift
- Complete my outfit
- Refresh my home
- Baby essentials
- I have an occasion
- Just exploring

## Development Roadmap

| Phase | Focus |
|-------|-------|
| 0 | Design system, monorepo, opening experience ✅ |
| 1 | Backend API, catalog, order split |
| 2 | Customer browse, cart, checkout |
| 3 | Merchant portal |
| 4 | Admin panel |
| 5 | IL + Palestine polish, i18n |
| 6 | Finance, payouts, returns |

## Run Locally

```bash
pnpm install
pnpm dev:customer   # http://localhost:3000
pnpm dev:merchant   # http://localhost:3001
pnpm dev:admin      # http://localhost:3002
```
