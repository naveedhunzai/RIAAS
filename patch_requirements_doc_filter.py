from pathlib import Path
import re
import sys

path = Path(r"./frontend/src/pages/Requirements.jsx")
text = path.read_text(encoding="utf-8")

original = text

# ------------------------------------------------------------
# 1) Add selectedSources state
# ------------------------------------------------------------
old = '  const [q, setQ] = useState("");\n  const [category, setCategory] = useState("All");\n  const [modality, setModality] = useState("All");\n  const [status, setStatus] = useState("All");\n'
new = '  const [q, setQ] = useState("");\n  const [category, setCategory] = useState("All");\n  const [modality, setModality] = useState("All");\n  const [status, setStatus] = useState("All");\n  const [selectedSources, setSelectedSources] = useState([]);\n'
if old in text and 'selectedSources' not in text:
    text = text.replace(old, new, 1)

# ------------------------------------------------------------
# 2) Add sourceOptions useMemo after statuses useMemo
# ------------------------------------------------------------
status_block = '''  const statuses = useMemo(() => {
    const set = new Set();
    requirements.forEach((r) => {
      const v = toStatus(r);
      if (v) set.add(String(v));
    });
    return ["All", ...Array.from(set).sort()];
  }, [requirements]);

  const selectedHasActions = useMemo(() => {'''

insert_block = '''  const statuses = useMemo(() => {
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

if status_block in text and 'const sourceOptions = useMemo(() =>' not in text:
    text = text.replace(status_block, insert_block, 1)

# ------------------------------------------------------------
# 3) Add toggleSourceSelection helper before generateActionsFor
# ------------------------------------------------------------
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
if old in text and 'function toggleSourceSelection(source)' not in text:
    text = text.replace(old, new, 1)

# ------------------------------------------------------------
# 4) Add source filter into filtered useMemo
# ------------------------------------------------------------
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
if old in text:
    text = text.replace(old, new, 1)

# ------------------------------------------------------------
# 5) Expand filter grid from 4 to 5 columns
# ------------------------------------------------------------
text = text.replace(
    'gridTemplateColumns: "minmax(320px, 2fr) repeat(3, minmax(180px, 1fr))",',
    'gridTemplateColumns: "minmax(320px, 2fr) repeat(4, minmax(180px, 1fr))",'
)

# ------------------------------------------------------------
# 6) Insert Documents dropdown after Status filter block
# ------------------------------------------------------------
status_label_pattern = re.compile(
    r'''(\s*<label style=\{\{ display: "grid", gap: 6, fontWeight: 700, color: "#111827" \}\}>\s*
            <span>Status</span>\s*
            <select[\s\S]*?</select>\s*
          </label>)''',
    re.VERBOSE
)

documents_block = r'''\1

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
                  listStyle: "none",
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
          </label>'''

if 'Documents</span>' not in text:
    text, n = status_label_pattern.subn(documents_block, text, count=1)
    if n == 0:
        print("PATCH_ERROR: Could not insert Documents filter block.")
        sys.exit(1)

if text == original:
    print("PATCH_ERROR: No changes were applied.")
    sys.exit(1)

path.write_text(text, encoding="utf-8")
print("PATCH_OK")
