import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-white/10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold">
          Blackhole
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/features" className="text-sm text-white/80 hover:text-white">
            Features
          </Link>
          <Link href="/docs" className="text-sm text-white/80 hover:text-white">
            Docs
          </Link>
          <a
            href="https://github.com/blackhole/blackhole"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/80 hover:text-white"
          >
            GitHub
          </a>
        </div>
      </nav>
    </header>
  );
}
