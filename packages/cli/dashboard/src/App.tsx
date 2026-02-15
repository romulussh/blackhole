import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import AuthToken from "./pages/AuthToken";
import Domains from "./pages/Domains";
import Subdomains from "./pages/Subdomains";
import Traffic from "./pages/Traffic";
import Setup from "./pages/Setup";

const navSections: { label: string; items: { to: string; label: string }[] }[] = [
  {
    label: "Getting Started",
    items: [
      { to: "/setup", label: "Setup & Installation" },
      { to: "/auth-token", label: "Your Auth Token" },
    ],
  },
  {
    label: "Gateway",
    items: [
      { to: "/endpoints", label: "Endpoints" },
      { to: "/domains", label: "Domains" },
    ],
  },
  {
    label: "Traffic & Observability",
    items: [{ to: "/traffic", label: "Traffic Inspector" }],
  },
];

export default function App() {
  const { pathname } = useLocation();

  return (
    <div className="layout">
      <aside className="sidebar">
        <nav>
          {navSections.map((section) => (
            <div key={section.label} className="nav-section">
              <span className="nav-section-label">{section.label}</span>
              {section.items.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="right-half">
        <header className="header">
          <h1>Blackhole</h1>
        </header>
        <main className={`main ${pathname === "/traffic" ? "traffic-page" : ""}`}>
          <Routes>
            <Route path="/" element={<Setup />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/auth-token" element={<AuthToken />} />
            <Route path="/endpoints" element={<Subdomains />} />
            <Route path="/domains" element={<Domains />} />
            <Route path="/traffic" element={<Traffic />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
