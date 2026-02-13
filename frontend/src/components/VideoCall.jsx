import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import CaptionOverlay from "./CaptionOverlay";
import SignDetector from "./SignDetector";

const socket = io("http://localhost:5000");

function VideoCall({ sendCaption, caption }) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const displayVideo = useRef(null);
  const peerConnection = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  useEffect(() => {
    async function init() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      // show local stream until remote appears and mute local preview to avoid echo
      if (displayVideo.current) {
        displayVideo.current.srcObject = stream;
        try {
          displayVideo.current.muted = true;
        } catch (e) {}
      }

      peerConnection.current = new RTCPeerConnection();

      // Add local tracks
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      // When remote track received
      peerConnection.current.ontrack = (event) => {
        remoteVideo.current.srcObject = event.streams[0];
        // switch display to remote when available and unmute
        if (displayVideo.current) {
          displayVideo.current.srcObject = event.streams[0];
          try {
            displayVideo.current.muted = false;
          } catch (e) {}
        }
      };

      // Join room
      socket.emit("join-room", "room1");

      // When another user joins
      socket.on("user-connected", async (userId) => {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);

        socket.emit("signal", {
          to: userId,
          signal: offer,
        });
      });

      // Receive signaling data
      socket.on("signal", async (data) => {
        if (data.signal.type === "offer") {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.signal)
          );

          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);

          socket.emit("signal", {
            to: data.from,
            signal: answer,
          });
        } else if (data.signal.type === "answer") {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.signal)
          );
        }
      });

      // Receive captions from other peers
      socket.on("receive-caption", (data) => {
        try {
          const text = data && data.text ? data.text : data;
          sendCaption(text);
        } catch (e) {
          /* ignore */
        }
      });

      // 🎤 Speech Recognition for Captions
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
          socket.emit("send-caption", { room: "room1", text: transcript });
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    }

    init();

    return () => {
      // cleanup
      try {
        socket.off("user-connected");
        socket.off("signal");
      } catch (e) {
        /* ignore */
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }

      if (peerConnection.current) {
        try {
          peerConnection.current.close();
        } catch (e) {}
        peerConnection.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // clear display video
      try {
        if (displayVideo.current) {
          displayVideo.current.srcObject = null;
          displayVideo.current.muted = false;
        }
      } catch (e) {}
    };
  }, []);

  function toggleMic() {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setMicOn(t.enabled);
    });
  }

  function toggleVideo() {
    // If there is no local stream object, nothing to stop/start
    if (!streamRef.current) return;

    const videoTracks = streamRef.current.getVideoTracks();

    // If video is currently active, stop and remove video tracks to release camera
    if (videoTracks.length > 0) {
      // Stop any sender tracks and remove from RTCPeerConnection
      try {
        peerConnection.current.getSenders().forEach((s) => {
          if (s.track && s.track.kind === "video") {
            try {
              s.track.stop();
            } catch (e) {}
            try {
              s.replaceTrack(null);
            } catch (e) {}
          }
        });
      } catch (e) {}

      // Stop and remove local video tracks
      videoTracks.forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
        try {
          streamRef.current.removeTrack(t);
        } catch (e) {}
      });

      // If display currently shows local stream, clear it; remote (if present) will be handled by ontrack
      try {
        if (displayVideo.current && displayVideo.current.srcObject === streamRef.current) displayVideo.current.srcObject = null;
      } catch (e) {}

      setVideoOn(false);
      return;
    }

    // Otherwise re-acquire camera and attach video track(s)
    (async () => {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const newVideoTrack = newStream.getVideoTracks()[0];

        // Ensure streamRef.current is a MediaStream
        if (!streamRef.current || !(streamRef.current.getTracks instanceof Function)) {
          streamRef.current = new MediaStream();
        }

        try {
          streamRef.current.addTrack(newVideoTrack);
        } catch (e) {
          streamRef.current = newStream;
        }

        // Update display preview (if no remote yet)
        if (displayVideo.current && (!remoteVideo.current || !remoteVideo.current.srcObject)) displayVideo.current.srcObject = streamRef.current;

        // Try to replace existing sender track, otherwise add a new track
        const senders = peerConnection.current.getSenders();
        let replaced = false;
        for (const s of senders) {
          if (s.track && s.track.kind === "video") {
            try {
              await s.replaceTrack(newVideoTrack);
              replaced = true;
              break;
            } catch (e) {}
          }
        }

        if (!replaced) {
          try {
            peerConnection.current.addTrack(newVideoTrack, streamRef.current);
          } catch (e) {}
        }

        setVideoOn(true);
      } catch (e) {
        console.error("Unable to start video:", e);
      }
    })();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      <div style={{ position: "relative", display: "flex", justifyContent: "center", gap: "20px" }}>
        <video ref={displayVideo} autoPlay playsInline style={{ background: "#000", width: "80vw", maxWidth: "1000px", height: "auto", borderRadius: "8px" }} />
        {/* overlay caption inside video container */}
        {typeof caption !== "undefined" && <CaptionOverlay caption={caption} />}
        {/* SignDetector uses same stream for detection; appears invisible */}
        {streamRef.current && <SignDetector stream={streamRef.current} sendCaption={sendCaption} />}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={toggleMic}>{micOn ? "Mute" : "Unmute"}</button>
        <button onClick={toggleVideo}>{videoOn ? "Stop Video" : "Start Video"}</button>
      </div>
    </div>
  );
}

export default VideoCall;
