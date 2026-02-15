import { useState, useEffect, useCallback } from "react";

interface CertInfo {
  hostname: string;
  issuer?: string;
  dns_configured?: boolean;
}

interface CertResponse {
  fly_app: string;
  certs: CertInfo[];
  error?: string;
}

export default function Domains() {
  const [domains, setDomains] = useState<string[]>([]);
  const [flyApp, setFlyApp] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [certData, setCertData] = useState<CertResponse | null>(null);
  const [certLoading, setCertLoading] = useState(false);

  const load = useCallback(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { domains?: string[]; domain?: string; fly_app?: string }) => {
        const list =
          Array.isArray(c.domains) && c.domains.length > 0
            ? c.domains
            : c.domain
              ? [c.domain]
              : [];
        setDomains(list);
        setFlyApp(c.fly_app ?? "");
      })
      .catch(() => {});
  }, []);

  const loadCerts = useCallback(() => {
    if (!flyApp.trim()) {
      setCertData(null);
      return;
    }
    setCertLoading(true);
    setCertData(null);
    fetch("/api/fly/certificates")
      .then((r) => r.json())
      .then((d: CertResponse) => {
        setCertData(d);
      })
      .catch(() => setCertData({ fly_app: flyApp, certs: [], error: "Request failed" }))
      .finally(() => setCertLoading(false));
  }, [flyApp]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCerts();
    const t = setInterval(loadCerts, 30000);
    return () => clearInterval(t);
  }, [loadCerts]);

  const certByHost = (host: string): CertInfo | undefined =>
    certData?.certs?.find(
      (c) => c.hostname.toLowerCase() === host.toLowerCase()
    );

  const saveDomains = async (next: string[]) => {
    setMsg(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDomains(next);
      setMsg({ type: "success", text: "Saved." });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed" });
    }
  };

  const saveFlyApp = async () => {
    setMsg(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fly_app: flyApp.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ type: "success", text: "Fly app saved." });
      loadCerts();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed" });
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const d = newDomain.trim().toLowerCase();
    if (!d) return;
    if (domains.includes(d)) {
      setMsg({ type: "error", text: "Domain already in list." });
      return;
    }
    setNewDomain("");
    saveDomains([...domains, d]);
  };

  const remove = (d: string) => {
    saveDomains(domains.filter((x) => x !== d));
  };

  const setPrimary = (d: string) => {
    if (domains[0] === d) return;
    saveDomains([d, ...domains.filter((x) => x !== d)]);
  };

  const flyTarget = flyApp.trim() ? `${flyApp.trim()}.fly.dev` : null;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <h2>Domains</h2>
      <p className="hint" style={{ marginBottom: "1rem" }}>
        For each domain you use, you must do <strong>two things</strong>: (1) add <strong>two certificates</strong> in Fly — the domain and its wildcard (<code>me.bhole.sh</code> and <code>*.me.bhole.sh</code>). (2) add <strong>two CNAME records</strong> at your DNS provider — one for the base hostname and one for the wildcard. Both are required for the tunnel to work.
      </p>

      <div style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="fly-app">Fly app name</label>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            id="fly-app"
            type="text"
            placeholder="my-tunnel"
            value={flyApp}
            onChange={(e) => setFlyApp(e.target.value)}
            style={{ width: "14rem", marginBottom: 0 }}
          />
          <button type="button" onClick={saveFlyApp}>
            Save
          </button>
        </div>
        <p className="hint" style={{ marginTop: "0.25rem" }}>
          Your Fly app name (e.g. my-tunnel). Used to show cert status and DNS target <code>*.fly.dev</code>. Requires <code>fly</code> CLI installed and logged in.
        </p>
      </div>

      {domains.length === 0 ? (
        <p className="hint">No domains yet. Add one below.</p>
      ) : (
        <ul className="domain-list" style={{ listStyle: "none", padding: 0, margin: "0 0 1rem" }}>
          {domains.map((d, i) => {
            const cert = certByHost(d);
            const status =
              cert != null
                ? cert.dns_configured !== false
                  ? "ready"
                  : "pending_dns"
                : "no_cert";
            return (
              <li
                key={d}
                className="endpoint-item"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 0",
                  borderBottom: "1px solid #262626",
                }}
              >
                <span style={{ flex: "1 1 180px", fontFamily: "ui-monospace, monospace", fontSize: "0.9rem" }}>
                  {d}
                  {i === 0 && (
                    <span className="hint" style={{ marginLeft: "0.5rem" }}>(primary)</span>
                  )}
                </span>
                <span
                  className="hint"
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    borderRadius: 4,
                    background: status === "ready" ? "#14532d" : status === "pending_dns" ? "#713f12" : "#262626",
                    color: status === "ready" ? "#86efac" : status === "pending_dns" ? "#fde047" : "#a3a3a3",
                  }}
                >
                  {status === "ready" && "Certificate ready"}
                  {status === "pending_dns" && "DNS pending"}
                  {status === "no_cert" && (certData?.error ? "—" : "Add cert in Fly")}
                </span>
                {i !== 0 && (
                  <button type="button" className="btn-copy" style={{ fontSize: "0.75rem" }} onClick={() => setPrimary(d)}>
                    Set primary
                  </button>
                )}
                <button type="button" className="btn-rm" onClick={() => remove(d)}>
                  Remove
                </button>
                {flyTarget && (
                  <div style={{ flex: "1 1 100%", marginTop: "0.5rem", fontSize: "0.75rem", color: "#737373" }}>
                    <strong>DNS:</strong> CNAME <code>{d}</code> → <code>{flyTarget}</code>
                    {"; "}
                    CNAME <code>*.{d}</code> → <code>{flyTarget}</code>
                    {status === "no_cert" && (
                      <> — Run: <code>fly certs add {d} -a {flyApp.trim()}</code></>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {certLoading && <p className="hint">Checking Fly certificates…</p>}
      {certData?.error && !certLoading && (
        <p className="hint" style={{ color: "#f87171" }}>{certData.error}</p>
      )}

      {domains.length > 0 && (
        <section style={{ marginTop: "2rem", padding: "1rem", background: "#171717", border: "1px solid #262626", borderRadius: 8 }}>
          <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.75rem", color: "#a3a3a3" }}>1. DNS at your domain provider</h3>
          <p className="hint" style={{ marginBottom: "0.75rem" }}>
            You need <strong>two CNAME records per domain</strong>. Add both at your DNS host; target value is your Fly app below.
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem", color: "#e5e5e5" }}>
            {domains.map((d) => {
              const label = d.split(".")[0];
              return (
                <li key={d} style={{ marginBottom: "0.75rem" }}>
                  <strong>{d}</strong>
                  <ul style={{ margin: "0.25rem 0 0 1rem", paddingLeft: "1rem" }}>
                    <li>CNAME name <code>{label}</code> → value <code>{flyTarget ?? "<app>.fly.dev"}</code></li>
                    <li>CNAME name <code>*.{label}</code> → value <code>{flyTarget ?? "<app>.fly.dev"}</code></li>
                  </ul>
                </li>
              );
            })}
          </ul>

          <h3 style={{ fontSize: "0.95rem", margin: "1.25rem 0 0.75rem", color: "#a3a3a3" }}>2. Fly: add both certificates per domain</h3>
          <p className="hint" style={{ marginBottom: "0.5rem" }}>
            You need <strong>two certs per domain</strong> in Fly: the domain and its wildcard. Run both commands for each domain.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {domains.map((d) => (
              <div key={d} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <div className="cmd" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <code style={{ flex: 1 }}>fly certs add {d} -a {flyApp.trim() || "<app>"}</code>
                  <button type="button" className="btn-copy" onClick={() => copy(`fly certs add ${d} -a ${flyApp.trim()}`)}>Copy</button>
                </div>
                <div className="cmd" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <code style={{ flex: 1 }}>fly certs add *.{d} -a {flyApp.trim() || "<app>"}</code>
                  <button type="button" className="btn-copy" onClick={() => copy(`fly certs add *.${d} -a ${flyApp.trim()}`)}>Copy</button>
                </div>
              </div>
            ))}
          </div>

        </section>
      )}

      <form
        onSubmit={add}
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: 1, minWidth: "180px" }}>
          <label htmlFor="new-domain">Add domain</label>
          <input
            id="new-domain"
            type="text"
            placeholder="me.bhole.sh"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
        </div>
        <button type="submit">Add</button>
      </form>
      {msg && (
        <div className={`msg ${msg.type}`} style={{ marginTop: "1rem" }}>
          {msg.text}
        </div>
      )}
    </>
  );
}
