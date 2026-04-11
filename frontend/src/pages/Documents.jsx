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

function ActionButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #bfdbfe",
        background: disabled ? "#e5e7eb" : "#eff6ff",
        color: disabled ? "#6b7280" : "#1d4ed8",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600
      }}
    >
      {children}
    </button>
  );
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [workingKey, setWorkingKey] = useState("");

  async function loadDocs() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

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

  async function reprocessDocument(doc) {
    const ok = window.confirm(
      `Reprocess "${doc.file_name}"? Backend will handle cleanup, validation, missing requirements, and recovery as needed.`
    );
    if (!ok) return;

    try {
      setWorkingKey(`reprocess-${doc.id}`);
      setError("");
      setMessage("");

      const response = await fetch(`http://127.0.0.1:8000/reingest-document/${doc.id}`, {
        method: "POST"
      });

      if (!response.ok) {
        let msg = "Failed to reprocess document.";
        try {
          const data = await response.json();
          msg = data?.detail || data?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const res = await response.json();

      const stepSummary = res?.steps
        ? Object.entries(res.steps).map(([k, v]) => `${k}: ${v}`).join(" | ")
        : "No step summary returned.";

      const errorSummary = Array.isArray(res?.errors) && res.errors.length > 0
        ? ` Errors: ${res.errors.join(" ; ")}`
        : "";

      setMessage(
        `Reprocess status: ${res?.status || "unknown"} for ${doc.file_name}. ${stepSummary}.${errorSummary}`
      );

      await loadDocs();
    } catch (err) {
      setError(err.message || "Failed to reprocess document.");
    } finally {
      setWorkingKey("");
    }
  }
  async function handleDeleteOrphan(source) {
    const ok = window.confirm(`Delete orphan data for ${source}?`);
    if (!ok) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/delete-orphan?source=${encodeURIComponent(source)}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete orphan data");
      }

      await response.json();
      await loadDocs();
    } catch (err) {
      alert(err.message || "Error deleting orphan");
    }
  }


  useEffect(() => {
    loadDocs();
  }, []);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2>Document Lifecycle</h2>

      <p style={{ opacity: 0.7 }}>
        This page validates document-to-requirement traceability and lets the backend handle document reprocessing.
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

      {message && (
        <div
          style={{
            color: "#065f46",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 10,
            padding: 12,
            whiteSpace: "pre-wrap"
          }}
        >
          {message}
        </div>
      )}

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
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Operation</th>
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

                  const isOrphan = doc.type === "orphan";
                  const canReprocess = !isOrphan && !!doc.id;

                  return (
                    <tr key={rowKey}>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top", fontWeight: 600 }}>
                        {doc.file_name}
                        {isOrphan && doc.source ? (
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                            Source: {doc.source}
                          </div>
                        ) : null}
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        {doc.ingested_at
                          ? new Date(doc.ingested_at).toLocaleString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                              
                            })
                          : "—"}
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
                        {isOrphan ? (
                          <ActionButton onClick={() => handleDeleteOrphan(doc.source)}>
                            Clear Orphan
                          </ActionButton>
                        ) : canReprocess ? (
                          <ActionButton
                            onClick={() => reprocessDocument(doc)}
                            disabled={workingKey === `reprocess-${doc.id}`}
                          >
                            {workingKey === `reprocess-${doc.id}` ? "Reprocessing..." : "Reprocess Document"}
                          </ActionButton>
                        ) : (
                          <span style={{ fontSize: 12, color: "#6b7280" }}>—</span>
                        )}
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


