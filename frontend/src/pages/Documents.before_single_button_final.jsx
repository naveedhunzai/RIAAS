import { useEffect, useState } from "react";
import { api } from "../api/client";

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

function ActionButton({ children, onClick, disabled, tone = "neutral" }) {
  const themes = {
    neutral: {
      border: "#d1d5db",
      bg: "#ffffff",
      color: "#111827"
    },
    primary: {
      border: "#bfdbfe",
      bg: "#eff6ff",
      color: "#1d4ed8"
    },
    danger: {
      border: "#fecaca",
      bg: "#fee2e2",
      color: "#991b1b"
    }
  };

  const t = themes[tone] || themes.neutral;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: `1px solid ${t.border}`,
        background: disabled ? "#e5e7eb" : t.bg,
        color: disabled ? "#6b7280" : t.color,
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

  function formatDate(dt) {
  if (!dt) return "—";

  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);

  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
}

  async function extractRequirements(doc) {
    const ok = window.confirm(
      `Extract requirements for "${doc.file_name}" from existing indexed content?`
    );
    if (!ok) return;

    try {
      setWorkingKey(`extract-${doc.id}`);
      setError("");
      setMessage("");

      const response = await fetch("http://127.0.0.1:8000/extract-requirements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: `all compliance requirements from ${doc.file_name}`,
          top_k: 50,
          model: "gemma3:4b"
        })
      });

      if (!response.ok) {
        let msg = "Failed to extract requirements.";
        try {
          const data = await response.json();
          msg = data?.detail || data?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const res = await response.json();
      setMessage(
        `Requirement extraction completed for ${doc.file_name}. Extracted: ${res?.extracted_count ?? 0}. Saved IDs: ${(res?.saved_requirement_ids || []).join(", ") || "none"}.`
      );

      await loadDocs();
    } catch (err) {
      setError(err.message || "Failed to extract requirements.");
    } finally {
      setWorkingKey("");
    }
  }

  async function reprocessDocument(doc) {
    const ok = window.confirm(
      `Reprocess "${doc.file_name}"? This will clear related requirements, actions, vectors, and the document DB row, then run the full ingest pipeline again using the existing file on disk.`
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
      setMessage(
        `Reprocess completed for ${doc.file_name}. Requirements cleared: ${res?.deleted_requirements ?? 0}. Actions cleared: ${res?.deleted_actions ?? 0}. Vectors cleared: ${res?.deleted_vectors ?? 0}.`
      );

      await loadDocs();
    } catch (err) {
      setError(err.message || "Failed to reprocess document.");
    } finally {
      setWorkingKey("");
    }
  }

  async function deleteDocument(doc) {
    const ok = window.confirm(
      `Delete "${doc.file_name}" and all related requirements, actions, vectors, and stored file data?`
    );
    if (!ok) return;

    try {
      setWorkingKey(`delete-${doc.id}`);
      setError("");
      setMessage("");

      const res = await api.del(`/ingested-documents/${doc.id}`);

      setMessage(
        `Deleted ${doc.file_name}. Requirements removed: ${res?.deleted_requirements ?? 0}. Actions removed: ${res?.deleted_actions ?? 0}. Vector entries removed: ${res?.deleted_vectors ?? 0}.`
      );

      await loadDocs();
    } catch (err) {
      setError(err.message || "Failed to delete document.");
    } finally {
      setWorkingKey("");
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
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Operations</th>
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

                  const ops = doc.allowed_operations || [];
                  const isOrphan = doc.type === "orphan";

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
                        {formatDate(doc.ingested_at)}
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
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {ops.includes("extract") && !isOrphan && (
                            <ActionButton
                              tone="primary"
                              onClick={() => extractRequirements(doc)}
                              disabled={workingKey === `extract-${doc.id}`}
                            >
                              {workingKey === `extract-${doc.id}` ? "Extracting..." : "Extract Requirements"}
                            </ActionButton>
                          )}

                          {ops.includes("reprocess") && !isOrphan && (
                            <ActionButton
                              tone="primary"
                              onClick={() => reprocessDocument(doc)}
                              disabled={workingKey === `reprocess-${doc.id}`}
                            >
                              {workingKey === `reprocess-${doc.id}` ? "Reprocessing..." : "Reprocess Document"}
                            </ActionButton>
                          )}

                          {ops.includes("delete") && !isOrphan && (
                            <ActionButton
                              tone="danger"
                              onClick={() => deleteDocument(doc)}
                              disabled={workingKey === `delete-${doc.id}`}
                            >
                              {workingKey === `delete-${doc.id}` ? "Deleting..." : "Delete"}
                            </ActionButton>
                          )}

                          {ops.includes("delete_orphan") && (
                            <span style={{ fontSize: 12, color: "#6b7280" }}>
                              Cleanup orphan action can be added next.
                            </span>
                          )}
                        </div>
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




