import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";

/** ---------- small UI helpers ---------- */
function Pill({ children, tone = "default" }) {
  if (!children && children !== 0) return null;

  const tones = {
    default: {
      background: "#fafafa",
      border: "1px solid #e5e7eb",
      color: "#111827",
    },
    success: {
      background: "#16a34a",
      border: "1px solid #16a34a",
      color: "#ffffff",
    },
    subtle: {
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      color: "#374151",
    },
  };

  const t = tones[tone] || tones.default;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        background: t.background,
        border: t.border,
        color: t.color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  );
}

function Button({ children, onClick, disabled, variant = "default" }) {
  const primary = variant === "primary";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: primary ? "1px solid #111827" : "1px solid #d1d5db",
        background: disabled ? "#9ca3af" : primary ? "#111827" : "#ffffff",
        color: disabled ? "#ffffff" : primary ? "#ffffff" : "#111827",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700,
        opacity: disabled ? 0.95 : 1,
      }}
    >
      {children}
    </button>
  );
}

function FieldRow({ label, value }) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 700, color: "#4b5563" }}>{label}</div>
      <div
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
          color: "#111827",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function safeArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

function toId(r) {
  return r?.id ?? r?.req_id ?? r?.reqId ?? null;
}

function toRequirementText(r) {
  return (
    r?.requirement_text ??
    r?.requirement ??
    r?.text ??
    r?.summary ??
    r?.title ??
    ""
  );
}

function toCategory(r) {
  return r?.category ?? r?.reg_category ?? r?.domain ?? r?.type ?? "";
}

function toModality(r) {
  return r?.modality ?? r?.mode ?? r?.channel ?? "";
}

function toStatus(r) {
  return r?.status ?? r?.state ?? "";
}

function toEvidenceCount(r) {
  const c = Array.isArray(r?.citations) ? r.citations.length : 0;
  const rc = Array.isArray(r?.retrieved_citations) ? r.retrieved_citations.length : 0;
  const s = Array.isArray(r?.sources) ? r.sources.length : 0;
  const single = r?.source || r?.page || r?.citation_id ? 1 : 0;
  return c + rc + s + single;
}

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt);
  }
}

function toActionRequirementId(a) {
  return a?.requirement_id ?? a?.requirementId ?? a?.req_id ?? null;
}

function hasGeneratedActions(actions, requirementId) {
  return actions.some((a) => String(toActionRequirementId(a)) === String(requirementId));
}

/** ---------- details panel ---------- */
function RequirementDetailsPanel({
  detail,
  loading,
  error,
  onReload,
  onGenerateActions,
  actionsBusy,
  disableGenerate,
}) {
  if (!detail && !loading && !error) {
    return <div style={{ color: "#6b7280" }}>Select a requirement to view details.</div>;
  }

  if (loading) {
    return <div style={{ color: "#6b7280" }}>Loading requirement details...</div>;
  }

  if (error) {
    return (
      <div
        style={{
          color: "#991b1b",
          whiteSpace: "pre-wrap",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 12,
          padding: 14,
        }}
      >
        Error: {error}
      </div>
    );
  }

  if (!detail) return null;

  const id = toId(detail);
  const requirementText = toRequirementText(detail);
  const category = toCategory(detail);
  const modality = toModality(detail);
  const status = toStatus(detail);
  const source = detail?.source ?? "";
  const page = detail?.page ?? "";
  const citationId = detail?.citation_id ?? "";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Pill>ID: {id ?? "N/A"}</Pill>
        {category && <Pill>{category}</Pill>}
        {modality && <Pill>{modality}</Pill>}
        {status && <Pill>{status}</Pill>}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Button onClick={onReload}>Reload</Button>
          <Button
            variant="primary"
            onClick={onGenerateActions}
            disabled={actionsBusy || disableGenerate}
          >
            {disableGenerate
              ? "Actions already generated"
              : actionsBusy
                ? "Generating..."
                : "Generate Actions"}
          </Button>
        </div>
      </div>

      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 8, color: "#111827" }}>
          Requirement Statement
        </div>
        <div
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.7,
            color: "#111827",
            wordBreak: "break-word",
          }}
        >
          {requirementText || "No requirement text available."}
        </div>
      </div>

      {(source || page || citationId) && (
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 10, color: "#111827" }}>
            Evidence
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <FieldRow label="Source" value={source} />
            <FieldRow label="Page" value={page} />
            <FieldRow label="Citation ID" value={citationId} />
          </div>
        </div>
      )}

      {detail?.created_at && (
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 10, color: "#111827" }}>
            Record Metadata
          </div>
          <FieldRow label="Created" value={formatDate(detail.created_at)} />
        </div>
      )}
    </div>
  );
}

/** ---------- main page ---------- */
export default function Requirements() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requirements, setRequirements] = useState([]);
  const [actions, setActions] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [modality, setModality] = useState("All");
  const [status, setStatus] = useState("All");

  const [actionBusyId, setActionBusyId] = useState(null);
  const [actionMsg, setActionMsg] = useState("");

  const didInitRef = useRef(false);
  const lastLoadedDetailIdRef = useRef(null);

  async function loadRequirements({ preserveSelection = true } = {}) {
    setLoading(true);
    setError("");
    setActionMsg("");

    try {
      const reqData = await api.listRequirements();
      const reqs = safeArray(reqData);
      setRequirements(reqs);

      try {
        const actionData = api.listActions ? await api.listActions() : [];
        const acts = safeArray(actionData);
        setActions(acts);
      } catch (actionErr) {
        console.error("listActions failed:", actionErr);
        setActions([]);
      }

      if (reqs.length === 0) {
        setSelectedId(null);
        setDetail(null);
        lastLoadedDetailIdRef.current = null;
        return;
      }

      if (!preserveSelection || selectedId === null || selectedId === undefined) {
        const firstId = toId(reqs[0]);
        setSelectedId(firstId);
        return;
      }

      const selectedStillExists = reqs.some(
        (r) => String(toId(r)) === String(selectedId)
      );

      if (!selectedStillExists) {
        setSelectedId(toId(reqs[0]));
      }
    } catch (e) {
      console.error("loadRequirements failed:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(reqId, { force = false } = {}) {
    if (reqId === null || reqId === undefined) return;
    if (!force && String(lastLoadedDetailIdRef.current) === String(reqId)) return;

    setDetailLoading(true);
    setDetailError("");

    try {
      const d = await api.getRequirement(reqId);
      setDetail(d);
      lastLoadedDetailIdRef.current = reqId;
    } catch (e) {
      setDetailError(e?.message || String(e));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    loadRequirements({ preserveSelection: false });
  }, []);

  useEffect(() => {
    if (selectedId === null || selectedId === undefined) return;
    loadDetail(selectedId);
  }, [selectedId]);

  const categories = useMemo(() => {
    const set = new Set();
    requirements.forEach((r) => {
      const v = toCategory(r);
      if (v) set.add(String(v));
    });
    return ["All", ...Array.from(set).sort()];
  }, [requirements]);

  const modalities = useMemo(() => {
    const set = new Set();
    requirements.forEach((r) => {
      const v = toModality(r);
      if (v) set.add(String(v));
    });
    return ["All", ...Array.from(set).sort()];
  }, [requirements]);

  const statuses = useMemo(() => {
    const set = new Set();
    requirements.forEach((r) => {
      const v = toStatus(r);
      if (v) set.add(String(v));
    });
    return ["All", ...Array.from(set).sort()];
  }, [requirements]);

  const selectedHasActions = useMemo(() => {
    if (selectedId === null || selectedId === undefined) return false;
    return hasGeneratedActions(actions, selectedId);
  }, [actions, selectedId]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return requirements
      .map((r) => ({
        ...r,
        __id: toId(r),
        __text: toRequirementText(r),
        __category: toCategory(r),
        __modality: toModality(r),
        __status: toStatus(r),
      }))
      .filter((r) => {
        if (category !== "All" && String(r.__category) !== String(category)) return false;
        if (modality !== "All" && String(r.__modality) !== String(modality)) return false;
        if (status !== "All" && String(r.__status) !== String(status)) return false;

        if (!query) return true;

        const haystack = [
          r.__id,
          r.__text,
          r.source,
          r.page,
          r.__category,
          r.__modality,
          r.__status,
        ]
          .map((x) => (x === null || x === undefined ? "" : String(x)))
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
  }, [requirements, q, category, modality, status]);

  async function generateActionsFor(reqId) {
    if (reqId === null || reqId === undefined) return;
    if (hasGeneratedActions(actions, reqId)) return;

    setActionBusyId(reqId);
    setActionMsg("");

    try {
      const resp = await api.createActionsForRequirement(reqId, {});
      const data = resp?.data ?? resp ?? {};

      if (data?.already_present) {
        setActionMsg(data?.message || `Actions already exist for Requirement ${reqId}.`);
      } else {
        setActionMsg(data?.message || `Actions generated for Requirement ${reqId}.`);
      }

      const actionData = api.listActions ? await api.listActions() : [];
      setActions(safeArray(actionData));
      await loadDetail(reqId, { force: true });
    } catch (e) {
      setActionMsg(`Error: ${e?.message || String(e)}`);
    } finally {
      setActionBusyId(null);
    }
  }

  function handleSelectRequirement(reqId) {
    if (reqId === null || reqId === undefined) return;
    if (String(reqId) === String(selectedId)) return;
    lastLoadedDetailIdRef.current = null;
    setSelectedId(reqId);
  }

  async function handleRefresh() {
    lastLoadedDetailIdRef.current = null;
    await loadRequirements({ preserveSelection: true });
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1680,
          display: "grid",
          gridTemplateRows: "auto auto auto minmax(0, 1fr)",
          gap: 16,
          minHeight: "calc(100vh - 32px)",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 20,
          boxSizing: "border-box",
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              Compliance Register
            </h2>

            <div style={{ color: "#4b5563", lineHeight: 1.6 }}>
              Requirements extracted from regulations, mapped to evidence and remediation actions.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Button onClick={handleRefresh} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "minmax(320px, 2fr) repeat(3, minmax(180px, 1fr))",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#111827" }}>
            <span>Search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search text, category, modality, source..."
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                color: "#111827",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#111827" }}>
            <span>Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#111827",
                outline: "none",
              }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#111827" }}>
            <span>Modality</span>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#111827",
                outline: "none",
              }}
            >
              {modalities.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#111827" }}>
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#111827",
                outline: "none",
              }}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ minHeight: 0 }}>
          {error && (
            <div
              style={{
                color: "#991b1b",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 12,
                padding: 12,
              }}
            >
              Error: {error}
            </div>
          )}

          {actionMsg && (
            <div
              style={{
                marginTop: error ? 10 : 0,
                color: actionMsg.startsWith("Error:") ? "#991b1b" : "#065f46",
                background: actionMsg.startsWith("Error:") ? "#fef2f2" : "#ecfdf5",
                border: actionMsg.startsWith("Error:")
                  ? "1px solid #fecaca"
                  : "1px solid #a7f3d0",
                borderRadius: 12,
                padding: 12,
                whiteSpace: "pre-wrap",
              }}
            >
              {actionMsg}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.8fr) minmax(360px, 1fr)",
            gap: 16,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: 14,
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 900, color: "#111827" }}>
                Requirements ({filtered.length})
              </div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                Click a row to view details
              </div>
            </div>

            <div
              style={{
                overflowX: "auto",
                overflowY: "auto",
                minHeight: 0,
                flex: 1,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                    <th style={{ padding: "12px 14px", borderBottom: "1px solid #f0f0f0" }}>ID</th>
                    <th style={{ padding: "12px 14px", borderBottom: "1px solid #f0f0f0" }}>
                      Requirement
                    </th>
                    <th style={{ padding: "12px 14px", borderBottom: "1px solid #f0f0f0" }}>Tags</th>
                    <th style={{ padding: "12px 14px", borderBottom: "1px solid #f0f0f0" }}>
                      Evidence
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((r, idx) => {
                    const rid = r.__id;
                    const isSelected =
                      selectedId !== null && String(selectedId) === String(rid);

                    const actionExists = hasGeneratedActions(actions, rid);
                    const shortText = (r.__text || "").trim();
                    const displayText =
                      shortText.length > 160
                        ? `${shortText.slice(0, 160)}...`
                        : shortText || "No requirement text";

                    return (
                      <tr
                        key={rid ?? idx}
                        onClick={() => handleSelectRequirement(rid)}
                        style={{
                          cursor: rid === null || rid === undefined ? "default" : "pointer",
                          background: isSelected ? "#f8fbff" : "#ffffff",
                          boxShadow: isSelected ? "inset 3px 0 0 #111827" : "none",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #f3f4f6",
                            verticalAlign: "top",
                          }}
                        >
                          <Pill tone={actionExists ? "success" : "default"}>
                            {rid ?? "N/A"}
                          </Pill>
                        </td>

                        <td
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #f3f4f6",
                            verticalAlign: "top",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              marginBottom: 6,
                              lineHeight: 1.45,
                              color: "#111827",
                              wordBreak: "break-word",
                            }}
                          >
                            {displayText}
                          </div>

                          {(r.source || r.page) && (
                            <div
                              style={{
                                color: "#6b7280",
                                fontSize: 12,
                                wordBreak: "break-word",
                              }}
                            >
                              {r.source ? `Source: ${r.source}` : ""}
                              {r.source && r.page ? " • " : ""}
                              {r.page ? `Page: ${r.page}` : ""}
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #f3f4f6",
                            verticalAlign: "top",
                          }}
                        >
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {r.__category && <Pill>{r.__category}</Pill>}
                            {r.__modality && <Pill>{r.__modality}</Pill>}
                            {r.__status && <Pill>{r.__status}</Pill>}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #f3f4f6",
                            verticalAlign: "top",
                          }}
                        >
                          <Pill tone="subtle">{toEvidenceCount(r)} refs</Pill>
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          padding: 18,
                          color: "#6b7280",
                        }}
                      >
                        No requirements match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 16,
              display: "grid",
              gap: 10,
              minHeight: 0,
              overflowY: "auto",
            }}
          >
            <div style={{ fontWeight: 900, color: "#111827" }}>Requirement Details</div>

            <RequirementDetailsPanel
              detail={detail}
              loading={detailLoading}
              error={detailError}
              onReload={() => {
                lastLoadedDetailIdRef.current = null;
                loadDetail(selectedId, { force: true });
              }}
              onGenerateActions={() => generateActionsFor(selectedId)}
              actionsBusy={actionBusyId === selectedId}
              disableGenerate={selectedHasActions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
