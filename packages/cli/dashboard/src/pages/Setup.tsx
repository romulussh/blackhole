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
      title: "Add certs",
      cmd: `fly certs add ${d} -a my-tunnel\nfly certs add *.${d} -a my-tunnel`,
      id: "c3",
      hint: "Replace DOMAIN with your domain (e.g. me.bhole.sh)",
    },
    {
      n: 4,
      title: "DNS (Vercel / your provider)",
      hint: (
        <>
          Add CNAME records. Name: <code>me</code> and <code>*.me</code> → Value:{" "}
          <code>my-tunnel.fly.dev</code>
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
