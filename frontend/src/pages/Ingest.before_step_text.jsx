import { useMemo, useRef, useState } from "react";
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

function normalizeStatus(status) {
  const s = String(status || "pending").toLowerCase();

  if (["done", "complete", "completed", "success"].includes(s)) return "done";
  if (["active", "running", "processing", "in_progress"].includes(s)) return "active";
  if (["error", "failed", "failure"].includes(s)) return "error";
  return "pending";
}

function normalizeStages(stages) {
  if (!Array.isArray(stages) || stages.length === 0) return DEFAULT_STEPS;

  if (stages[0]?.step) {
    return stages.map((s) => ({
      step: s.step,
      status: normalizeStatus(s.status)
    }));
  }

  if (stages[0]?.stages && Array.isArray(stages[0].stages)) {
    return stages[0].stages.map((s) => ({
      step: s.step,
      status: normalizeStatus(s.status)
    }));
  }

  return DEFAULT_STEPS;
}

function getStatusMeta(status) {
  const s = normalizeStatus(status);

  if (s === "done") {
    return {
      icon: "✔",
      badge: "Completed",
      bg: "#ecfdf5",
      border: "#10b981",
      text: "#065f46"
    };
  }

  if (s === "active") {
    return {
      icon: "●",
      badge: "In progress",
      bg: "#eff6ff",
      border: "#3b82f6",
      text: "#1d4ed8"
    };
  }

  if (s === "error") {
    return {
      icon: "✖",
      badge: "Error",
      bg: "#fef2f2",
      border: "#ef4444",
      text: "#991b1b"
    };
  }

  return {
    icon: "○",
    badge: "Pending",
    bg: "#f9fafb",
    border: "#d1d5db",
    text: "#374151"
  };
}

function StepBar({ steps }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 8
      }}
    >
      {steps.map((item, index) => {
        const label = STEP_LABELS[item.step] || item.step;
        const meta = getStatusMeta(item.status);

        return (
          <div
            key={item.step}
            style={{
              display: "grid",
              gridTemplateColumns: "42px 1fr auto",
              alignItems: "center",
              gap: 12,
              background: meta.bg,
              border: `1px solid ${meta.border}`,
              borderRadius: 12,
              padding: "10px 12px"
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "999px",
                background: "#ffffff",
                border: `1px solid ${meta.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                color: meta.text,
                fontSize: 12
              }}
            >
              {meta.icon}
            </div>

            <div>
              <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>
                {label}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                Step {index + 1} of {steps.length}
              </div>
            </div>

            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: meta.text,
                background: "#ffffff",
                border: `1px solid ${meta.border}`,
                borderRadius: 999,
                padding: "5px 9px",
                textTransform: "none",
                whiteSpace: "nowrap"
              }}
            >
              {meta.badge}
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

function StatCard({ title, value }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 16
      }}
    >
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#111827" }}>
        {value}
      </div>
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 14
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#111827",
          wordBreak: "break-word"
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function Ingest() {
  const [path, setPath] = useState("/Users/aaronnaveed/RIAAS/backend/data/raw_docs");
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [lastRunAt, setLastRunAt] = useState(null);

  const fileInputRef = useRef(null);

  const progress = useMemo(() => {
    const total = steps.length || 1;
    const done = steps.filter((s) => normalizeStatus(s.status) === "done").length;
    return Math.round((done / total) * 100);
  }, [steps]);

  const progressLabel = useMemo(() => {
    const active = steps.find((s) => normalizeStatus(s.status) === "active");
    const errorStep = steps.find((s) => normalizeStatus(s.status) === "error");

    if (errorStep) {
      return `${STEP_LABELS[errorStep.step] || errorStep.step} failed`;
    }

    if (active) {
      return `${STEP_LABELS[active.step] || active.step} in progress`;
    }

    if (progress === 100) {
      return "All steps completed";
    }

    return "Waiting to start";
  }, [steps, progress]);

  const lastDocumentIngested = useMemo(() => {
    if (Array.isArray(result?.changed_files) && result.changed_files.length > 0) {
      return result.changed_files[result.changed_files.length - 1];
    }
    if (Array.isArray(result?.new_files) && result.new_files.length > 0) {
      return result.new_files[result.new_files.length - 1];
    }
    if (Array.isArray(selectedFiles) && selectedFiles.length > 0) {
      return selectedFiles[selectedFiles.length - 1]?.name || "—";
    }
    return "—";
  }, [result, selectedFiles]);

  const totalProcessedFiles = useMemo(() => {
    return (
      (result?.new_files?.length || 0) +
      (result?.changed_files?.length || 0) +
      (result?.skipped_files?.length || 0)
    );
  }, [result]);

  async function runIngestion() {
    try {
      setRunning(true);
      setError("");
      setResult(null);
      setSteps(DEFAULT_STEPS.map((s, i) => ({
        ...s,
        status: i === 0 ? "active" : "pending"
      })));

      const res = await api.ingest({ path });
      setResult(res);
      setLastRunAt(new Date().toISOString());
      setSteps(normalizeStages(res.stages));
    } catch (err) {
      setError(err.message || "Ingestion failed.");
      setSteps((prev) => {
        const next = prev.map((s) => ({ ...s }));
        const activeIndex = next.findIndex((s) => normalizeStatus(s.status) === "active");

        if (activeIndex >= 0) {
          next[activeIndex].status = "error";
          return next;
        }

        const firstPending = next.findIndex((s) => normalizeStatus(s.status) === "pending");
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
    setSelectedFiles([]);
    setLastRunAt(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleBrowseClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function handleSelectedFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) =>
      String(f.name || "").toLowerCase().endsWith(".pdf")
    );
    setSelectedFiles(files);
  }

  function onInputChange(e) {
    handleSelectedFiles(e.target.files);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleSelectedFiles(e.dataTransfer.files);
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

        <div style={{ display: "grid", gap: 8 }}>
          <label
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827"
            }}
          >
            Browse PDFs
          </label>

          <div
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            style={{
              border: `2px dashed ${dragging ? "#3b82f6" : "#d1d5db"}`,
              background: dragging ? "#eff6ff" : "#f9fafb",
              borderRadius: 14,
              padding: 16
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap"
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                  Add files with Browse
                </div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  UI only for now. Ingestion still uses the folder path above.
                </div>
              </div>

              <button
                type="button"
                onClick={handleBrowseClick}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  color: "#111827",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14
                }}
              >
                Browse Files
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={onInputChange}
                style={{ display: "none" }}
              />
            </div>

            {selectedFiles.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gap: 8
                }}
              >
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "9px 12px",
                      fontSize: 14,
                      color: "#111827"
                    }}
                  >
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>
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

        <div
          style={{
            display: "grid",
            gap: 10,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 16
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap"
            }}
          >
            <div style={{ fontWeight: 700, color: "#111827" }}>Progress</div>
            <div style={{ fontSize: 13, color: "#4b5563", fontWeight: 600 }}>
              {progressLabel}
            </div>
          </div>

          <div
            style={{
              height: 10,
              borderRadius: 999,
              overflow: "hidden",
              background: "#e5e7eb"
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: progress === 100 ? "#10b981" : "#3b82f6",
                borderRadius: 999,
                transition: "width 0.35s ease"
              }}
            />
          </div>

          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {progress}% complete
          </div>
        </div>

        <StepBar steps={steps} />

        <div
          style={{
            display: "grid",
            gap: 12,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 16
          }}
        >
          <div style={{ fontWeight: 700, color: "#111827" }}>
            Last ingestion details
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12
            }}
          >
            <DetailCard label="Last document ingested" value={lastDocumentIngested} />
            <DetailCard label="Last run date" value={formatDateTime(lastRunAt)} />
            <DetailCard label="Loaded pages" value={result?.loaded_pages ?? 0} />
            <DetailCard label="Total chunks" value={result?.total_chunks ?? 0} />
            <DetailCard label="New files" value={result?.new_files?.length ?? 0} />
            <DetailCard label="Changed files" value={result?.changed_files?.length ?? 0} />
            <DetailCard label="Skipped files" value={result?.skipped_files?.length ?? 0} />
            <DetailCard label="Processed files" value={totalProcessedFiles} />
          </div>
        </div>

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
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14
          }}
        >
          <StatCard title="Loaded pages" value={result?.loaded_pages ?? 0} />
          <StatCard title="Total chunks" value={result?.total_chunks ?? 0} />
          <StatCard title="Selected PDFs" value={selectedFiles.length} />
          <StatCard title="New files" value={result?.new_files?.length ?? 0} />
        </div>

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
      </div>
    </div>
  );
}
