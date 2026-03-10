import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDocs() {
    try {
      setLoading(true);
      setError("");
      const res = await api.listIngestedDocuments(200);
      setDocs(res.items || []);
    } catch (err) {
      setError(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2>Ingested Documents</h2>

      <p style={{ opacity: 0.7 }}>
        This page shows documents already indexed in the system.
      </p>

      <button
        onClick={loadDocs}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          cursor: "pointer",
          width: "fit-content"
        }}
      >
        Refresh
      </button>

      {loading && <div>Loading documents...</div>}

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
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>File Name</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Status</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Ingested At</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd" }}>Path</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: "8px" }}>
                    No ingested documents found.
                  </td>
                </tr>
              ) : (
                docs.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1" }}>{doc.file_name}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1" }}>{doc.status}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1" }}>{doc.ingested_at}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #f1f1f1" }}>{doc.file_path}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
