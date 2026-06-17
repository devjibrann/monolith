## Frontend (AI Workspace)

## Getting Started

Run development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) when using Docker Compose.

## Quality checks

```bash
npm run lint
npm run build
```

## Impeccable design checks

This frontend includes design context for agent-driven UI tuning:

- `PRODUCT.md` (product and UX intent)
- `DESIGN.md` (visual and component standards)

Run detector:

```bash
npm run design:detect
```

Run strict detector + lint:

```bash
npm run design:detect:strict
```

In Docker:

```bash
docker compose exec frontend npm run design:detect
```

## Notes

- API URL comes from `NEXT_PUBLIC_API_URL`.
- Docker maps this app to host port `3001`.
