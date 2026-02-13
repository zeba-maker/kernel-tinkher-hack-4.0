import { useEffect, useRef } from "react";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs";

// Enhanced heuristic-based sign -> word mapper
function interpretLandmarks(landmarks) {
  if (!landmarks || landmarks.length === 0) return null;

  // landmarks format: array of 21 keypoints where each has x,y,z
  // Landmark indices:
  // 0: wrist, 1-4: thumb, 5-8: index, 9-12: middle, 13-16: ring, 17-20: pinky
  // For each finger: 0(MCP), 1(PIP), 2(DIP), 3(TIP)
  
  const isExtended = (tipIdx, pipIdx) => {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    return tip && pip && tip.y < pip.y; // smaller y -> higher on camera
  };

  const isClosed = (tipIdx, pipIdx) => !isExtended(tipIdx, pipIdx);

  const thumbExtended = isExtended(4, 2);
  const indexExtended = isExtended(8, 6);
  const middleExtended = isExtended(12, 10);
  const ringExtended = isExtended(16, 14);
  const pinkyExtended = isExtended(20, 18);

  const extended = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended];
  const count = extended.filter(Boolean).length;

  // Open palm (all 5 fingers extended)
  if (count === 5) return "hello";
  
  // Fist (all fingers closed)
  if (count === 0) return "stop";
  
  // One finger (index only)
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) return "one";
  
  // Two fingers (index + middle)
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) return "two";
  
  // Three fingers (index + middle + ring)
  if (indexExtended && middleExtended && ringExtended && !pinkyExtended && !thumbExtended) return "three";
  
  // Four fingers (all except thumb)
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && !thumbExtended) return "four";
  
  // Thumbs up (only thumb extended, hand vertical)
  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return "thumbs_up";
  
  // Peace/Victory (index + middle extended, others closed)
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
    const index = landmarks[8];
    const middle = landmarks[12];
    const indexMiddleDist = Math.abs(index.x - middle.x);
    // If fingers are spread apart, it's peace sign
    if (indexMiddleDist > 0.03) return "peace";
  }
  
  // Okay/OK (thumb + index together, other fingers extended)
  if (!thumbExtended && !indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return "okay";
  }
  
  // Rock on (index + pinky extended, middle + ring closed)
  if (indexExtended && !middleExtended && !ringExtended && pinkyExtended && !thumbExtended) return "rock";
  
  // Call me (thumb + pinky extended, others closed)
  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && pinkyExtended) return "call_me";
  
  // Pray/Please (all fingers together pointing up)
  if (thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
    const wrist = landmarks[0];
    const middle = landmarks[12];
    // Check if hand is vertical (middle finger tip above wrist)
    if (middle.y < wrist.y) return "pray";
  }
  
  // Yes (thumbs up gesture already covered above, but this is head nod simulation)
  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return "yes";

  return null;
}

export default function SignDetector({ stream, sendCaption, enabled = true }) {
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const lastWordRef = useRef(null);
  const lastSentAtRef = useRef(0);

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
              if (word && sendCaption) {
                const now = Date.now();
                // throttle repeated same word to once per 1500ms
                if (word !== lastWordRef.current || now - lastSentAtRef.current > 1500) {
                  lastWordRef.current = word;
                  lastSentAtRef.current = now;
                  sendCaption(word);
                }
              }
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