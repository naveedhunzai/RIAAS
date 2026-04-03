import { useEffect, useState } from "react";

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
};

const labelStyle = {
  display: "grid",
  gap: 6,
  fontSize: 14,
  color: "#374151",
  marginBottom: 14
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  color: "#111827",
  background: "#fff"
};

const sectionTitleStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: "#111827",
  marginBottom: 14
};

const buttonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#111827",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600
};

const secondaryButtonStyle = {
  ...buttonStyle,
  background: "#ffffff",
  color: "#111827"
};

export default function Settings() {
  const [settings, setSettings] = useState({
    model: "gemma3:1b",
    temperature: 0.2,
    top_k: 10,
    max_context_chunks: 25,
    chunk_size: 800,
    chunk_overlap: 100,
    auto_extract: true,
    confirm_generate_actions: true,
    show_citations: true,
    compact_mode: false
  });

  const [status, setStatus] = useState({
    backend: "Checking...",
    vectorDb: "Checking...",
    database: "Checking..."
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkSystemStatus();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/settings");
      if (!res.ok) return;
      const data = await res.json();
      setSettings((prev) => ({ ...prev, ...data }));
    } catch {
      // fallback to defaults if endpoint not ready yet
    }
  };

  const checkSystemStatus = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/health");
      if (!res.ok) {
        setStatus({
          backend: "Unavailable",
          vectorDb: "Unknown",
          database: "Unknown"
        });
        return;
      }

      const data = await res.json();
      setStatus({
        backend: data.backend || "Running",
        vectorDb: data.vector_db || "Connected",
        database: data.database || "Connected"
      });
    } catch {
      setStatus({
        backend: "Unavailable",
        vectorDb: "Unavailable",
        database: "Unavailable"
      });
    }
  };

  const updateField = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("http://127.0.0.1:8000/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      setMessage("Settings saved successfully.");
    } catch (error) {
      setMessage("Could not save settings. Backend endpoint may not be ready yet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 28, color: "#111827" }}>Settings</h2>
        <p style={{ marginTop: 8, color: "#6b7280", fontSize: 14 }}>
          Configure system defaults, ingestion behavior, and user preferences.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>LLM Settings</div>

          <label style={labelStyle}>
            Default Model
            <input
              style={inputStyle}
              value={settings.model}
              onChange={(e) => updateField("model", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Temperature
            <input
              style={inputStyle}
              type="number"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => updateField("temperature", Number(e.target.value))}
            />
          </label>

          <label style={labelStyle}>
            Top K Retrieval
            <input
              style={inputStyle}
              type="number"
              value={settings.top_k}
              onChange={(e) => updateField("top_k", Number(e.target.value))}
            />
          </label>

          <label style={labelStyle}>
            Max Context Chunks
            <input
              style={inputStyle}
              type="number"
              value={settings.max_context_chunks}
              onChange={(e) => updateField("max_context_chunks", Number(e.target.value))}
            />
          </label>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Ingestion Settings</div>

          <label style={labelStyle}>
            Chunk Size
            <input
              style={inputStyle}
              type="number"
              value={settings.chunk_size}
              onChange={(e) => updateField("chunk_size", Number(e.target.value))}
            />
          </label>

          <label style={labelStyle}>
            Chunk Overlap
            <input
              style={inputStyle}
              type="number"
              value={settings.chunk_overlap}
              onChange={(e) => updateField("chunk_overlap", Number(e.target.value))}
            />
          </label>

          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={settings.auto_extract}
              onChange={(e) => updateField("auto_extract", e.target.checked)}
            />
            Auto extract requirements after ingestion
          </label>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>UI Preferences</div>

          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={settings.show_citations}
              onChange={(e) => updateField("show_citations", e.target.checked)}
            />
            Show citations by default
          </label>

          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={settings.confirm_generate_actions}
              onChange={(e) => updateField("confirm_generate_actions", e.target.checked)}
            />
            Confirm before generating actions
          </label>

          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={settings.compact_mode}
              onChange={(e) => updateField("compact_mode", e.target.checked)}
            />
            Compact mode
          </label>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>System Status</div>

          <div style={{ display: "grid", gap: 10, fontSize: 14, color: "#374151" }}>
            <div><strong>Backend:</strong> {status.backend}</div>
            <div><strong>Vector DB:</strong> {status.vectorDb}</div>
            <div><strong>Database:</strong> {status.database}</div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button style={secondaryButtonStyle} onClick={checkSystemStatus}>
              Refresh Status
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button style={buttonStyle} onClick={saveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>

        {message && (
          <span style={{ fontSize: 14, color: "#374151" }}>{message}</span>
        )}
      </div>
    </div>
  );
}