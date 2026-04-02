import { useEffect, useState } from "react";
import { api } from "../api/client";

function statusTone(status) {
  const s = String(status || "").toLowerCase();

  if (s.includes("valid")) {
    return {
      color: "#166534",
      bg: "#f0fdf4",
      border: "#bbf7d0"
    };
  }

  if (s.includes("orphan")) {
    return {
      color: "#92400e",
      bg: "#fffbeb",
      border: "#fde68a"
    };
  }

  return {
    color: "#991b1b",
    bg: "#fef2f2",
    border: "#fecaca"
  };
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingKey, setWorkingKey] = useState("");
  const [message, setMessage] = useState("");

  function formatDate(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (isNaN(d)) return dt;
  return d.toLocaleString();
}

async function loadDocs() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch("http://127.0.0.1:8000/document-integrity");
      if (!response.ok) {
        throw new Error("Failed to load document integrity data.");
      }

      const res = await response.json();
      setDocs(res.items || []);
    } catch (err) {
      setError(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteDoc(id, fileName) {
    const ok = window.confirm(
      `Delete "${fileName || "this document"}" and all related requirements, actions, vectors, and stored file data?`
    );
    if (!ok) return;

    try {
      setWorkingKey(`delete-${id}`);
      setError("");
      setMessage("");

      const res = await api.del(`/ingested-documents/${id}`);

      const deletedRequirements = res?.deleted_requirements ?? 0;
      const deletedActions = res?.deleted_actions ?? 0;
      const deletedVectors = res?.deleted_vectors ?? 0;

      setMessage(
        `Deleted ${fileName}. Requirements removed: ${deletedRequirements}. Actions removed: ${deletedActions}. Vector entries removed: ${deletedVectors}.`
      );

      await loadDocs();
    } catch (err) {
      setError(err.message || "Failed to delete document.");
    } finally {
      setWorkingKey("");
    }
  }

  async function reingestDoc(fileName) {
    const ok = window.confirm(
      `Re-ingest "${fileName}"? This should be used when the document exists but requirements are missing or stale.`
    );
    if (!ok) return;

    try {
      setWorkingKey(`reingest-${fileName}`);
      setError("");
      setMessage("");

      const response = await fetch("http://127.0.0.1:8000/extract-requirements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: `all compliance requirements from ${fileName}`,
          top_k: 50,
          model: "gemma3:4b"
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to re-extract requirements.");
      }

      const res = await response.json();
      const extractedCount = res?.extracted_count ?? 0;

      setMessage(
        `Re-ingest request completed for ${fileName}. Requirements extracted: ${extractedCount}.`
      );

      await loadDocs();
    } catch (err) {
      setError(err.message || "Failed to re-ingest document.");
    } finally {
      setWorkingKey("");
    }
  }

  const filteredDocs = docs.filter(d =>
  String(d.file_name || "").toLowerCase().includes(search.toLowerCase())
);

useEffect(() => {
    loadDocs();
  }, []);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2>Document Integrity</h2>

      <p style={{ opacity: 0.7 }}>
        This page validates document-to-requirement traceability and flags broken states.
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

<input
  placeholder="Search document..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    padding: "10px",
    borderRadius: 8,
    border: "1px solid #ddd",
    width: 250
  }}
/>

      {message && (
        <div
          style={{
            color: "#065f46",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 10,
            padding: 12,
            whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto"
          }}
        >
          {message}
        </div>
      )}

      {loading && <div>Loading document integrity...</div>}

      {error && (
        <div style={{ color: "crimson", whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto" }}>
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
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Type</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Ingested Date</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Requirements</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Actions</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Status</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Operations</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: "8px" }}>
                    No document integrity rows found.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, idx) => {
                  const tone = statusTone(doc.status);
                  const rowKey = doc.type === "orphan"
                    ? `orphan-${doc.source || idx}`
                    : `doc-${doc.id}`;

                  const fileName = doc.file_name || "?";
                  const isOrphan = doc.type === "orphan";
                  const isInvalid = String(doc.status || "").toLowerCase().includes("missing requirements");

                  return (
                    <tr key={rowKey}>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top", fontWeight: 600 }}>
                        {fileName}
                        {isOrphan && doc.source ? (
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                            Source reference: {doc.source}
                          </div>
                        ) : null}
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        {doc.type}
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        {doc.ingested_at || "���"}
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        {doc.requirements ?? 0}
                      </td>

                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1", verticalAlign: "top" }}>
                        {doc.actions ?? 0}
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
                          {!isOrphan && isInvalid && (
                            <button
                              onClick={() => reingestDoc(doc.file_name)}
                              disabled={workingKey === `reingest-${doc.file_name}`}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: "1px solid #bfdbfe",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                cursor: workingKey === `reingest-${doc.file_name}` ? "not-allowed" : "pointer",
                                fontWeight: 600
                              }}
                            >
                              {workingKey === `reingest-${doc.file_name}` ? "Re-ingesting..." : "Re-ingest"}
                            </button>

<input
  placeholder="Search document..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    padding: "10px",
    borderRadius: 8,
    border: "1px solid #ddd",
    width: 250
  }}
/>
                          )}

                          {!isOrphan && (
                            <button
                              onClick={() => deleteDoc(doc.id, doc.file_name)}
                              disabled={workingKey === `delete-${doc.id}`}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: "1px solid #f5c2c7",
                                background: workingKey === `delete-${doc.id}` ? "#fca5a5" : "#fee2e2",
                                color: "#991b1b",
                                cursor: workingKey === `delete-${doc.id}` ? "not-allowed" : "pointer",
                                fontWeight: 600
                              }}
                            >
                              {workingKey === `delete-${doc.id}` ? "Deleting..." : "Delete"}
                            </button>

<input
  placeholder="Search document..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    padding: "10px",
    borderRadius: 8,
    border: "1px solid #ddd",
    width: 250
  }}
/>
                          )}

                          {isOrphan && (
                            <span style={{ fontSize: 12, color: "#6b7280" }}>
                              Orphan cleanup action can be added next.
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


