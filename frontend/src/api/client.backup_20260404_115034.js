const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(path, { method = "GET", body, headers } = {}) {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
  const isString = typeof body === "string";

  const finalHeaders = { ...(headers || {}) };

  // Only default to JSON when we're actually sending JSON.
  if (!isFormData && !isBlob) {
    if (!("Content-Type" in finalHeaders)) {
      finalHeaders["Content-Type"] = "application/json";
    }
  }

  const finalBody =
    body === undefined
      ? undefined
      : isFormData || isBlob
        ? body
        : isString
          ? body
          : JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: finalBody,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      typeof data === "string" ? data : (data?.detail || res.statusText);
    throw new Error(`API ${method} ${path} failed (${res.status}): ${msg}`);
  }

  return data;
}

function qs(paramsObj = {}) {
  const params = new URLSearchParams();
  Object.entries(paramsObj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const api = {
  uploadFiles: async (formData) => {
    const response = await fetch("http://127.0.0.1:8000/upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      let message = "Upload failed.";
      try {
        const data = await response.json();
        message = data?.detail || data?.message || message;
      } catch {
        try {
          const text = await response.text();
          if (text) message = text;
        } catch {}
      }
      throw new Error(message);
    }

    return response.json();
  },
  // low-level
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),

  /**
   * Ingestion
   * Typical payload is JSON (e.g., { paths: [...] } or similar),
   * but request() also supports FormData/Blob if you later switch.
   */
  ingest: (payload) =>
    request(`/ingest`, { method: "POST", body: payload }),

  // Some pages may call this alternate name
  ingestDocs: (payload) =>
    request(`/ingest`, { method: "POST", body: payload }),

  // New Addition
  listIngestedDocuments: (limit = 200) =>
    request(`/ingested-documents${qs({ limit })}`),

  // requirements
  listRequirements: ({ q = "", modality = "", category = "" } = {}) =>
    request(`/requirements${qs({ q, modality, category })}`),

  getRequirement: (id) =>
    request(`/requirements/${id}`),

  // actions
  listActions: ({ q = "", status = "", requirement_id = "" } = {}) =>
    request(`/actions${qs({ q, status, requirement_id })}`),

  getAction: (id) =>
    request(`/actions/${id}`),

  updateAction: (actionId, payload) =>
    request(`/actions/${actionId}`, { method: "PATCH", body: payload }),

  createActionForRequirement: (reqId, payload = {}) =>
    request(`/requirements/${reqId}/actions`, { method: "POST", body: payload }),

  // Backward/alternate naming used by some pages
  createActionsForRequirement: (reqId, payload = {}) =>
    request(`/requirements/${reqId}/actions`, { method: "POST", body: payload }),
};

export { API_BASE };

