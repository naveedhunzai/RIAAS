import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Requirements from "./pages/Requirements";
import Actions from "./pages/Actions";
import Ingestion from "./pages/Ingestion";
import Ask from "./pages/Ask";

const sidebarLinkStyle = {
  textDecoration: "none",
  color: "#374151",
  padding: "10px 12px",
  borderRadius: 10,
  display: "block"
};

function App() {
  return (
    <Router>
      <div
        style={{
          display: "flex",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          fontFamily: "Inter, sans-serif",
          background: "#f9fafb"
        }}
      >
        <aside
          style={{
            width: 240,
            minWidth: 240,
            height: "100vh",
            borderRight: "1px solid #e5e7eb",
            padding: 16,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "#ffffff",
            overflowY: "auto"
          }}
        >
          <h3 style={{ margin: "4px 0 12px 0" }}>RIAAS</h3>

          <Link to="/" style={sidebarLinkStyle}>Dashboard</Link>
          <Link to="/ingestion" style={sidebarLinkStyle}>Ingestion</Link>
          <Link to="/requirements" style={sidebarLinkStyle}>Requirements</Link>
          <Link to="/actions" style={sidebarLinkStyle}>Actions</Link>
          <Link to="/ask" style={sidebarLinkStyle}>Ask</Link>
          <Link to="/settings" style={sidebarLinkStyle}>Settings</Link>
        </aside>

        <main
          style={{
            flex: 1,
            minWidth: 0,
            height: "100vh",
            padding: 24,
            boxSizing: "border-box",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              overflowY: "auto",
              overflowX: "hidden"
            }}
          >
            <div
  style={{
    width: "100%",
    maxWidth: 1680,
    margin: "0 auto",
    minHeight: "100%"
  }}
>
<Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ingestion" element={<Ingestion />} />
              <Route path="/requirements" element={<Requirements />} />
              <Route path="/actions" element={<Actions />} />
              <Route path="/ask" element={<Ask />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
</div>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;

