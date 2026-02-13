import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function VideoCall({ setCaption }) {
  const videoRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    }).then(stream => {
      videoRef.current.srcObject = stream;
    });

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const text = event.results[event.results.length - 1][0].transcript;
      setCaption(text);
      socket.emit("caption", text);
    };
    recognition.start();

    socket.on("caption", (text) => {
      setCaption(text);
    });

  }, []);

  return (
    <video ref={videoRef} autoPlay playsInline width="600" />
  );
}

export default VideoCall;