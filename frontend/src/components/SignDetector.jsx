import { useEffect, useRef } from "react";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs";

// Very small heuristic-based sign -> word mapper
function interpretLandmarks(landmarks) {
  if (!landmarks || landmarks.length === 0) return null;

  // landmarks format: array of 21 keypoints where each has x,y,z
  // Determine if finger is extended by comparing tip y to PIP y (index: tip 8, pip 6)
  const isExtended = (tipIdx, pipIdx) => {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    return tip && pip && tip.y < pip.y; // smaller y -> higher on camera (assuming upright hand)
  };

  const thumbExtended = isExtended(4, 2);
  const indexExtended = isExtended(8, 6);
  const middleExtended = isExtended(12, 10);
  const ringExtended = isExtended(16, 14);
  const pinkyExtended = isExtended(20, 18);

  const extended = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended];
  const count = extended.filter(Boolean).length;

  if (count === 5) return "hello";
  if (count === 0) return "stop";
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return "one";
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) return "two";
  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return "yes";

  return null;
}

export default function SignDetector({ stream, sendCaption, enabled = true }) {
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      await tf.ready();

      // create detector
      const detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          runtime: "tfjs",
          modelType: "lite",
        }
      );

      detectorRef.current = detector;

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }

      async function loop() {
        if (!mounted) return;
        try {
          if (detectorRef.current && videoRef.current && videoRef.current.readyState >= 2) {
            const hands = await detectorRef.current.estimateHands(videoRef.current, { flipHorizontal: true });
            if (hands && hands.length > 0) {
              const landmarks = hands[0].keypoints.map((kp) => ({ x: kp.x, y: kp.y, z: kp.z }));
              const word = interpretLandmarks(landmarks);
              if (word && sendCaption) sendCaption(word);
            }
          }
        } catch (e) {
          // ignore errors
        }
        rafRef.current = requestAnimationFrame(loop);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    if (enabled) setup();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (detectorRef.current) {
        try { detectorRef.current.dispose(); } catch (e) {}
        detectorRef.current = null;
      }
    };
  }, [stream, sendCaption, enabled]);

  // hidden video uses same stream
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ display: "none" }}
    />
  );
}