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
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let detector: posedetection.PoseDetector | null = null;
    let animationFrameId: number;

    // 1) Set up the webcam with landscape orientation
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
            width: { ideal: 640 },
            height: { ideal: 360 }
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
      // Add bash-style loading messages
      addTerminalLine('[info] $ sudo modprobe tensorflow_gpu');
      await tf.setBackend('webgl');
      await tf.ready();
      addTerminalLine('[success] WebGL backend initialized');
      
      addTerminalLine('[info] $ ./download_model.sh --type singlepose-lightning');
      const detectorConfig: posedetection.MoveNetModelConfig = {
        modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      };
      detector = await posedetection.createDetector(
        posedetection.SupportedModels.MoveNet,
        detectorConfig
      );
      addTerminalLine('[success] Model downloaded and unpacked: MoveNet (Lightning)');
      addTerminalLine('[info] $ ./start_tracking.sh --mode=realtime');
      setIsLoaded(true);
    };

    // Helper function to add terminal-style lines with bash colors
    const addTerminalLine = (line: string) => {
      // Store the type and content of the message
      const message = {
        text: line,
        type: line.startsWith('[info]') ? 'info' :
              line.startsWith('[success]') ? 'success' :
              line.startsWith('[error]') ? 'error' :
              line.startsWith('[warning]') ? 'warning' : 'default'
      };
      
      setTerminalLines(prev => [...prev, message.text]);
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
          
          // Draw outer glow for points
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'; // Green glow
          ctx.fill();
          
          // Draw keypoint
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#22c55e'; // Green for classic hacker look
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

        // Draw line glow
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)'; // Green glow
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.strokeStyle = '#22c55e'; // Green for classic hacker look
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

        // Set canvas internal resolution to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the video feed onto the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add subtle light scanline effect (very minimal)
        const subtleScanlineEffect = () => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
          for (let y = 0; y < canvas.height; y += 4) {
            ctx.fillRect(0, y, canvas.width, 1);
          }
        };
        subtleScanlineEffect();

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

  // Process keypoints for human-readable output
  const processKeypoints = () => {
    if (!poses.length) return null;
    
    // Only use first pose detected (assuming single person)
    const pose = poses[0];
    
    // Get specific important keypoints
    const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
    const leftElbow = pose.keypoints.find(kp => kp.name === 'left_elbow');
    const rightElbow = pose.keypoints.find(kp => kp.name === 'right_elbow');
    const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
    const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist');
    
    return {
      LEFT_ARM: {
        shoulder: `x:${leftShoulder?.x.toFixed(0) || 'N/A'}, y:${leftShoulder?.y.toFixed(0) || 'N/A'}`,
        elbow: `x:${leftElbow?.x.toFixed(0) || 'N/A'}, y:${leftElbow?.y.toFixed(0) || 'N/A'}`,
        wrist: `x:${leftWrist?.x.toFixed(0) || 'N/A'}, y:${leftWrist?.y.toFixed(0) || 'N/A'}`,
      },
      RIGHT_ARM: {
        shoulder: `x:${rightShoulder?.x.toFixed(0) || 'N/A'}, y:${rightShoulder?.y.toFixed(0) || 'N/A'}`,
        elbow: `x:${rightElbow?.x.toFixed(0) || 'N/A'}, y:${rightElbow?.y.toFixed(0) || 'N/A'}`,
        wrist: `x:${rightWrist?.x.toFixed(0) || 'N/A'}, y:${rightWrist?.y.toFixed(0) || 'N/A'}`,
      }
    };
  };

  // Create readable data
  const readableData = processKeypoints();
  
  // Update terminal line with pose data periodically (reduced frequency)
  useEffect(() => {
    if (!isLoaded || poses.length === 0) return;
    
    const interval = setInterval(() => {
      const confidence = poses[0]?.keypoints[0]?.score || 0;
      const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
      setTerminalLines(prev => {
        const newLines = [...prev];
        if (newLines.length > 5) { // Reduce number of history lines
          newLines.shift();
        }
        
        // Only add new line every 3 seconds
        const statusType = confidence > 0.6 ? 'success' : confidence > 0.3 ? 'info' : 'warning';
        const prefix = statusType === 'success' ? '[success]' : 
                     statusType === 'warning' ? '[warning]' : '[info]';
                     
        newLines.push(`${prefix} [${timestamp}] Tracking subject... confidence: ${(confidence * 100).toFixed(1)}%`);
        return newLines;
      });
    }, 3000); // Reduced update frequency
    
    return () => clearInterval(interval);
  }, [isLoaded, poses]);

  return (
    <div className="flex flex-col items-center">
      {/* Hidden video element used as frame source */}
      <video ref={videoRef} style={{ display: 'none' }} />

      {/* Just the camera in landscape mode */}
      <div className="relative w-full max-w-3xl overflow-hidden rounded-lg border-2 border-green-500 shadow-lg shadow-green-900/30">
        <canvas
          ref={canvasRef}
          className="w-full bg-black"
          style={{
            height: 'auto',
            aspectRatio: '16/9',
          }}
        />
      </div>

      {/* Classic Bash Terminal-style output for keypoints */}
      <div className="mt-4 w-full max-w-3xl">
        <div className="terminal-header bg-gray-800 border border-gray-700 rounded-t-md p-1.5 flex items-center">
          <div className="flex gap-2 mr-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="text-white font-mono text-sm tracking-tight">Terminal - bash - 80×24</div>
        </div>
        <div className="terminal-body bg-black border-l border-r border-b border-gray-700 rounded-b-md p-3 font-mono text-xs md:text-sm overflow-hidden">
          {/* Terminal prompt */}
          <div className="mb-2 flex items-center">
            <span className="text-green-500">punchout@ai</span>
            <span className="text-white mx-1">:</span>
            <span className="text-blue-500">~/pose-tracking</span>
            <span className="text-white mx-1">$</span>
            <span className="text-white ml-1">./keypoint_analysis.sh</span>
          </div>
          
          {/* Status information formatted as command output */}
          <div className="mb-3 flex flex-col md:flex-row gap-1 md:gap-6">
            <div className="inline-flex items-center">
              <span className="text-green-400 mr-2">TRACKING:</span>
              <span className="text-white">ACTIVE</span>
            </div>
            <div className="inline-flex items-center">
              <span className="text-green-400 mr-2">CONFIDENCE:</span>
              <span className="text-white">{((poses[0]?.keypoints[0]?.score || 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="inline-flex items-center">
              <span className="text-green-400 mr-2">MODE:</span>
              <span className="text-white">REAL-TIME</span>
            </div>
          </div>
          
          {/* Terminal line output with divider */}
          <div className="mb-3">
            <div className="text-gray-500 mb-2">----- SYSTEM LOG -----</div>
            {terminalLines.map((line, idx) => {
              // Parse the line to identify bash style tags
              let className = "text-gray-200";
              let content = line;
              
              if (line.startsWith('[success]')) {
                content = line.replace('[success]', '');
                return (
                  <div key={idx} className="py-0.5">
                    <span className="text-green-500">[success]</span>
                    <span className="text-gray-200">{content}</span>
                  </div>
                );
              } else if (line.startsWith('[info]')) {
                content = line.replace('[info]', '');
                return (
                  <div key={idx} className="py-0.5">
                    <span className="text-blue-400">[info]</span>
                    <span className="text-gray-200">{content}</span>
                  </div>
                );
              } else if (line.startsWith('[warning]')) {
                content = line.replace('[warning]', '');
                return (
                  <div key={idx} className="py-0.5">
                    <span className="text-yellow-400">[warning]</span>
                    <span className="text-gray-200">{content}</span>
                  </div>
                );
              } else if (line.startsWith('[error]')) {
                content = line.replace('[error]', '');
                return (
                  <div key={idx} className="py-0.5">
                    <span className="text-red-500">[error]</span>
                    <span className="text-gray-200">{content}</span>
                  </div>
                );
              }
              
              // Default rendering for lines without special prefix
              return (
                <div key={idx} className="text-gray-200 py-0.5">{line}</div>
              );
            })}
          </div>
          
          {/* Human-readable keypoint data with better layout */}
          {readableData && (
            <div className="overflow-x-auto">
              <div className="text-gray-500 mb-2">----- ARM POSITION DATA -----</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-cyan-500 mb-1">LEFT_ARM</div>
                  <div className="pl-2 border-l border-gray-700">
                    <div><span className="text-red-400">shoulder</span>=<span className="text-white">{readableData.LEFT_ARM.shoulder}</span></div>
                    <div><span className="text-red-400">elbow</span>=<span className="text-white">{readableData.LEFT_ARM.elbow}</span></div>
                    <div><span className="text-red-400">wrist</span>=<span className="text-white">{readableData.LEFT_ARM.wrist}</span></div>
                  </div>
                </div>
                <div>
                  <div className="text-cyan-500 mb-1">RIGHT_ARM</div>
                  <div className="pl-2 border-l border-gray-700">
                    <div><span className="text-red-400">shoulder</span>=<span className="text-white">{readableData.RIGHT_ARM.shoulder}</span></div>
                    <div><span className="text-red-400">elbow</span>=<span className="text-white">{readableData.RIGHT_ARM.elbow}</span></div>
                    <div><span className="text-red-400">wrist</span>=<span className="text-white">{readableData.RIGHT_ARM.wrist}</span></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center mt-3 pt-2 border-t border-gray-800">
                <span className="text-green-500">punchout@ai</span>
                <span className="text-white mx-1">:</span>
                <span className="text-blue-500">~/pose-tracking</span>
                <span className="text-white mx-1">$</span>
                <span className="inline-block w-2 h-4 bg-white terminal-cursor ml-1"></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}