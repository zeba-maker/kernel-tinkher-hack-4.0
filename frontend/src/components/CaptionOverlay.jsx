function CaptionOverlay({ caption }) {
  return (
    <div
      style={{
        marginTop: "20px",
        padding: "15px",
        backgroundColor: "#f2f2f2",
        fontSize: "22px",
        minHeight: "50px",
      }}
    >
      <strong>Live Caption:</strong> {caption}
    </div>
  );
}

export default CaptionOverlay;
