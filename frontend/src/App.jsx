import { useState } from "react";
import VideoCall from "./components/VideoCall";
import CaptionOverlay from "./components/CaptionOverlay";
<<<<<<< HEAD
=======
import SignDetector from "./components/SignDetector";
>>>>>>> 53a07e5a1de202de822f9439440894bfe65a1fce

function App() {
  const [caption, setCaption] = useState("");

  return (
<<<<<<< HEAD
    <div style={{ textAlign: "center" }}>
      <h1>Mini Meet Clone</h1>

      <VideoCall sendCaption={setCaption} />

=======
    <div>
      <VideoCall setCaption={setCaption} />
>>>>>>> 53a07e5a1de202de822f9439440894bfe65a1fce
      <CaptionOverlay caption={caption} />
      <SignDetector />
    </div>
  );
}

export default App;