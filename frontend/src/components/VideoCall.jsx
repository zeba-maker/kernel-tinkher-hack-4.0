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
        let stream;
        let retries = 0;
        const maxRetries = 3;

        // Retry mechanism for camera in use error
        while (retries < maxRetries) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
            break; // Success, exit retry loop
          } catch (err) {
            if (err.name === "NotReadableError" && retries < maxRetries - 1) {
              console.warn(`Camera in use, retrying... (attempt ${retries + 1}/${maxRetries})`);
              retries++;
              await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms before retry
            } else {
              throw err; // Re-throw if not NotReadableError or last retry
            }
          }
        }

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
          recognition.interimResults = true;
          recognition.lang = "en-US";
          
          recognition.onstart = () => {
            console.log("Speech recognition started");
          };
          
          recognition.onresult = (event) => {
            let interimTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                console.log("Speech recognized (final):", transcript);
                handleCaption(transcript);
              } else {
                interimTranscript += transcript;
              }
            }
            if (interimTranscript) {
              console.log("Speech interim:", interimTranscript);
            }
          };
          
          recognition.onerror = (event) => {
            if (event.error !== "aborted") {
              console.error("Speech recognition error:", event.error);
            }
          };
          
          recognition.onend = () => {
            console.log("Speech recognition ended, restarting...");
            try {
              recognition.start();
            } catch (e) {
              console.warn("Could not restart recognition:", e);
            }
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
        } else if (error.name === "NotReadableError") {
          alert("Camera is in use by another application. Please close other apps using the camera and refresh the page.");
        } else {
          alert(`Error accessing media: ${error.message}`);
        }
      }
    }

    init();

    return () => {
      if (detectedSignTimeoutRef.current) clearTimeout(detectedSignTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Error stopping recognition:", e);
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          t.stop();
        });
        streamRef.current = null;
      }
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
    
    if (videoTracks.length > 0 && videoOn) {
      videoTracks.forEach((t) => {
        t.enabled = false;
      });
      setVideoOn(false);
      return;
    }

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