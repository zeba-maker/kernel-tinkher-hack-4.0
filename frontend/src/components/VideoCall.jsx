async function toggleVideo() {
  if (!peerConnection.current) return;

  const senders = peerConnection.current.getSenders();
  const videoSender = senders.find(
    (sender) => sender.track && sender.track.kind === "video"
  );

  // If video is ON → turn it OFF completely
  if (videoOn && videoSender) {
    const track = videoSender.track;

    // Stop camera hardware
    track.stop();

    // Remove track from peer connection
    peerConnection.current.removeTrack(videoSender);

    // Remove from local stream
    if (streamRef.current) {
      streamRef.current.removeTrack(track);
    }

    // Clear local preview
    if (localVideo.current) {
      localVideo.current.srcObject = null;
    }

    setVideoOn(false);
  } 
  // If video is OFF → turn it ON again
  else {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      const newTrack = newStream.getVideoTracks()[0];

      // Add track back
      peerConnection.current.addTrack(newTrack, newStream);

      // Update local preview
      streamRef.current.addTrack(newTrack);
      localVideo.current.srcObject = streamRef.current;

      setVideoOn(true);
    } catch (err) {
      console.error("Error turning camera back on:", err);
    }
  }
}
