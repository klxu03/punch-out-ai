'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as posedetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';

export default function Pose() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [poses, setPoses] = useState<posedetection.Pose[]>([]);

  useEffect(() => {
    let detector: posedetection.PoseDetector | null = null;
    let animationFrameId: number;

    // Set up the webcam stream.
    const setupCamera = async () => {
      if (navigator.mediaDevices.getUserMedia && videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
          videoRef.current.srcObject = stream;
          await new Promise<void>((resolve) => {
            videoRef.current!.onloadedmetadata = () => {
              videoRef.current!.play();
              resolve();
            };
          });
        } catch (error) {
          console.error('Error accessing webcam:', error);
        }
      }
    };

    // Load the MoveNet model using the pose-detection API.
    const loadModel = async () => {
      // Set backend to WebGL for best performance.
      await tf.setBackend('webgl');
      const detectorConfig: posedetection.MoveNetModelConfig = {
        modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING, // Fastest option.
      };
      detector = await posedetection.createDetector(
        posedetection.SupportedModels.MoveNet,
        detectorConfig
      );
    };

    // Draw keypoints on the canvas.
    const drawKeypoints = (keypoints: posedetection.Keypoint[], ctx: CanvasRenderingContext2D) => {
      keypoints.forEach((keypoint) => {
        if (keypoint.score && keypoint.score > 0.5) {
          const { x, y } = keypoint;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = 'red';
          ctx.fill();
        }
      });
    };

    // Main loop: estimate poses and render.
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

        // Set canvas dimensions to match video.
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Estimate poses.
        const poses = await detector.estimatePoses(video, { flipHorizontal: false });
        setPoses(poses);

        // Clear and draw video frame.
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw keypoints for each detected pose.
        poses.forEach((pose) => {
          drawKeypoints(pose.keypoints, ctx);
        });
      }
      animationFrameId = requestAnimationFrame(renderPrediction);
    };

    // Initialize everything.
    setupCamera().then(loadModel).then(renderPrediction);

    // Cleanup on unmount.
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ width: '100%', height: 'auto' }} />
      {/* Optional debugging: display the JSON of poses */}
      <pre style={{ position: 'absolute', top: 0, left: 0, color: 'lime' }}>
        {JSON.stringify(poses, null, 2)}
      </pre>
    </div>
  );
};