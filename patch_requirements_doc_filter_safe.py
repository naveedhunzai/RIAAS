from pathlib import Path
import sys

path = Path(r"./frontend/src/pages/Requirements.jsx")
text = path.read_text(encoding="utf-8")
original = text

def must_replace_once(src: str, old: str, new: str, label: str):
    if old not in src:
        print(f"PATCH_ERROR: Could not find block for {label}.")
        sys.exit(1)
    return src.replace(old, new, 1)

# ------------------------------------------------------------
# 1) Add selectedSources state
# ------------------------------------------------------------
if 'const [selectedSources, setSelectedSources] = useState([]);' not in text:
    old = '''  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [modality, setModality] = useState("All");
  const [status, setStatus] = useState("All");
'''
    new = '''  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [modality, setModality] = useState("All");
  const [status, setStatus] = useState("All");
  const [selectedSources, setSelectedSources] = useState([]);
'''
    text = must_replace_once(text, old, new, "selectedSources state")

# ------------------------------------------------------------
# 2) Add sourceOptions useMemo
# ------------------------------------------------------------
if 'const sourceOptions = useMemo(() => {' not in text:
    old = '''  const statuses = useMemo(() => {
    const set = new Set();
    requirements.forEach((r) => {
      const v = toStatus(r);
      if (v) set.add(String(v));
    });
    return ["All", ...Array.from(set).sort()];
  }, [requirements]);

  const selectedHasActions = useMemo(() => {'''
    new = '''  const statuses = useMemo(() => {
    const set = new Set();
    requirements.forEach((r) => {
      const v = toStatus(r);
      if (v) set.add(String(v));
    });
    return ["All", ...Array.from(set).sort()];
  }, [requirements]);

  const sourceOptions = useMemo(() => {
    const set = new Set();
    requirements.forEach((r) => {
      const v = r?.source;
      if (v) set.add(String(v));
    });
    return Array.from(set).sort();
  }, [requirements]);

  const selectedHasActions = useMemo(() => {'''
    text = must_replace_once(text, old, new, "sourceOptions useMemo")

# ------------------------------------------------------------
# 3) Add selectedSources to filtered deps + helper
# ------------------------------------------------------------
if 'function toggleSourceSelection(source)' not in text:
    old = '''  }, [requirements, q, category, modality, status]);

  async function generateActionsFor(reqId) {'''
    new = '''  }, [requirements, q, category, modality, status, selectedSources]);

  function toggleSourceSelection(source) {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  }

  async function generateActionsFor(reqId) {'''
    text = must_replace_once(text, old, new, "toggleSourceSelection helper")

# ------------------------------------------------------------
# 4) Add source filtering
# ------------------------------------------------------------
if 'selectedSources.length > 0 && !selectedSources.includes(rowSource)' not in text:
    old = '''      .filter((r) => {
        if (category !== "All" && String(r.__category) !== String(category)) return false;
        if (modality !== "All" && String(r.__modality) !== String(modality)) return false;
        if (status !== "All" && String(r.__status) !== String(status)) return false;

        if (!query) return true;'''
    new = '''      .filter((r) => {
        if (category !== "All" && String(r.__category) !== String(category)) return false;
        if (modality !== "All" && String(r.__modality) !== String(modality)) return false;
        if (status !== "All" && String(r.__status) !== String(status)) return false;

        const rowSource = r.source === null || r.source === undefined ? "" : String(r.source);
        if (selectedSources.length > 0 && !selectedSources.includes(rowSource)) return false;

        if (!query) return true;'''
    text = must_replace_once(text, old, new, "source filter logic")

# ------------------------------------------------------------
# 5) Expand filter grid columns
# ------------------------------------------------------------
text = text.replace(
    'gridTemplateColumns: "minmax(320px, 2fr) repeat(3, minmax(180px, 1fr))",',
    'gridTemplateColumns: "minmax(320px, 2fr) repeat(4, minmax(180px, 1fr))",'
)

# ------------------------------------------------------------
# 6) Insert Documents filter block before the filter-grid closing </div>
#    We anchor on the Status block ending followed by the grid closing.
# ------------------------------------------------------------
if 'Documents</span>' not in text:
    anchor = '''          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#111827" }}>
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#111827",
              }}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>'''
    replacement = '''          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#111827" }}>
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#111827",
              }}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#111827" }}>
            <span>Documents</span>
            <details
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 12,
                background: "#ffffff",
                padding: "10px 12px",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 500,
                  color: "#111827",
                }}
              >
                {selectedSources.length > 0
                  ? `${selectedSources.length} selected`
                  : "All documents"}
              </summary>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gap: 8,
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {sourceOptions.length === 0 && (
                  <div style={{ color: "#6b7280", fontWeight: 400 }}>
                    No documents available
                  </div>
                )}

                {sourceOptions.map((source) => (
                  <label
                    key={source}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontWeight: 500,
                      color: "#111827",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSources.includes(source)}
                      onChange={() => toggleSourceSelection(source)}
                    />
                    <span>{source}</span>
                  </label>
                ))}

                {sourceOptions.length > 0 && (
                  <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedSources(sourceOptions);
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Select all
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedSources([]);
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </details>
          </label>
        </div>'''
    text = must_replace_once(text, anchor, replacement, "Documents filter block")

if text == original:
    print("PATCH_ERROR: No changes were applied.")
    sys.exit(1)

path.write_text(text, encoding="utf-8")
print("PATCH_OK")
