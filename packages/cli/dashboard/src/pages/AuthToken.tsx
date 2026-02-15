import { useState, useEffect } from "react";

export default function AuthToken() {
  const [authToken, setAuthToken] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { authToken?: string }) => setAuthToken(c.authToken || ""))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken: authToken || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ type: "success", text: "Saved." });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed" });
    }
  };

  return (
    <>
      <h2>Your Auth Token</h2>
      <p className="hint" style={{ marginBottom: "1rem" }}>
        If your tunnel server requires authentication, set the shared secret here. The CLI reads from config.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="auth">Auth Token (optional)</label>
        <input
          id="auth"
          type="password"
          placeholder="Shared secret if server requires it"
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
        />
        <button type="submit">Save</button>
      </form>
      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
    </>
  );
}
