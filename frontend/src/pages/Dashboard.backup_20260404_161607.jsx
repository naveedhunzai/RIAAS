import { useEffect, useMemo, useState } from "react";

const pageStyle = {
  display: "grid",
  gap: 12,
  width: "100%",
  minWidth: 0
};

const heroStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap"
};

const topGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  width: "100%",
  minWidth: 0
};

const midGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(320px, 1fr)",
  gap: 10,
  width: "100%",
  minWidth: 0,
  alignItems: "start"
};

const bottomGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 10,
  width: "100%",
  minWidth: 0,
  alignItems: "start"
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  minWidth: 0
};

const titleStyle = {
  margin: 0,
  fontSize: 24,
  color: "#111827",
  fontWeight: 800
};

const subtitleStyle = {
  margin: "8px 0 0 0",
  color: "#6b7280",
  fontSize: 14
};

const statValueStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: "#111827",
  margin: "8px 0 4px 0"
};

const statLabelStyle = {
  fontSize: 14,
  color: "#6b7280"
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: "#111827"
};

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "12px 0",
  borderBottom: "1px solid #f3f4f6",
  fontSize: 14,
  color: "#374151"
};

const buttonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600
};

const pillBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  border: "1px solid transparent",
  flexShrink: 0
};

const scrollListStyle = {
  maxHeight: 260,
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: 6
};

function getStatusPillStyle(status) {
  const value = (status || "").trim().toLowerCase();

  if (value === "open") {
    return {
      ...pillBaseStyle,
      background: "#fef2f2",
      color: "#b91c1c",
      borderColor: "#fecaca"
    };
  }

  if (value === "in progress") {
    return {
      ...pillBaseStyle,
      background: "#eff6ff",
      color: "#1d4ed8",
      borderColor: "#bfdbfe"
    };
  }

  if (value === "done") {
    return {
      ...pillBaseStyle,
      background: "#ecfdf5",
      color: "#047857",
      borderColor: "#a7f3d0"
    };
  }

  return {
    ...pillBaseStyle,
    background: "#f3f4f6",
    color: "#374151",
    borderColor: "#e5e7eb"
  };
}

function getDocPillStyle(isActive) {
  return {
    ...pillBaseStyle,
    background: isActive ? "#ecfdf5" : "#f3f4f6",
    color: isActive ? "#047857" : "#4b5563",
    borderColor: isActive ? "#a7f3d0" : "#e5e7eb"
  };
}

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [actions, setActions] = useState([]);
  const [health, setHealth] = useState({
    backend: "Checking...",
    vector_db: "Checking...",
    database: "Checking..."
  });
  const [loading, setLoading] = useState(true);

  const api = "http://127.0.0.1:8000";

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [docsRes, reqRes, actRes, healthRes] = await Promise.all([
        fetch(`${api}/ingested-documents?limit=300`),
        fetch(`${api}/requirements?limit=1000&offset=0`),
        fetch(`${api}/actions?limit=1000`),
        fetch(`${api}/health`)
      ]);

      const docsData = docsRes.ok ? await docsRes.json() : { items: [] };
      const reqData = reqRes.ok ? await reqRes.json() : { items: [] };
      const actData = actRes.ok ? await actRes.json() : { items: [] };
      const healthData = healthRes.ok
        ? await healthRes.json()
        : { backend: "Unavailable", vector_db: "Unavailable", database: "Unavailable" };

      setDocuments(Array.isArray(docsData.items) ? docsData.items : []);
      setRequirements(Array.isArray(reqData.items) ? reqData.items : []);
      setActions(Array.isArray(actData.items) ? actData.items : []);
      setHealth(healthData || {});
    } catch (error) {
      console.error("Dashboard load failed:", error);
      setDocuments([]);
      setRequirements([]);
      setActions([]);
      setHealth({
        backend: "Unavailable",
        vector_db: "Unavailable",
        database: "Unavailable"
      });
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const open = actions.filter((a) => (a.status || "").trim() === "Open").length;
    const inProgress = actions.filter((a) => (a.status || "").trim() === "In Progress").length;
    const done = actions.filter((a) => (a.status || "").trim() === "Done").length;
    const activeDocuments = documents.filter((d) => (d.is_active ?? 1) === 1).length;

    return {
      totalDocuments: documents.length,
      activeDocuments,
      totalRequirements: requirements.length,
      totalActions: actions.length,
      open,
      inProgress,
      done
    };
  }, [documents, requirements, actions]);

  const requirementSourceMap = useMemo(() => {
    const map = {};
    requirements.forEach((r) => {
      const source = r.source || "Unknown";
      map[source] = (map[source] || 0) + 1;
    });
    return map;
  }, [requirements]);

  const actionRequirementMap = useMemo(() => {
    const map = {};
    actions.forEach((a) => {
      const key = a.requirement_id;
      if (key !== null && key !== undefined) {
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [actions]);

  const topDocuments = useMemo(() => {
    const docMap = {};

    documents.forEach((doc) => {
      const fileName = doc.file_name || "Unknown";
      docMap[fileName] = {
        file_name: fileName,
        is_active: (doc.is_active ?? 1) === 1,
        ingested_at: doc.ingested_at || "",
        requirements: requirementSourceMap[fileName] || 0,
        actions: 0
      };
    });

    requirements.forEach((r) => {
      const source = r.source || "Unknown";
      if (!docMap[source]) {
        docMap[source] = {
          file_name: source,
          is_active: true,
          ingested_at: "",
          requirements: requirementSourceMap[source] || 0,
          actions: 0
        };
      }

      docMap[source].actions += actionRequirementMap[r.id] || 0;
    });

    return Object.values(docMap)
      .sort((a, b) => {
        const scoreA = (a.requirements || 0) + (a.actions || 0);
        const scoreB = (b.requirements || 0) + (b.actions || 0);
        return scoreB - scoreA;
      })
      .slice(0, 8);
  }, [documents, requirements, actionRequirementMap, requirementSourceMap]);

  const recentDocuments = useMemo(() => {
    return [...documents].slice(0, 6);
  }, [documents]);

  const actionStatusCards = [
    {
      label: "Open",
      value: metrics.open,
      bg: "#fef2f2",
      border: "#fecaca",
      color: "#b91c1c"
    },
    {
      label: "In Progress",
      value: metrics.inProgress,
      bg: "#eff6ff",
      border: "#bfdbfe",
      color: "#1d4ed8"
    },
    {
      label: "Done",
      value: metrics.done,
      bg: "#ecfdf5",
      border: "#a7f3d0",
      color: "#047857"
    }
  ];

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <h2 style={titleStyle}>Dashboard</h2>
          <p style={subtitleStyle}>
            Compliance intelligence overview across documents, requirements, actions, and system health.
          </p>
        </div>

        <button onClick={loadDashboard} style={buttonStyle}>
          {loading ? "Refreshing..." : "Refresh Dashboard"}
        </button>
      </div>

      <div style={topGridStyle}>
        <div style={cardStyle}>
          <div style={statLabelStyle}>Tracked Documents</div>
          <div style={statValueStyle}>{loading ? "..." : metrics.totalDocuments}</div>
          <div style={statLabelStyle}>All documents in ingestion registry</div>
        </div>

        <div style={cardStyle}>
          <div style={statLabelStyle}>Extracted Requirements</div>
          <div style={statValueStyle}>{loading ? "..." : metrics.totalRequirements}</div>
          <div style={statLabelStyle}>Compliance obligations identified</div>
        </div>

        <div style={cardStyle}>
          <div style={statLabelStyle}>Generated Actions</div>
          <div style={statValueStyle}>{loading ? "..." : metrics.totalActions}</div>
          <div style={statLabelStyle}>Follow-up and remediation tasks</div>
        </div>

        <div style={cardStyle}>
          <div style={statLabelStyle}>Active Documents</div>
          <div style={statValueStyle}>{loading ? "..." : metrics.activeDocuments}</div>
          <div style={statLabelStyle}>Currently active and available</div>
        </div>
      </div>

      <div style={topGridStyle}>
        {actionStatusCards.map((card) => (
          <div
            key={card.label}
            style={{
              ...cardStyle,
              background: card.bg,
              borderColor: card.border
            }}
          >
            <div style={{ ...statLabelStyle, color: card.color }}>{card.label}</div>
            <div style={{ ...statValueStyle, color: card.color }}>
              {loading ? "..." : card.value}
            </div>
            <div style={{ ...statLabelStyle, color: card.color }}>
              Action items in this status
            </div>
          </div>
        ))}
      </div>

      <div style={midGridStyle}>
        <div style={cardStyle}>
          <h3 style={{ ...sectionTitleStyle, marginBottom: 16 }}>Top Source Documents</h3>

          {topDocuments.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>No document metrics available.</div>
          ) : (
            <div style={scrollListStyle}>
              {topDocuments.map((doc, index) => (
                <div
                  key={`${doc.file_name}-${index}`}
                  style={{
                    ...rowStyle,
                    borderBottom: index === topDocuments.length - 1 ? "none" : rowStyle.borderBottom
                  }}
                >
                  <div style={{ display: "grid", gap: 4, minWidth: 0, flex: 1 }}>
                    <strong style={{ color: "#111827", wordBreak: "break-word" }}>
                      {doc.file_name}
                    </strong>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      Requirements: {doc.requirements || 0} | Actions: {doc.actions || 0}
                    </span>
                  </div>

                  <span style={getDocPillStyle(doc.is_active)}>
                    {doc.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <div style={cardStyle}>
            <h3 style={{ ...sectionTitleStyle, marginBottom: 16 }}>System Status</h3>

            <div style={rowStyle}>
              <span>Backend</span>
              <strong>{health.backend || "Unknown"}</strong>
            </div>
            <div style={rowStyle}>
              <span>Vector DB</span>
              <strong>{health.vector_db || "Unknown"}</strong>
            </div>
            <div style={{ ...rowStyle, borderBottom: "none" }}>
              <span>Database</span>
              <strong>{health.database || "Unknown"}</strong>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ ...sectionTitleStyle, marginBottom: 16 }}>Quick Summary</h3>

            <div style={rowStyle}>
              <span>Documents with requirements</span>
              <strong>
                {Object.keys(requirementSourceMap).filter((k) => k && k !== "Unknown").length}
              </strong>
            </div>
            <div style={rowStyle}>
              <span>Requirements with actions</span>
              <strong>{Object.keys(actionRequirementMap).length}</strong>
            </div>
            <div style={{ ...rowStyle, borderBottom: "none" }}>
              <span>Action completion rate</span>
              <strong>
                {metrics.totalActions > 0
                  ? `${Math.round((metrics.done / metrics.totalActions) * 100)}%`
                  : "0%"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div style={bottomGridStyle}>
        <div style={cardStyle}>
          <h3 style={{ ...sectionTitleStyle, marginBottom: 16 }}>Recent Documents</h3>

          {recentDocuments.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>No recent documents found.</div>
          ) : (
            <div style={scrollListStyle}>
              {recentDocuments.map((doc, index) => (
                <div
                  key={doc.id || `${doc.file_name}-${index}`}
                  style={{
                    ...rowStyle,
                    borderBottom: index === recentDocuments.length - 1 ? "none" : rowStyle.borderBottom
                  }}
                >
                  <div style={{ display: "grid", gap: 4, minWidth: 0, flex: 1 }}>
                    <strong style={{ color: "#111827", wordBreak: "break-word" }}>
                      {doc.file_name || "Unnamed document"}
                    </strong>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {doc.ingested_at || doc.status || "Tracked document"}
                    </span>
                  </div>

                  <span style={getDocPillStyle((doc.is_active ?? 1) === 1)}>
                    {(doc.is_active ?? 1) === 1 ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={{ ...sectionTitleStyle, marginBottom: 16 }}>Action Status Detail</h3>

          <div style={rowStyle}>
            <span>Open</span>
            <span style={getStatusPillStyle("Open")}>{metrics.open}</span>
          </div>
          <div style={rowStyle}>
            <span>In Progress</span>
            <span style={getStatusPillStyle("In Progress")}>{metrics.inProgress}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span>Done</span>
            <span style={getStatusPillStyle("Done")}>{metrics.done}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

