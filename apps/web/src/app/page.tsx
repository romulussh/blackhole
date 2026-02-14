import Link from "next/link";
import { Header } from "@/components/Header";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Expose local services to the internet
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Expose localhost to the internet. Self-host the service, run the CLI, and tunnel with one
            command. No vendor lock-in.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/docs"
              className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90"
            >
              Get Started
            </Link>
            <Link
              href="/features"
              className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium hover:border-white/40"
            >
              Learn More
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 font-mono text-sm">
            <p className="text-white/60"># Install the CLI</p>
            <p className="mt-2">npx bhole http 3000</p>
            <p className="mt-4 text-white/60"># Point to your tunnel server with --server</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-center text-3xl font-bold">Why Blackhole?</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-white/10 p-6">
              <h3 className="font-semibold">One command</h3>
              <p className="mt-2 text-sm text-white/70">
                Run <code className="rounded bg-white/10 px-1">bhole http 3000</code> and your local app is live. No config needed.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 p-6">
              <h3 className="font-semibold">Self-hosted</h3>
              <p className="mt-2 text-sm text-white/70">
                Run the service on your own infrastructure. No account required, no cloud dependency.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 p-6">
              <h3 className="font-semibold">ngrok alternative</h3>
              <p className="mt-2 text-sm text-white/70">
                Same tunneling model. Expose localhost for development, demos, or webhooks.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-white/50">
          <p>Blackhole - Open source tunneling. MIT License.</p>
        </div>
      </footer>
    </div>
  );
}
