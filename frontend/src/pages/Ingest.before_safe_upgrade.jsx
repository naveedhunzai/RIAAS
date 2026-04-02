import { useState } from "react";
import { api } from "../api/client";

const STEP_LABELS = {
  load: "Document loading",
  chunk: "Chunking",
  embed: "Embedding",
  extract: "Requirements extraction",
  save: "Save complete"
};

const DEFAULT_STEPS = [
  { step: "load", status: "pending" },
  { step: "chunk", status: "pending" },
  { step: "embed", status: "pending" },
  { step: "extract", status: "pending" },
  { step: "save", status: "pending" }
];

function normalizeStages(stages) {
  if (!Array.isArray(stages) || stages.length === 0) return DEFAULT_STEPS;

  if (stages[0]?.step) {
    return stages.map((s) => ({
      step: s.step,
      status: s.status || "pending"
    }));
  }

  if (stages[0]?.stages && Array.isArray(stages[0].stages)) {
    return stages[0].stages.map((s) => ({
      step: s.step,
      status: s.status || "pending"
    }));
  }

  return DEFAULT_STEPS;
}

function StepBar({ steps }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12
      }}
    >
      {steps.map((item, index) => {
        const label = STEP_LABELS[item.step] || item.step;
        const status = item.status || "pending";

        const bg =
          status === "done"
            ? "#d1fae5"
            : status === "active"
              ? "#dbeafe"
              : status === "error"
                ? "#fee2e2"
                : "#f3f4f6";

        const border =
          status === "done"
            ? "1px solid #10b981"
            : status === "active"
              ? "1px solid #3b82f6"
              : status === "error"
                ? "1px solid #ef4444"
                : "1px solid #d1d5db";

        const text =
          status === "done"
            ? "#065f46"
            : status === "active"
              ? "#1d4ed8"
              : status === "error"
                ? "#991b1b"
                : "#374151";

        return (
          <div
            key={item.step}
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr auto",
              alignItems: "center",
              gap: 14,
              background: bg,
              border,
              borderRadius: 14,
              padding: "14px 16px"
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "999px",
                background: "#ffffff",
                border: border,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: text,
                fontSize: 14
              }}
            >
              {index + 1}
            </div>

            <div style={{ fontWeight: 600, color: "#111827" }}>{label}</div>

            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "capitalize",
                color: text
              }}
            >
              {status}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListBlock({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 16,
        minHeight: 120
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 10
        }}
      >
        {title}
      </div>

      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          color: "#374151",
          lineHeight: 1.6
        }}
      >
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Ingest() {
  const [path, setPath] = useState("/Users/aaronnaveed/RIAAS/backend/data/raw_docs");
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function runIngestion() {
    try {
      setRunning(true);
      setError("");
      setResult(null);
      setSteps(DEFAULT_STEPS.map((s) => ({ ...s, status: "pending" })));

      const res = await api.ingest({ path });
      setResult(res);
      setSteps(normalizeStages(res.stages));
    } catch (err) {
      setError(err.message || "Ingestion failed.");
      setSteps((prev) => {
        const next = prev.map((s) => ({ ...s }));
        const activeIndex = next.findIndex((s) => s.status === "active");
        if (activeIndex >= 0) {
          next[activeIndex].status = "error";
          return next;
        }
        const firstPending = next.findIndex((s) => s.status === "pending");
        if (firstPending >= 0) {
          next[firstPending].status = "error";
          return next;
        }
        if (next.length > 0) {
          next[next.length - 1].status = "error";
        }
        return next;
      });
    } finally {
      setRunning(false);
    }
  }

  function resetState() {
    setSteps(DEFAULT_STEPS);
    setError("");
    setResult(null);
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        display: "flex",
        justifyContent: "center",
        padding: 24,
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          display: "grid",
          gap: 20,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 24,
          boxSizing: "border-box",
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: "#111827"
            }}
          >
            Ingestion
          </h2>

          <p
            style={{
              margin: 0,
              color: "#4b5563",
              lineHeight: 1.6
            }}
          >
            Load, chunk, embed, and index regulatory documents into the vector
            store. Review progress below and check file-level results after each run.
          </p>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827"
            }}
          >
            Document folder path
          </label>

          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/Users/aaronnaveed/RIAAS/backend/data/raw_docs"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              color: "#111827",
              fontSize: 14,
              boxSizing: "border-box",
              outline: "none"
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <button
            onClick={runIngestion}
            disabled={running}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: running ? "#9ca3af" : "#111827",
              color: "#ffffff",
              cursor: running ? "not-allowed" : "pointer",
              width: "fit-content",
              fontWeight: 700,
              fontSize: 14
            }}
          >
            {running ? "Running..." : "Run ingestion"}
          </button>

          <button
            onClick={resetState}
            disabled={running}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              cursor: running ? "not-allowed" : "pointer",
              width: "fit-content",
              fontWeight: 700,
              fontSize: 14
            }}
          >
            Reset
          </button>
        </div>

        <StepBar steps={steps} />

        {error && (
          <div
            style={{
              color: "#991b1b",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 14,
              whiteSpace: "pre-wrap"
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {result?.message && (
          <div
            style={{
              color: "#065f46",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: 12,
              padding: 14
            }}
          >
            <strong>Status:</strong> {result.message}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14
          }}
        >
          <ListBlock title="New files" items={result?.new_files} />
          <ListBlock title="Changed files" items={result?.changed_files} />
          <ListBlock title="Skipped files" items={result?.skipped_files} />
          <ListBlock title="Missing files" items={result?.missing_files} />
        </div>

        {result && (
          <div
            style={{
              display: "grid",
              gap: 10
            }}
          >
            <strong
              style={{
                fontSize: 16,
                color: "#111827"
              }}
            >
              Response
            </strong>

            <pre
              style={{
                margin: 0,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
                overflowX: "auto",
                color: "#111827",
                fontSize: 13,
                lineHeight: 1.5
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}