const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = data?.detail || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  // GET /ask (your API)
  ask: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/ask?${qs}`, { method: "GET" });
  },

  // POST /answer
  answer: (payload) =>
  request("/answer", {
    method: "POST",
    body: JSON.stringify({
      question: payload.question ?? payload.topic ?? "",
      model: payload.model ?? "gemma3:1b",
      top_k: Number(payload.top_k ?? payload.topK ?? 5),
    }),
  }),
  // POST /ingest
  ingest: (payload) =>
    request("/ingest", { method: "POST", body: JSON.stringify(payload) }),

  // POST /extract-requirements
  extractRequirements: (payload) =>
    request("/extract-requirements", { method: "POST", body: JSON.stringify(payload) }),

  // requirements
  listRequirements: () => request("/requirements", { method: "GET" }),
  getRequirement: (reqId) => request(`/requirements/${reqId}`, { method: "GET" }),

  // actions
  listActions: () => request("/actions", { method: "GET" }),
  createActionsForRequirement: (reqId, payload) =>
    request(`/requirements/${reqId}/actions`, { method: "POST", body: JSON.stringify(payload) }),

  updateActionStatus: (actionId, status) =>
    request(`/actions/${actionId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
