import { useState } from "react";
import { api } from "../api/client";

export default function Ask() {
  const [question, setQuestion] = useState("SAR safe harbor protections");
  const [topK, setTopK] = useState(8);
  const [model, setModel] = useState("gemma3:1b");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState(null);

  async function handleAsk() {
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await api.answer({
        question,
        top_k: Number(topK),
        model,
      });
      setResponse(res);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* Header */}
      <div>
        <h2>Ask (Answer)</h2>
        <div style={{ opacity: 0.7 }}>
          Submit a regulatory question and receive an evidence-backed response.
        </div>
      </div>

      {/* Input */}
      <label>
        Question
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginTop: 6,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          top_k
          <input
            type="number"
            value={topK}
            onChange={(e) => setTopK(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
        </label>

        <label>
          model
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
        </label>
      </div>

      {/* Action */}
      <button
        onClick={handleAsk}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          background: loading ? "#93c5fd" : "#2563eb",
          cursor: "pointer",
          width: "fit-content",
        }}
      >
        {loading ? "Generating answer…" : "Get Answer"}
      </button>

      {/* Error */}
      {error && (
        <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
          Error: {error}
        </div>
      )}

      {/* Response */}
      {response && (
        <div style={{ display: "grid", gap: 18 }}>

          {/* Answer */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h3>Answer</h3>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {response.answer}
            </div>
          </div>

          {/* Citations */}
          {response.citations?.length > 0 && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <h3>Citations</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", paddingBottom: 8 }}>Source</th>
                    <th style={{ textAlign: "left", paddingBottom: 8 }}>Page</th>
                  </tr>
                </thead>
                <tbody>
                  {response.citations.map((c) => (
                    <tr key={c.id}>
                      <td style={{ padding: "6px 0" }}>{c.source}</td>
                      <td style={{ padding: "6px 0" }}>{c.page}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sources */}
          {response.sources?.length > 0 && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <h3>Source References</h3>
              <ul>
                {response.sources.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
