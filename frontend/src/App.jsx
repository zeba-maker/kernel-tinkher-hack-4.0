import { useState } from "react";
import VideoCall from "./components/VideoCall";
import CaptionOverlay from "./components/CaptionOverlay";

function App() {
  const [caption, setCaption] = useState("");

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Mini Meet Clone</h1>

      <VideoCall sendCaption={setCaption} />

      <CaptionOverlay caption={caption} />
    </div>
  );
}

export default App;
