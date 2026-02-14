# Blackhole

ngrok alternative. Expose local services to the internet.

**Self-hosted** — Run the service yourself. See the [docs](/docs) page.

## Quick Start

### 1. Get the service

Download a pre-built binary from [GitHub Releases](https://github.com/blackhole/blackhole/releases) or deploy the Docker image to Fly.io. See [docs](/docs) for full setup.

### 2. Set your tunnel domain

```bash
npx bhole config set-tunnel-domain tunnel.yourdomain.com
```

### 3. Expose a local port

```bash
npx bhole http 3000 --server wss://tunnel.yourdomain.com
```

### 4. Use your tunnel

The CLI shows a URL like `https://happy-blue-frog.tunnel.yourdomain.com`. Traffic to that URL is forwarded to your local app.

## Monorepo Structure

```
blackhole/
├── apps/
│   ├── web/        # Next.js site + docs at /docs
│   └── service/    # Go tunnel service (proxy, WebSocket, API)
├── packages/
│   ├── cli/        # Node.js CLI (bhole)
│   └── config-*    # Shared configs
```

## Development

```bash
pnpm install
pnpm build          # Build all (service requires Go)
pnpm dev            # Run all in dev mode (or use --filter)
```

- **Web**: `pnpm web` or `pnpm dev --filter=@blackhole/web` — site + docs at /docs
- **Service**: `cd apps/service; go run ./cmd/server` (port 8080) — requires Go 1.22+
- **CLI**: `pnpm build:cli` (or `pnpm build --filter=bhole`) then `bhole http 3000 --server ws://localhost:8080`

## License

MIT
