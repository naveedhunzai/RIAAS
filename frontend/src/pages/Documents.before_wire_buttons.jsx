import { useEffect, useState } from "react";

function statusTone(status) {
  const s = String(status || "").toLowerCase();

  if (s === "valid") {
    return { color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" };
  }

  if (s.includes("orphan")) {
    return { color: "#92400e", bg: "#fffbeb", border: "#fde68a" };
  }

  if (s.includes("missing file")) {
    return { color: "#92400e", bg: "#fff7ed", border: "#fdba74" };
  }

  if (s.includes("needs")) {
    return { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" };
  }

  return { color: "#991b1b", bg: "#fef2f2", border: "#fecaca" };
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDocs() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://127.0.0.1:8000/document-lifecycle");
      if (!response.ok) {
        throw new Error("Failed to load document lifecycle.");
      }

      const data = await response.json();
      setDocs(data.items || []);
    } catch (err) {
      setError(err.message || "Failed to load document lifecycle.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2>Document Lifecycle</h2>

      <p style={{ opacity: 0.7 }}>
        This page validates document-to-requirement traceability and shows allowed operations by status.
      </p>

      <button
        onClick={loadDocs}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          cursor: loading ? "not-allowed" : "pointer",
          width: "fit-content",
          background: "#fff",
          color: "#111827",
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? "Refreshing..." : "Refresh"}
      </button>

      {loading && <div>Loading document lifecycle...</div>}

      {error && (
        <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 10,
            padding: 12,
            overflowX: "auto"
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Document</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Ingested Date</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Chunks</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Embeddings</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Requirements</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Actions</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Status</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Allowed Operations</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: "8px" }}>
                    No lifecycle rows found.
                  </td>
                </tr>
              ) : (
                docs.map((doc, idx) => {
                  const tone = statusTone(doc.status);
                  const rowKey = doc.type === "orphan"
                    ? `orphan-${doc.source || idx}`
                    : `doc-${doc.id}`;

                  return (
                    <tr key={rowKey}>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top", fontWeight: 600 }}>
                        {doc.file_name}
                        {doc.type === "orphan" && doc.source ? (
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                            Source: {doc.source}
                          </div>
                        ) : null}
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        {doc.ingested_at || "—"}
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        {doc.chunk_count ?? 0}
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        {doc.embedding_count ?? 0}
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        {doc.requirement_count ?? 0}
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        {doc.action_count ?? 0}
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: `1px solid ${tone.border}`,
                            background: tone.bg,
                            color: tone.color,
                            fontWeight: 700,
                            fontSize: 12
                          }}
                        >
                          {doc.status}
                        </span>
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        {(doc.allowed_operations || []).join(", ")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
