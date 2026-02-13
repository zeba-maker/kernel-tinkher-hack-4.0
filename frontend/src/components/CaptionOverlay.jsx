function CaptionOverlay({ caption }) {
  return (
    <div style={{
      position: "absolute",
      bottom: 20,
      left: "50%",
      transform: "translateX(-50%)",
      background: "black",
      color: "white",
      padding: "10px",
      borderRadius: "8px"
    }}>
      {caption}
    </div>
  );
}

export default CaptionOverlay;