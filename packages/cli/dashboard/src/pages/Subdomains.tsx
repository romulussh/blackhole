import { useState, useEffect } from "react";

export default function Subdomains() {
  const [endpoints, setEndpoints] = useState<string[]>([]);
  const [domain, setDomain] = useState("me.bhole.sh");
  const [sub, setSub] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { domain?: string; endpoints?: (string | { subdomain?: string })[] }) => {
        setDomain(c.domain || "me.bhole.sh");
        setEndpoints(
          (c.endpoints || []).map((e) =>
            typeof e === "string" ? e : (e?.subdomain ?? "")
          ).filter(Boolean)
        );
      })
      .catch(() => {});
  }, []);

  const saveEndpoints = async (eps: string[]) => {
    try {
      await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoints: eps }),
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const s = sub.trim();
    if (!s || s.length > 63) {
      alert("Subdomain must be 1-63 chars");
      return;
    }
    if (endpoints.includes(s)) {
      alert("Subdomain already exists");
      return;
    }
    const next = [...endpoints, s];
    setEndpoints(next);
    setSub("");
    saveEndpoints(next);
  };

  const remove = (i: number) => {
    const next = endpoints.filter((_, j) => j !== i);
    setEndpoints(next);
    saveEndpoints(next);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const d = domain || "me.bhole.sh";

  return (
    <>
      <h2>Endpoints</h2>
      <p className="hint" style={{ marginBottom: "1rem" }}>
        Add endpoints (subdomains) for stable URLs. Run{" "}
        <code>bhole http &lt;port&gt; --domain &lt;subdomain&gt;</code> in each
        terminal.
      </p>
      {endpoints.length === 0 ? (
        <p className="hint">No endpoints yet. Add one below.</p>
      ) : (
        endpoints.map((subdomain, i) => (
          <div key={i} className="endpoint-item">
            <span style={{ flex: "0 0 80px", fontSize: "0.8rem" }}>{subdomain}</span>
            <div className="cmd">{`bhole http 3000 --domain ${subdomain}`}</div>
            <button className="btn-copy" onClick={() => copy(`bhole http 3000 --domain ${subdomain}`)}>
              Copy
            </button>
            <a
              href={`https://${subdomain}.${d}`}
              target="_blank"
              rel="noopener"
              className="hint"
              style={{ fontSize: "0.8rem" }}
            >
              Open
            </a>
            <button className="btn-rm" onClick={() => remove(i)}>
              Remove
            </button>
          </div>
        ))
      )}
      <form
        onSubmit={add}
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "flex-end",
          marginTop: "0.75rem",
        }}
      >
        <div style={{ flex: 1, minWidth: "140px" }}>
          <label htmlFor="ep-sub">Subdomain</label>
          <input
            id="ep-sub"
            type="text"
            placeholder="myapp"
            value={sub}
            onChange={(e) => setSub(e.target.value)}
          />
        </div>
        <button type="submit">Add</button>
      </form>
    </>
  );
}
