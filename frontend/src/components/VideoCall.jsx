import { useEffect, useRef } from "react";

function VideoCall({ sendCaption }) {
  const videoRef = useRef(null);

  useEffect(() => {
    // 🎥 Camera
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
      });

    // 🎤 Speech to Text
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript =
          event.results[event.results.length - 1][0].transcript;
        sendCaption(transcript);
      };

      recognition.start();
    }
  }, []);

  // ✋ Dummy Sign Detection Button (Hackathon Demo)
  const handleSignClick = () => {
    sendCaption("HELLO (Detected Sign)");
  };

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        width="500"
        style={{ border: "2px solid black" }}
      />
      <br />
      <button onClick={handleSignClick} style={{ marginTop: "10px" }}>
        Simulate Sign Detection
      </button>
    </div>
  );
}

export default VideoCall;
