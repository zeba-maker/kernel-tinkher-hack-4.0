import { useState } from "react";
import VideoCall from "./components/VideoCall";
import CaptionOverlay from "./components/CaptionOverlay";
import SignDetector from "./components/SignDetector";

function App() {
  const [caption, setCaption] = useState("");

  return (
    <div>
      <VideoCall setCaption={setCaption} />
      <CaptionOverlay caption={caption} />
      <SignDetector />
    </div>
  );
}

export default App;