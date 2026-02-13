function CaptionOverlay({ caption }) {
  return (
    <div style={{
      position: "absolute",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "90%",
      background: "rgba(0, 0, 0, 0.6)",
      color: "#fff",
      padding: "12px 18px",
      borderRadius: "10px",
      fontSize: "20px",
      textAlign: "center",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
    }}>
      <strong style={{ marginRight: 8 }}>Live Caption:</strong>
      <span>{caption || "Waiting for speech..."}</span>
    </div>
  );
}

export default CaptionOverlay;