import { useState, useEffect } from "react";

export default function Setup() {
  const [domain, setDomain] = useState("me.bhole.sh");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { domain?: string }) => setDomain(c.domain || "me.bhole.sh"))
      .catch(() => {});
  }, []);

  const copy = (id: string) => {
    const el = document.getElementById(id);
    if (el) navigator.clipboard.writeText(el.textContent?.trim() || "");
  };

  const d = domain || "me.bhole.sh";
  const dnsLabel = d.split(".")[0] || "me";

  const steps = [
    {
      n: 1,
      title: "Log in to Fly",
      cmd: "fly auth login",
      id: "c1",
    },
    {
      n: 2,
      title: "Deploy",
      cmd: "fly launch --image ghcr.io/romulussh/blackhole-service:latest --name my-tunnel --region ord --now",
      id: "c2",
    },
    {
      n: 3,
      title: "Add both certs in Fly",
      cmd: `fly certs add ${d} -a my-tunnel\nfly certs add *.${d} -a my-tunnel`,
      id: "c3",
      hint: (
        <>
          You need <strong>two certificates</strong> per domain: the domain and its wildcard. Replace the domain with yours (e.g. me.bhole.sh). Run both commands.
        </>
      ),
    },
    {
      n: 4,
      title: "DNS: add both CNAMEs at your provider",
      hint: (
        <>
          You need <strong>two CNAME records</strong> per domain. In your DNS host (Vercel, Cloudflare, etc.): add <code>{dnsLabel}</code> → <code>my-tunnel.fly.dev</code> and <code>*.{dnsLabel}</code> → <code>my-tunnel.fly.dev</code>. Both are required.
        </>
      ),
    },
    {
      n: 5,
      title: "Install CLI",
      cmd: "npm install -g bhole@alpha",
      id: "c6",
    },
    {
      n: 6,
      title: "Tunnel",
      cmd: "bhole http 3000",
      id: "c8",
      hint: <>Use <code>--domain &lt;subdomain&gt;</code> for a stable URL (add subdomains above)</>,
    },
  ];

  return (
    <>
      <h2>Setup & Installation</h2>
      <p className="hint" style={{ marginBottom: "1rem" }}>Run these steps in order to deploy your tunnel.</p>
      {steps.map((s) => (
        <div key={s.n} className="step">
          <span className="step-num">{s.n}</span>
          <span className="step-title">{s.title}</span>
          {s.cmd && (
            <>
              <div className="cmd" id={s.id}>
                {s.cmd}
              </div>
              <button className="btn-copy" onClick={() => copy(s.id!)}>
                Copy
              </button>
            </>
          )}
          {s.hint && <p className="hint">{s.hint}</p>}
        </div>
      ))}
    </>
  );
}
