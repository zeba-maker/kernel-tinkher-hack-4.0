import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import CaptionOverlay from "./CaptionOverlay";
import SignDetector from "./SignDetector";

const socket = io("http://localhost:5000");

function VideoCall({ sendCaption, caption }) {
  const displayVideo = useRef(null);
  const remoteVideo = useRef(null);
  const streamRef = useRef(null);
  const peerConnection = useRef(null);
  const recognitionRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [detectedSign, setDetectedSign] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const detectedSignTimeoutRef = useRef(null);

  function handleCaption(text) {
    sendCaption(text);
    socket.emit("send-caption", { room: "room1", text });
  }

  function handleSignDetection(sign) {
    setDetectedSign(sign);
    if (detectedSignTimeoutRef.current) clearTimeout(detectedSignTimeoutRef.current);
    detectedSignTimeoutRef.current = setTimeout(() => setDetectedSign(null), 2000);
    handleCaption(sign);
  }

  useEffect(() => {
    async function init() {
      try {
        console.log("Requesting camera and microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        console.log("Success! Stream obtained:", stream);
        console.log("Video tracks:", stream.getVideoTracks());
        console.log("Audio tracks:", stream.getAudioTracks());

        streamRef.current = stream;
        setLocalStream(stream);

        if (displayVideo.current) {
          displayVideo.current.srcObject = stream;
          displayVideo.current.muted = true;
          console.log("Video element loaded with stream");
        }

        peerConnection.current = new RTCPeerConnection();
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });

        peerConnection.current.ontrack = (event) => {
          if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0];
          if (displayVideo.current) {
            displayVideo.current.srcObject = event.streams[0];
            displayVideo.current.muted = false;
          }
        };

        socket.emit("join-room", "room1");

        socket.on("user-connected", async (userId) => {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          socket.emit("signal", { to: userId, signal: offer });
        });

        socket.on("signal", async (data) => {
          if (data.signal.type === "offer") {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(data.signal)
            );
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit("signal", { to: data.from, signal: answer });
          } else if (data.signal.type === "answer") {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(data.signal)
            );
          }
        });

        socket.on("receive-caption", (data) => {
          const text = data?.text || data;
          sendCaption(text);
        });

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          console.log("Initializing speech recognition...");
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.lang = "en-US";
          recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            console.log("Speech recognized:", transcript);
            handleCaption(transcript);
          };
          recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
          };
          recognition.start();
          recognitionRef.current = recognition;
        } else {
          console.warn("Speech Recognition not supported in this browser");
        }
      } catch (error) {
        console.error("Camera/init error:", error);
        if (error.name === "NotAllowedError") {
          alert("Camera and microphone access denied. Please allow permissions in your browser settings.");
        } else if (error.name === "NotFoundError") {
          alert("No camera or microphone found. Please check your devices.");
        } else {
          alert(`Error accessing media: ${error.message}`);
        }
      }
    }

    init();

    return () => {
      if (detectedSignTimeoutRef.current) clearTimeout(detectedSignTimeoutRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (displayVideo.current) {
        displayVideo.current.srcObject = null;
        displayVideo.current.muted = false;
      }
    };
  }, []);

  function toggleMic() {
    if (!streamRef.current) return;
    const audioTracks = streamRef.current.getAudioTracks();
    const enabled = !micOn;
    audioTracks.forEach((t) => {
      t.enabled = enabled;
    });
    setMicOn(enabled);
  }

  function toggleVideo() {
    if (!streamRef.current) return;
    const videoTracks = streamRef.current.getVideoTracks();
    
    // If video is on, disable it
    if (videoTracks.length > 0 && videoOn) {
      videoTracks.forEach((t) => {
        t.enabled = false;
      });
      setVideoOn(false);
      return;
    }

    // If video is off, re-enable it
    if (!videoOn && videoTracks.length > 0) {
      videoTracks.forEach((t) => {
        t.enabled = true;
      });
      setVideoOn(true);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <video
          ref={displayVideo}
          autoPlay
          playsInline
          muted
          style={{ width: "80vw", maxWidth: "1000px", height: "auto", borderRadius: "8px", background: "#000" }}
        />
        {caption && <CaptionOverlay caption={caption} detectedSign={detectedSign} />}
        {localStream && <SignDetector stream={localStream} sendCaption={handleSignDetection} />}
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={toggleMic}>{micOn ? "Mute" : "Unmute"}</button>
        <button onClick={toggleVideo}>{videoOn ? "Stop Video" : "Start Video"}</button>
      </div>
    </div>
  );
}

export default VideoCall;
