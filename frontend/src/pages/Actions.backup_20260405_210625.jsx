import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/* TEMP RBAC — replace later with real auth */
function getRole() {
  return (localStorage.getItem("role") || "viewer").toLowerCase();
}
function canEdit(role) {
  return ["admin", "editor", "manager"].includes(role);
}

/* API */
async function listActions({ q = "", status = "" } = {}) {
  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (status) params.append("status", status);

  const qs = params.toString();
  const url = API_BASE + "/actions" + (qs ? "?" + qs : "");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load actions");
  return res.json();
}

async function updateAction(id, payload) {
  const res = await fetch(API_BASE + "/actions/" + id, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Update failed");
  return res.json();
}

function normalize(a) {
  const rawSubject =
    a.action_text ??
    a.subject ??
    a.title ??
    a.heading ??
    a.name ??
    a.summary ??
    a.action ??
    a.action_item ??
    a.description ??
    a.details ??
    "";

  const subject =
    String(rawSubject).trim() ||
    (a.requirement_id || a.req_id
      ? `Action for Req ${a.requirement_id ?? a.req_id}`
      : "Untitled Action");

  return {
    id: a.id ?? a.action_id,
    reqId: a.requirement_id ?? a.req_id,
    subject,
    status: a.status ?? a.state ?? "Open",
    owner: a.owner_role ?? a.owner ?? a.assignee ?? "",
    due: a.due_date ?? a.due ?? "",

    // Main panel fields
    createdAt: a.created_at ?? "",
    source: a.source ?? a.source_document ?? a.document ?? "Unknown",
    page: a.page ?? null,

    // Modal “updates” fields (best-effort mapping; won’t break if absent)
    updatedAt: a.updated_at ?? a.last_updated_at ?? a.modified_at ?? "",
    updatedBy: a.updated_by ?? a.last_updated_by ?? a.modified_by ?? "",
    targetDate: a.target_date ?? a.target_due_date ?? a.target ?? a.due_date ?? a.due ?? "",
    evidenceNeeded: a.evidence_needed ?? "",
    priority: a.priority ?? "",
  };
}

function dedupeByRequirement(rows) {
  const map = new Map(); // reqId -> row (keep latest)
  const noReq = [];

  for (const r of rows) {
    if (r.reqId == null || r.reqId === "") {
      noReq.push(r);
      continue;
    }

    const key = String(r.reqId);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, r);
      continue;
    }

    const tNew = Date.parse(r.createdAt || "") || 0;
    const tOld = Date.parse(prev.createdAt || "") || 0;

    if (tNew > tOld) map.set(key, r);
    else if (tNew === tOld && Number(r.id) > Number(prev.id)) map.set(key, r);
  }

  return [...map.values(), ...noReq];
}

function fmtDate(s) {
  if (!s) return "";
  const t = Date.parse(s);
  if (!t) return String(s);
  return new Date(t).toLocaleDateString();
}


const buttonBase = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #d0d7de",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  background: "#fff",
  color: "#111827",
  transition: "all 0.2s ease",
};

const primaryButton = {
  ...buttonBase,
  background: "#111827",
  color: "#fff",
  border: "1px solid #111827",
};

const secondaryButton = {
  ...buttonBase,
  background: "#fff",
  color: "#111827",
};

const subtleButton = {
  ...buttonBase,
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #e2e8f0",
};

const disabledButton = {
  opacity: 0.5,
  cursor: "not-allowed",
};

export default function Actions() {
  const navigate = useNavigate();
  const { actionId } = useParams();
  const [searchParams] = useSearchParams();

  // Supports deep-linking from Requirements:
  //   /actions?req_id=123         (auto-select first action for that requirement)
  //   /actions?action_id=555      (auto-select that action)
  const actionIdFromUrl = searchParams.get("action_id");
  const reqIdFromUrl = searchParams.get("req_id");

  const role = getRole();
  const editable = canEdit(role);

  const [actions, setActions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // Modal open/close (keeps routing intact via action_id)
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Editable fields (existing variable names kept)
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("Open");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");

  // “Updates” fields (added; does not change existing names/paths)
  const [updatedAt, setUpdatedAt] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const rows = useMemo(() => dedupeByRequirement(actions.map(normalize)), [actions]);

  // If coming from Requirements, optionally show only actions for that requirement.
  const visibleRows = useMemo(() => {
    if (!reqIdFromUrl) return rows;
    return rows.filter(r => String(r.reqId) === String(reqIdFromUrl));
  }, [rows, reqIdFromUrl]);

  const selected = useMemo(() => {
    const idCandidate = selectedId || actionId || actionIdFromUrl;
    if (!idCandidate) return null;
    return rows.find(r => String(r.id) === String(idCandidate)) || null;
  }, [rows, selectedId, actionId, actionIdFromUrl]);

  // Owner-edit rule: only owner can edit updates in modal (per your requirement)
  const isOwner = useMemo(() => {
    const selOwner = (selected?.owner ?? "").toString().trim().toLowerCase();
    if (!selOwner) return false;
    return selOwner === role;
  }, [selected?.owner, role]);

  const canOwnerEdit = editable && isOwner;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await listActions();
        const items = Array.isArray(data) ? data : (data.items || []);
        if (cancelled) return;

        setActions(items);

        // Priority 1: explicit action id (route param or query param)
        const explicitActionId = actionId || actionIdFromUrl;
        if (explicitActionId) {
          setSelectedId(explicitActionId);
          // If we deep-link directly to an action, open modal
          setIsModalOpen(true);
          return;
        }

        // Priority 2: coming from requirement id query param
        if (reqIdFromUrl) {
          const norm = items.map(normalize);
          const found = norm.find(a => String(a.reqId) === String(reqIdFromUrl));
          if (found) {
            setSelectedId(found.id);
            navigate("/actions?action_id=" + found.id, { replace: true });
            setIsModalOpen(true);
            return;
          }
        }

        // Priority 3: fallback to first item
        if (items.length) {
          const firstId = items[0].id ?? items[0].action_id;
          setSelectedId(firstId);
        }
      } catch (err) {
        console.error("Failed to load actions", err);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [actionId, actionIdFromUrl, reqIdFromUrl, navigate]);

  useEffect(() => {
    if (!selected) return;

    // Existing fields
    setSubject(selected.subject);
    setStatus(selected.status);
    setOwner(selected.owner);
    setDue(selected.due);

    // Updates fields
    setUpdatedAt(selected.updatedAt || "");
    setUpdatedBy(selected.updatedBy || "");
    setTargetDate(selected.targetDate || selected.due || "");
  }, [selected?.id]);

  function openAction(id) {
    setSelectedId(id);
    navigate("/actions?action_id=" + id);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);

    // Keep filtering behavior; just remove selected action deep link
    if (reqIdFromUrl) navigate("/actions?req_id=" + reqIdFromUrl, { replace: true });
    else navigate("/actions", { replace: true });
  }

  async function save() {
    if (!editable || !selected) return;

    try {
      // If owner is editing, stamp update meta (safe even if backend ignores)
      const nowIso = new Date().toISOString();

      const payload = {
        subject,
        title: subject,
        status,
        owner,
        due_date: due,

        // Updates section (editable only by owner in UI)
        target_date: targetDate,
        updated_at: canOwnerEdit ? nowIso : updatedAt,
        updated_by: canOwnerEdit ? role : updatedBy,
      };

      const updatedAction = await updateAction(selected.id, payload);

      // Keep list in sync (minimal optimistic refresh)
      setActions(prev =>
        prev.map(a => {
          const aId = a.id ?? a.action_id;
          if (String(aId) !== String(selected.id)) return a;
          return { ...a, ...updatedAction };
        })
      );

      // Reflect stamps locally too (even if backend doesn’t return them)
      if (canOwnerEdit) {
        setUpdatedAt(nowIso);
        setUpdatedBy(role);
      }
    } catch (err) {
      console.error("Failed to save action", err);
    }
  }

  return (
    <div style={{ padding: 10 }}>
      {/* MAIN PANEL (LIST) */}
      <div>
        <h2>Actions</h2>

        {reqIdFromUrl && (
          <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.8 }}>
            Showing actions for Requirement ID: <b>{reqIdFromUrl}</b>
            <button
              style={{ ...subtleButton, marginLeft: 10 }}
              onClick={() => navigate("/actions")}
              title="Show all actions"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2.2fr 1.2fr 1fr 0.9fr 0.9fr 0.7fr",
            gap: 10,
            padding: "10px 10px",
            borderBottom: "1px solid #ddd",
            fontSize: 12,
            fontWeight: 700,
            opacity: 0.8,
          }}
        >
          <div>Action</div>
          <div>Source Document</div>
          <div>Owner</div>
          <div>Due Date</div>
          <div>Created</div>
          <div>Status</div>
        </div>

        {visibleRows.map(a => (
          <div
            key={a.id}
            onClick={() => openAction(a.id)}
            style={{
              padding: 10,
              borderBottom: "1px solid #eee",
              cursor: "pointer",
              background: String(a.id) === String(selected?.id) ? "#f6f6f6" : "transparent",
              display: "grid",
              gridTemplateColumns: "2.2fr 1.2fr 1fr 0.9fr 0.9fr 0.7fr",
              gap: 10,
              alignItems: "center",
            }}
            title="Click to open"
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {a.subject}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Req: {a.reqId ?? "—"} {a.page != null ? `• p.${a.page}` : ""}
              </div>
            </div>

            <div style={{ fontSize: 12, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {a.source || "Unknown"}
            </div>

            <div style={{ fontSize: 12 }}>
              {a.owner || "—"}
            </div>

            <div style={{ fontSize: 12 }}>
              {a.due ? fmtDate(a.due) : "—"}
            </div>

            <div style={{ fontSize: 12 }}>
              {a.createdAt ? fmtDate(a.createdAt) : "—"}
            </div>

            <div style={{ fontSize: 12 }}>
              {a.status}
            </div>
          </div>
        ))}

        {!visibleRows.length && (
          <div style={{ padding: 10, opacity: 0.7 }}>
            No actions found{reqIdFromUrl ? " for this requirement." : "."}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && selected && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(920px, 100%)",
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              border: "1px solid #eee",
              maxHeight: "85vh",
              overflow: "auto",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: 14,
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selected.subject}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Action ID: <b>{selected.id}</b>{" "}
                  {selected.reqId != null ? <>• Requirement: <b>{selected.reqId}</b></> : null}{" "}
                  • Source: <b>{selected.source || "Unknown"}</b>
                  {selected.page != null ? <> • p.<b>{selected.page}</b></> : null}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {selected.reqId && (
                  <button
                    style={secondaryButton}
                    onClick={() => navigate("/requirements?req_id=" + selected.reqId)}
                  >
                    Open Requirement
                  </button>
                )}
                <button style={secondaryButton} onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Left: Action core */}
              <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Action Item</div>

                <label>Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  disabled={!editable}
                  style={{ width: "100%", marginBottom: 10 }}
                />

                <label>Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  disabled={!editable}
                  style={{ width: "100%", marginBottom: 10 }}
                >
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Blocked</option>
                  <option>Done</option>
                </select>

                <label>Owner</label>
                <input
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  disabled={!editable}
                  style={{ width: "100%", marginBottom: 10 }}
                />

                <label>Due</label>
                <input
                  type="date"
                  value={due}
                  onChange={e => setDue(e.target.value)}
                  disabled={!editable}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Right: Updates (editable by owner only) */}
              <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Updates</div>

                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
                  Editable by owner only. Your role: <b>{role}</b>. Action owner: <b>{selected.owner || "—"}</b>.
                </div>

                <label>Update Date</label>
                <input
                  value={updatedAt}
                  onChange={e => setUpdatedAt(e.target.value)}
                  disabled={!canOwnerEdit}
                  placeholder="(auto-set on Save)"
                  style={{ width: "100%", marginBottom: 10 }}
                />

                <label>Author</label>
                <input
                  value={updatedBy}
                  onChange={e => setUpdatedBy(e.target.value)}
                  disabled={!canOwnerEdit}
                  placeholder="(auto-set on Save)"
                  style={{ width: "100%", marginBottom: 10 }}
                />

                <label>Target Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  disabled={!canOwnerEdit}
                  style={{ width: "100%", marginBottom: 10 }}
                />

                {/* Optional extra details, kept read-only for now */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>Created</div>
                    <div style={{ fontSize: 12 }}>{selected.createdAt ? fmtDate(selected.createdAt) : "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>Priority</div>
                    <div style={{ fontSize: 12 }}>{selected.priority || "—"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div
              style={{
                padding: 14,
                borderTop: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Source document: <b>{selected.source || "Unknown"}</b>
                {selected.page != null ? <> • page <b>{selected.page}</b></> : null}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={!editable ? { ...primaryButton, ...disabledButton } : primaryButton}
                  onClick={save}
                  disabled={!editable}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
