import Link from "next/link";
import { Header } from "@/components/Header";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold">Features</h1>
        <p className="mt-4 text-white/70">
          Everything you need to expose local services to the internet.
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <h2 className="text-2xl font-semibold">HTTP tunneling</h2>
            <p className="mt-2 text-white/80">
              Expose any local HTTP server with a single command. Perfect for local development,
              staging previews, and webhook testing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">CLI first</h2>
            <p className="mt-2 text-white/80">
              Zero config. Set your tunnel domain with <code className="rounded bg-white/10 px-1">bhole config set-tunnel-domain</code>, then run <code className="rounded bg-white/10 px-1">bhole http 3000 --server wss://your-server</code>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Custom subdomains</h2>
            <p className="mt-2 text-white/80">
              Use <code className="rounded bg-white/10 px-1">--subdomain</code> to get a stable endpoint name. Route by Host header or
              X-Blackhole-Endpoint.
            </p>
          </section>
        </div>

        <div className="mt-16">
          <Link
            href="/docs"
            className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90"
          >
            Read the docs
          </Link>
        </div>
      </main>
    </div>
  );
}
