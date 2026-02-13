import { useState } from "react";
import VideoCall from "./components/VideoCall";
import CaptionOverlay from "./components/CaptionOverlay";

function App() {
  const [caption, setCaption] = useState("");

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Kernel Meet</h1>

      <VideoCall sendCaption={setCaption} caption={caption} />
    </div>
  );
}

export default App;