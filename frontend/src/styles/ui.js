export const buttonBase = {
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

export const primaryButton = {
  ...buttonBase,
  background: "#111827",
  color: "#fff",
  border: "1px solid #111827",
};

export const secondaryButton = {
  ...buttonBase,
  background: "#fff",
  color: "#111827",
};

export const subtleButton = {
  ...buttonBase,
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #e2e8f0",
};

export const disabledButton = {
  opacity: 0.5,
  cursor: "not-allowed",
};
