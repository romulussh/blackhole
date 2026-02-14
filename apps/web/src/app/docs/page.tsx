import Link from "next/link";
import { Header } from "@/components/Header";

export const metadata = {
  title: "Self-Hosted Blackhole | Docs",
  description: "Run Blackhole on your own infrastructure. Setup guide for self-hosting.",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Self-Hosted Blackhole</h1>
        <p className="mt-4 text-lg text-white/70">
          Run Blackhole entirely on your own infrastructure. No third-party backend, no cloud dependency.
        </p>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Architecture</h2>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-6 font-mono text-sm">
            <pre className="whitespace-pre text-white/90">{`[Your server]                         [Your machine]
┌─────────────────────┐               ┌─────────────────┐
│  Blackhole service  │  ◄──WebSocket─►│  bhole CLI      │
│  (Go binary)        │               │  --server ...   │
│  Port 8080          │               │                 │
└─────────────────────┘               └─────────────────┘
         │
         │  Public traffic
         ▼
   https://{endpoint}.{your-domain}`}</pre>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">1. Get the service</h2>

          <h3 className="mt-6 font-medium text-white/90">Option A: Download pre-built binary</h3>
          <p className="mt-2 text-white/70">
            Download from <a href="https://github.com/blackhole/blackhole/releases" target="_blank" rel="noopener noreferrer" className="text-white underline hover:no-underline">GitHub Releases</a>. Pick the archive for your platform:
          </p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left font-medium">Platform</th>
                  <th className="px-4 py-3 text-left font-medium">Download</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                <tr className="border-b border-white/10"><td className="px-4 py-3">Linux (amd64)</td><td className="px-4 py-3 font-mono">blackhole-service-linux-amd64.tar.gz</td></tr>
                <tr className="border-b border-white/10"><td className="px-4 py-3">Linux (arm64)</td><td className="px-4 py-3 font-mono">blackhole-service-linux-arm64.tar.gz</td></tr>
                <tr className="border-b border-white/10"><td className="px-4 py-3">macOS (Intel)</td><td className="px-4 py-3 font-mono">blackhole-service-darwin-amd64.tar.gz</td></tr>
                <tr className="border-b border-white/10"><td className="px-4 py-3">macOS (Apple Silicon)</td><td className="px-4 py-3 font-mono">blackhole-service-darwin-arm64.tar.gz</td></tr>
                <tr><td className="px-4 py-3">Windows</td><td className="px-4 py-3 font-mono">blackhole-service-windows-amd64.zip</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-white/60">
            Extract the archive, then run the binary. Linux/macOS tarballs preserve execute permission — no extra steps.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">2. Deploy to Fly.io</h2>
          <p className="mt-2 text-white/70">
            No repo or clone required. Deploy the pre-built image from anywhere.
          </p>

          <h3 className="mt-6 font-medium text-white/90">Step 1: Install Fly CLI</h3>
          <p className="mt-2 text-white/70">Install from <a href="https://fly.io/docs/hands-on/install-flyctl/" target="_blank" rel="noopener noreferrer" className="text-white underline hover:no-underline">fly.io/docs</a> (Windows: <code className="rounded bg-white/10 px-1">iwr https://fly.io/install.ps1 | iex</code>). Then log in:</p>
          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-sm">
            <code className="text-white/90">fly auth login</code>
          </div>

          <h3 className="mt-6 font-medium text-white/90">Step 2: Launch from image</h3>
          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-sm space-y-2">
            <p className="text-white/60"># Uses pre-built image from GitHub — no clone needed</p>
            <code className="block text-white/90">{`fly launch --image ghcr.io/blackhole/blackhole-service:latest --name my-tunnel --region ord --now`}</code>
          </div>
          <p className="mt-2 text-sm text-white/60">
            Pick an app name and region when prompted. <code className="rounded bg-white/10 px-1">--now</code> deploys immediately.
          </p>

          <h3 className="mt-6 font-medium text-white/90">Step 3: Add your custom domain</h3>
          <p className="mt-2 text-white/70">In <a href="https://fly.io/dashboard" target="_blank" rel="noopener noreferrer" className="text-white underline hover:no-underline">Fly Dashboard</a> → your app → <strong>Settings → Domains</strong>, add:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-white/70">
            <li><code className="rounded bg-white/10 px-1">tunnel.yourdomain.com</code></li>
            <li><code className="rounded bg-white/10 px-1">*.tunnel.yourdomain.com</code></li>
          </ul>
          <p className="mt-2 text-sm text-white/60">
            Add the DNS records Fly shows (CNAME to <code className="rounded bg-white/10 px-1">yourapp.fly.dev</code>).
          </p>

          <h3 className="mt-6 font-medium text-white/90">Step 4: Set secrets in Fly</h3>
          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-sm space-y-2">
            <p className="text-white/60"># Your domain</p>
            <code className="block text-white/90">{`fly secrets set BHOLE_CONNECT_HOST=tunnel.yourdomain.com BHOLE_API_HOST=tunnel.yourdomain.com -a my-tunnel`}</code>
            <p className="text-white/60 mt-4"># Optional: shared secret (recommended)</p>
            <code className="block text-white/90">{`fly secrets set BHOLE_AUTH_TOKEN=your-secret-here -a my-tunnel`}</code>
          </div>
          <p className="mt-2 text-sm text-white/60">
            If you set <code className="rounded bg-white/10 px-1">BHOLE_AUTH_TOKEN</code>, the CLI must use the same value (<code className="rounded bg-white/10 px-1">BHOLE_AUTH_TOKEN</code> env or config).
          </p>

          <h3 className="mt-6 font-medium text-white/90">Step 5: Use the CLI</h3>
          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-sm space-y-2">
            <code className="block text-white/90">bhole config set-tunnel-domain tunnel.yourdomain.com</code>
            <code className="block text-white/90">{`bhole http 3000 --server wss://tunnel.yourdomain.com`}</code>
            <p className="text-white/60 mt-2"># If you set BHOLE_AUTH_TOKEN on the server:</p>
            <code className="block text-white/90">{`$env:BHOLE_AUTH_TOKEN="your-secret-here"; bhole http 3000 --server wss://tunnel.yourdomain.com`}</code>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">3. Use the CLI</h2>
          <p className="mt-2 text-white/70">Point the CLI at your server:</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-sm space-y-2">
            <p className="text-white/60"># Set your tunnel domain (where public URLs will live)</p>
            <code className="block text-white/90">bhole config set-tunnel-domain tunnel.yourdomain.com</code>
            <p className="text-white/60 mt-4"># Expose a local port (use --server to target your host)</p>
            <code className="block text-white/90">bhole http 3000 --server wss://tunnel.yourdomain.com</code>
          </div>
          <p className="mt-2 text-sm text-white/60">
            Or set <code className="rounded bg-white/10 px-1">BHOLE_SERVER_URL</code> so you don&apos;t need --server every time.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">4. Send traffic</h2>
          <p className="mt-2 text-white/70">
            The CLI shows a URL like <code className="rounded bg-white/10 px-1">https://happy-blue-frog.tunnel.yourdomain.com</code>. Traffic to that URL
            is forwarded to your local app.
          </p>
          <p className="mt-2 text-white/70">Route by Host header or X-Blackhole-Endpoint:</p>
          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-sm">
            <p className="text-white/60"># PowerShell</p>
            <code className="block mt-2 text-white/90">
              {`Invoke-WebRequest -Uri https://tunnel.yourdomain.com/ -Headers @{"X-Blackhole-Endpoint"="happy-blue-frog"}`}
            </code>
            <p className="text-white/60 mt-4"># Bash / curl</p>
            <code className="block mt-2 text-white/90">{`curl -H "X-Blackhole-Endpoint: happy-blue-frog" https://tunnel.yourdomain.com/`}</code>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Local testing (no domain)</h2>
          <p className="mt-2 text-white/70">To test without a public domain:</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-sm space-y-2">
            <p className="text-white/60"># Terminal 1: run the service (from where you extracted the binary)</p>
            <code className="block text-white/90">./blackhole-service-linux-amd64</code>
            <p className="text-white/60 mt-4"># Terminal 2: run the CLI</p>
            <code className="block text-white/90">bhole config set-tunnel-domain localhost</code>
            <code className="block text-white/90">bhole http 3000 --server ws://localhost:8080</code>
          </div>
          <p className="mt-2 text-sm text-white/60">
            Use the endpoint name shown in the CLI (e.g. <code className="rounded bg-white/10 px-1">elm-beach-leaf</code>) in X-Blackhole-Endpoint.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Security (shared secret)</h2>
          <p className="mt-2 text-white/70">
            By default, anyone who can reach your tunnel server can create tunnels. To restrict access, set a shared secret:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-white/70">
            <li>
              <strong>On the server:</strong> <code className="rounded bg-white/10 px-1">BHOLE_AUTH_TOKEN</code> env (e.g. via Fly secrets)
            </li>
            <li>
              <strong>On the CLI:</strong> <code className="rounded bg-white/10 px-1">BHOLE_AUTH_TOKEN</code> env when running <code className="rounded bg-white/10 px-1">bhole http</code>
            </li>
          </ul>
          <p className="mt-2 text-sm text-white/60">If the server has the token set, the CLI must supply the matching value or the connection is rejected.</p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Requirements</h2>
          <ul className="mt-4 list-disc space-y-1 pl-6 text-white/70">
            <li>A domain you control (to add DNS records)</li>
            <li>A server with a public IP</li>
            <li>Port 8080 exposed (or behind reverse proxy)</li>
            <li>Wildcard DNS for *.tunnel.yourdomain.com</li>
          </ul>
        </section>

        <div className="mt-16">
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-6 py-2 text-sm font-medium hover:border-white/40"
          >
            ← Back to home
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/10 py-8 mt-16">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-white/50">
          <p>Blackhole - Open source tunneling. MIT License.</p>
        </div>
      </footer>
    </div>
  );
}
