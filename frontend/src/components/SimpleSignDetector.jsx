import { useEffect, useRef } from "react";

function SimpleSignDetector({ sendCaption }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (error) {
        console.error("Sign camera error:", error);
      }
    };

    startCamera();
  }, []);

  // VERY SIMPLE MOCK SIGN DETECTION
  // (Replace later with real AI model)
  useEffect(() => {
    const interval = setInterval(() => {
      // Random test detection (for checking if working)
      const signs = ["YES", "NO", "HELLO", "THANK YOU", ""];
      const randomSign = signs[Math.floor(Math.random() * signs.length)];

      if (randomSign !== "") {
        sendCaption(randomSign);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sendCaption]);

  return (
    <div>
      <h3>Sign Detection Camera</h3>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "250px", marginTop: "20px", borderRadius: "10px" }}
      />
    </div>
  );
}

export default SimpleSignDetector;
