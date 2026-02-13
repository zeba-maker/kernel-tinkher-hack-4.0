function CaptionOverlay({ caption, detectedSign }) {
  return (
    <div style={{
      position: "absolute",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "90%",
      background: "rgba(0, 0, 0, 0.7)",
      color: "#fff",
      padding: "12px 18px",
      borderRadius: "10px",
      fontSize: "18px",
      textAlign: "center",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
    }}>
      <div style={{ marginBottom: "8px" }}>
        <strong style={{ marginRight: 8 }}>Live Caption:</strong>
        <span>{caption || "Waiting for speech..."}</span>
      </div>
      {detectedSign && (
        <div style={{
          paddingTop: "8px",
          borderTop: "1px solid rgba(255,255,255,0.3)",
          fontSize: "16px",
          color: "#a0ff00",
          fontWeight: "bold",
        }}>
          🤟 Sign Detected: <span style={{ fontStyle: "italic" }}>{detectedSign.toUpperCase().replace(/_/g, " ")}</span>
        </div>
      )}
    </div>
  );
}

export default CaptionOverlay;