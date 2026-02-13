import { useRef, useState } from "react";
import { detectSign } from "../services/api";

function SignDetector() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [prediction, setPrediction] = useState("");

  const captureAndDetect = async () => {
    const context = canvasRef.current.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, 300, 200);
    const image = canvasRef.current.toDataURL("image/jpeg").split(",")[1];

    const result = await detectSign(image);
    setPrediction(result);
  };

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline width="300"
        ref={(video) => {
          videoRef.current = video;
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => video.srcObject = stream);
        }}
      />
      <canvas ref={canvasRef} width="300" height="200" style={{ display: "none" }} />
      <button onClick={captureAndDetect}>Detect Sign</button>
      <h3>Prediction: {prediction}</h3>
    </div>
  );
}

export default SignDetector;