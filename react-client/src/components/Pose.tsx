import React, { useRef, useEffect, useState } from 'react';
import * as posedetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';

// MoveNet keypoint indices:
// 0: nose
// 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear (we'll skip these)
// 5: left_shoulder, 6: right_shoulder, 7: left_elbow, 8: right_elbow
// 9: left_wrist, 10: right_wrist, 11: left_hip, 12: right_hip
// 13: left_knee, 14: right_knee, 15: left_ankle, 16: right_ankle

// We skip eyes & ears (indices 1–4), so skeleton lines won't include them:
const SKELETON_NO_EYES: [number, number][] = [
  [5, 6],   // shoulders
  [5, 7], [7, 9],   // left arm
  [6, 8], [8, 10],  // right arm
  [5, 11], [6, 12], // torso to hips
  [11, 12],         // hips
  [11, 13], [13, 15], // left leg
  [12, 14], [14, 16], // right leg
  // Nose (0) is optional. If you want a line from nose to shoulders,
  // you could add something like [0, 5] and [0, 6].
];

// Indices we want to skip altogether:
const EXCLUDED_INDICES = [1, 2, 3, 4]; // eyes & ears

// Lower threshold to show more points
const MIN_CONFIDENCE = 0.3;

export default function Pose() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [poses, setPoses] = useState<posedetection.Pose[]>([]);

  useEffect(() => {
    let detector: posedetection.PoseDetector | null = null;
    let animationFrameId: number;

    // 1) Set up the webcam at 160x160 for speed
    const setupCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.error("getUserMedia not supported in this browser.");
        return;
      }
      if (!videoRef.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: 160,
            height: 160,
          },
          audio: false,
        });
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play();
            resolve();
          };
        });
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    // 2) Load MoveNet (Lightning) & force WebGL
    const loadModel = async () => {
      await tf.setBackend('webgl');
      await tf.ready();
      const detectorConfig: posedetection.MoveNetModelConfig = {
        modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      };
      detector = await posedetection.createDetector(
        posedetection.SupportedModels.MoveNet,
        detectorConfig
      );
    };

    // 3) Draw keypoints (excluding eyes/ears) on canvas
    const drawKeypoints = (keypoints: posedetection.Keypoint[], ctx: CanvasRenderingContext2D) => {
      keypoints.forEach((keypoint, index) => {
        if (
          !EXCLUDED_INDICES.includes(index) &&
          keypoint.score &&
          keypoint.score > MIN_CONFIDENCE
        ) {
          const { x, y } = keypoint;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = 'red';
          ctx.fill();
        }
      });
    };

    // 4) Draw skeleton lines, skipping eyes/ears
    const drawSkeleton = (keypoints: posedetection.Keypoint[], ctx: CanvasRenderingContext2D) => {
      SKELETON_NO_EYES.forEach(([i1, i2]) => {
        const kp1 = keypoints[i1];
        const kp2 = keypoints[i2];

        // Skip if either keypoint is excluded or below threshold
        if (
          EXCLUDED_INDICES.includes(i1) ||
          EXCLUDED_INDICES.includes(i2) ||
          (kp1.score && kp1.score < MIN_CONFIDENCE) ||
          (kp2.score && kp2.score < MIN_CONFIDENCE)
        ) {
          return;
        }

        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };

    // 5) Main loop: estimate poses & render
    const renderPrediction = async () => {
      if (
        detector &&
        videoRef.current &&
        canvasRef.current &&
        videoRef.current.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Match canvas to the actual video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the video feed
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Estimate poses
        const currentPoses = await detector.estimatePoses(video, { flipHorizontal: false });
        setPoses(currentPoses);

        // Draw each pose
        currentPoses.forEach((pose) => {
          drawKeypoints(pose.keypoints, ctx);
          drawSkeleton(pose.keypoints, ctx);
        });
      }
      animationFrameId = requestAnimationFrame(renderPrediction);
    };

    // 6) Initialize
    setupCamera()
      .then(loadModel)
      .then(renderPrediction);

    // 7) Cleanup on unmount
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
      {/* Hidden video (source for frames) */}
      <video ref={videoRef} style={{ display: 'none' }} />

      {/* Single canvas showing video + body keypoints & lines (no eyes/ears) */}
      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid red',
          // Expand the display size so you can see it bigger,
          // but the internal resolution is still 160x160 for speed.
          width: '320px',
          height: '320px',
          backgroundColor: '#333',
        }}
      />

      {/* Debug info */}
      <pre style={{ color: 'lime', textAlign: 'left', display: 'inline-block', marginTop: '1rem' }}>
        {JSON.stringify(poses, null, 2)}
      </pre>
    </div>
  );
}
