import React, { useRef, useEffect, useState } from 'react';
import * as posedetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';

// MoveNet keypoint indices (we exclude eyes & ears for skeleton drawing in our earlier code)
// Upper body: indices 0 (nose) through 12 (right hip) are considered "above the knee."
const SKELETON_NO_EYES: [number, number][] = [
  [5, 6],    // shoulders
  [5, 7], [7, 9],   // left arm
  [6, 8], [8, 10],  // right arm
  [5, 11], [6, 12], // torso to hips
  [11, 12]          // hips connection
];

const EXCLUDED_INDICES = [1, 2, 3, 4]; // eyes & ears to skip for drawing
const MIN_CONFIDENCE = 0.3;

export default function Pose() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [poses, setPoses] = useState<posedetection.Pose[]>([]);

  useEffect(() => {
    let detector: posedetection.PoseDetector | null = null;
    let animationFrameId: number;

    // 1) Set up the webcam at 160x160 for capture.
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

    // 2) Load the MoveNet model (Lightning) & force WebGL backend.
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

    // 3) Draw keypoints (skipping eyes/ears) on canvas.
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

    // 4) Draw skeleton lines (only between allowed keypoints).
    const drawSkeleton = (keypoints: posedetection.Keypoint[], ctx: CanvasRenderingContext2D) => {
      SKELETON_NO_EYES.forEach(([i1, i2]) => {
        const kp1 = keypoints[i1];
        const kp2 = keypoints[i2];

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

    // 5) Main loop: estimate poses & render to canvas.
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

        // Set canvas internal resolution to match capture (320x320)
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the video feed onto the canvas.
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Estimate poses.
        const currentPoses = await detector.estimatePoses(video, { flipHorizontal: false });
        setPoses(currentPoses);

        // Draw keypoints and skeleton lines.
        currentPoses.forEach((pose) => {
          drawKeypoints(pose.keypoints, ctx);
          drawSkeleton(pose.keypoints, ctx);
        });
      }
      animationFrameId = requestAnimationFrame(renderPrediction);
    };

    // 6) Initialize: setup camera, load model, start loop.
    setupCamera()
      .then(loadModel)
      .then(renderPrediction);

    // 7) Cleanup on unmount.
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Filter out keypoints for the JSON output: only include indices < 13 (upper body).
  const upperBodyData = poses.map((pose) => ({
    keypoints: pose.keypoints.filter((_, idx) => idx < 13 && idx > 4)
  }));

  return (
    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
      {/* Hidden video element used as frame source */}
      <video ref={videoRef} style={{ display: 'none' }} />

      {/* Canvas: internal resolution 320x320, displayed at 640x640 (2x scaling) */}
      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid red',
          width: '640px',
          height: '640px',
          backgroundColor: '#333',
        }}
      />

      {/* JSON output (upper body keypoints) strictly under the canvas */}
      <div style={{ marginTop: '1rem', textAlign: 'left', display: 'inline-block' }}>
        <pre style={{ color: 'lime' }}>
          {JSON.stringify(upperBodyData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
