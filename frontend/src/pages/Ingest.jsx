import { useState } from "react";
import { api } from "../api/client";

export default function Ingest() {
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(
      {
        path: "C:\\RIAAS\\backend\\data\\raw_docs"
      },
      null,
      2
    )
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleIngest() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = JSON.parse(payloadText);
      const res = await api.ingest(payload);
      setResult(res);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2>Ingest Documents</h2>

      <p style={{ opacity: 0.7 }}>
        This will load, chunk, embed, and index regulatory documents into the
        vector store (ChromaDB).
      </p>

      <label>
        Ingest Payload (JSON)
        <textarea
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          rows={8}
          style={{
            width: "100%",
            fontFamily: "monospace",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
            marginTop: 6
          }}
        />
      </label>

      <button
        onClick={handleIngest}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          cursor: "pointer",
          width: "fit-content"
        }}
      >
        {loading ? "Ingesting..." : "Run Ingest"}
      </button>

      {error && (
        <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
          Error: {error}
        </div>
      )}

      {result && (
        <pre
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 10,
            padding: 12,
            overflowX: "auto"
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}