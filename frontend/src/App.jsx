import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import VideoCall from "./components/VideoCall";
import CaptionOverlay from "./components/CaptionOverlay";

const socket = io("http://localhost:5000");

function App() {
  const [caption, setCaption] = useState("");

  useEffect(() => {
    socket.on("receive-caption", (data) => {
      setCaption(data);
    });
  }, []);

  const sendCaption = (text) => {
    setCaption(text);
    socket.emit("send-caption", text);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Sign Language Video Chat</h1>
      <VideoCall sendCaption={sendCaption} />
      <CaptionOverlay caption={caption} />
    </div>
  );
}

export default App;
