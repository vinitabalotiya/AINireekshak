"use client";

/**
 * Google MediaPipe Tasks Vision Behavior Detection Service
 * Analyzes real-time webcam video frames for facial landmarks,
 * blendshapes, eye contact, gaze orientation, head pose, and presentation engagement.
 */

import type {
  FaceLandmarker as FaceLandmarkerType,
  FaceLandmarkerResult,
  DrawingUtils as DrawingUtilsType,
  GestureRecognizer as GestureRecognizerType,
  GestureRecognizerResult,
} from "@mediapipe/tasks-vision";

export interface HeadPose {
  pitch: number; // degrees: positive = looking down, negative = looking up
  yaw: number;   // degrees: positive = turned right, negative = turned left
  roll: number;  // degrees: head tilt
  orientation: "Centered" | "Turned Left" | "Turned Right" | "Looking Down" | "Looking Up" | "Tilted";
}

export interface BehaviourMetrics {
  faceDetected: boolean;
  eyeContactScore: number;     // 0 - 100%
  attentionScore: number;      // 0 - 100%
  confidenceScore: number;     // 0 - 100%
  headPose: HeadPose;
  isSpeaking: boolean;
  isSmiling: boolean;
  smileScore: number;          // 0 - 100%
  blinkRate: number;
  deliveryStatus: string;
  feedbackTip: string;
  timestamp: number;
}

export interface BehaviourSessionSummary {
  averageAttention: number;
  averageEyeContact: number;
  averageConfidence: number;
  dominantOrientation: string;
  speakingTimeSeconds: number;
  totalFramesAnalyzed: number;
}

let faceLandmarkerInstance: FaceLandmarkerType | null = null;
let gestureRecognizerInstance: GestureRecognizerType | null = null;
let drawingUtilsInstance: DrawingUtilsType | null = null;
let isInitializing = false;
let initPromise: Promise<FaceLandmarkerType | null> | null = null;
let gestureInitPromise: Promise<GestureRecognizerType | null> | null = null;

/**
 * Rescale raw behaviour score (1-82) to standard normalized scale (1-100).
 * Formula: score100 = round(1 + (raw - 1) * 99 / 81), clamped to 1-100.
 */
export function normalizeBehaviourScore(raw: number): number {
  if (typeof raw !== "number" || isNaN(raw)) return 50;
  const clamped = Math.max(1, Math.min(82, raw));
  return Math.max(1, Math.min(100, Math.round(1 + ((clamped - 1) * 99) / 81)));
}

/**
 * Initialize MediaPipe GestureRecognizer for Liveness anti-replay verification.
 */
export async function initializeGestureRecognizer(): Promise<GestureRecognizerType | null> {
  if (typeof window === "undefined") return null;
  if (gestureRecognizerInstance) return gestureRecognizerInstance;
  if (gestureInitPromise) return gestureInitPromise;

  gestureInitPromise = (async () => {
    try {
      const { FilesetResolver, GestureRecognizer } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });

      gestureRecognizerInstance = recognizer;
      return recognizer;
    } catch (err) {
      console.warn("MediaPipe GestureRecognizer GPU failed, trying CPU fallback:", err);
      try {
        const { FilesetResolver, GestureRecognizer } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        gestureRecognizerInstance = recognizer;
        return recognizer;
      } catch (fallbackErr) {
        console.warn("MediaPipe GestureRecognizer CPU fallback notice:", fallbackErr);
        return null;
      }
    }
  })();

  return gestureInitPromise;
}

/**
 * Recognize hand gestures from a video frame.
 */
export function recognizeGesture(
  video: HTMLVideoElement,
  timestampMs: number = Date.now()
): { gesture: string; confidence: number; handInFrame: boolean } {
  if (!gestureRecognizerInstance || video.readyState < 2) {
    return { gesture: "None", confidence: 0, handInFrame: false };
  }

  try {
    const result: GestureRecognizerResult = gestureRecognizerInstance.recognizeForVideo(
      video,
      timestampMs
    );

    if (result.gestures && result.gestures.length > 0 && result.gestures[0].length > 0) {
      const topGesture = result.gestures[0][0];
      return {
        gesture: topGesture.categoryName,
        confidence: topGesture.score,
        handInFrame: true,
      };
    }
  } catch (err) {
    console.debug("Gesture recognition frame exception:", err);
  }

  return { gesture: "None", confidence: 0, handInFrame: false };
}

/**
 * Estimate lighting quality by computing mean frame luminance (ITU-R BT.601 formula).
 * Returns { meanLuminance: number, lightingQuality: "optimal" | "low_light" | "overexposed" }
 */
export function estimateFrameLuminance(video: HTMLVideoElement): {
  meanLuminance: number;
  lightingQuality: "optimal" | "low_light" | "overexposed";
} {
  try {
    if (!video || video.readyState < 2) {
      return { meanLuminance: 120.0, lightingQuality: "optimal" };
    }
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { meanLuminance: 120.0, lightingQuality: "optimal" };

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let totalLuminance = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalLuminance += lum;
    }

    const mean = Math.round((totalLuminance / totalPixels) * 10) / 10;
    const quality = mean < 60 ? "low_light" : mean > 210 ? "overexposed" : "optimal";
    return { meanLuminance: mean, lightingQuality: quality };
  } catch (err) {
    return { meanLuminance: 120.0, lightingQuality: "optimal" };
  }
}

/**
 * Capture a lightweight compressed JPEG snapshot from the webcam stream for audit evidence.
 */
export function captureVideoSnapshot(video: HTMLVideoElement, maxWidth = 320): string {
  try {
    const canvas = document.createElement("canvas");
    const aspect = video.videoHeight / (video.videoWidth || 1);
    canvas.width = maxWidth;
    canvas.height = Math.round(maxWidth * aspect);
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.6);
  } catch (err) {
    console.warn("Failed to capture video snapshot:", err);
    return "";
  }
}

/**
 * Initialize MediaPipe FaceLandmarker with WebAssembly and WebGL delegate.
 */
export async function initializeFaceLandmarker(): Promise<FaceLandmarkerType | null> {
  if (typeof window === "undefined") return null;
  if (faceLandmarkerInstance) return faceLandmarkerInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      isInitializing = true;
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      });

      faceLandmarkerInstance = landmarker;
      return landmarker;
    } catch (err) {
      console.warn("MediaPipe FaceLandmarker primary GPU initialization notice:", err);
      // Fallback with CPU delegate if GPU delegate failed
      try {
        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU",
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        });
        faceLandmarkerInstance = landmarker;
        return landmarker;
      } catch (fallbackErr) {
        console.warn("MediaPipe FaceLandmarker CPU fallback also notice:", fallbackErr);
        return null;
      }
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

/**
 * Analyze a video frame and compute real-time presentation behavior telemetry.
 */
export function analyzeBehaviour(
  result: FaceLandmarkerResult | null,
  timestampMs: number = Date.now()
): BehaviourMetrics {
  const defaultPose: HeadPose = {
    pitch: 0,
    yaw: 0,
    roll: 0,
    orientation: "Centered",
  };

  if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
    return {
      faceDetected: false,
      eyeContactScore: 0,
      attentionScore: 0,
      confidenceScore: 0,
      headPose: defaultPose,
      isSpeaking: false,
      isSmiling: false,
      smileScore: 0,
      blinkRate: 0,
      deliveryStatus: "No Face Detected",
      feedbackTip: "Position your face clearly within the webcam frame to begin behavioral analysis.",
      timestamp: timestampMs,
    };
  }

  const landmarks = result.faceLandmarks[0];
  const blendshapes = result.faceBlendshapes?.[0]?.categories || [];

  // 1. Extract Blendshapes Dictionary
  const bsMap = new Map<string, number>();
  for (const b of blendshapes) {
    bsMap.set(b.categoryName, b.score);
  }

  // 2. Gaze Direction & Eye Contact Analysis
  const eyeLookInL = bsMap.get("eyeLookInLeft") || 0;
  const eyeLookOutL = bsMap.get("eyeLookOutLeft") || 0;
  const eyeLookUpL = bsMap.get("eyeLookUpLeft") || 0;
  const eyeLookDownL = bsMap.get("eyeLookDownLeft") || 0;

  const eyeLookInR = bsMap.get("eyeLookInRight") || 0;
  const eyeLookOutR = bsMap.get("eyeLookOutRight") || 0;
  const eyeLookUpR = bsMap.get("eyeLookUpRight") || 0;
  const eyeLookDownR = bsMap.get("eyeLookDownRight") || 0;

  const avgLookDown = (eyeLookDownL + eyeLookDownR) / 2;
  const avgLookUp = (eyeLookUpL + eyeLookUpR) / 2;
  const maxLateralGaze = Math.max(eyeLookInL, eyeLookOutL, eyeLookInR, eyeLookOutR);
  const totalGazeDeviation = Math.max(avgLookDown * 1.2, avgLookUp, maxLateralGaze);

  const eyeContactScore = Math.max(0, Math.min(100, Math.round((1 - totalGazeDeviation * 1.3) * 100)));

  // 3. Head Pose & Orientation Estimation from Key Facial Landmarks
  // Landmark 1: Nose tip, 33: Left eye, 263: Right eye, 152: Chin, 10: Forehead
  const nose = landmarks[1] || { x: 0.5, y: 0.5, z: 0 };
  const leftEye = landmarks[33] || { x: 0.35, y: 0.4, z: 0 };
  const rightEye = landmarks[263] || { x: 0.65, y: 0.4, z: 0 };
  const chin = landmarks[152] || { x: 0.5, y: 0.8, z: 0 };
  const forehead = landmarks[10] || { x: 0.5, y: 0.2, z: 0 };

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const eyeSpan = Math.abs(rightEye.x - leftEye.x) || 0.15;
  const faceHeight = Math.abs(chin.y - forehead.y) || 0.3;

  // Yaw: horizontal nose offset relative to eye midpoint
  const yawRatio = (nose.x - eyeMidX) / eyeSpan;
  const yawDegrees = Math.round(yawRatio * 45); // approximate degrees

  // Pitch: vertical nose position relative to face height
  const noseRelativeY = (nose.y - eyeMidY) / faceHeight;
  const pitchDegrees = Math.round((noseRelativeY - 0.35) * 60);

  // Roll: ocular tilt angle
  const deltaX = rightEye.x - leftEye.x;
  const deltaY = rightEye.y - leftEye.y;
  const rollDegrees = Math.round(Math.atan2(deltaY, deltaX) * (180 / Math.PI));

  // Determine categorical orientation
  let orientation: HeadPose["orientation"] = "Centered";
  if (yawDegrees > 15) {
    orientation = "Turned Right";
  } else if (yawDegrees < -15) {
    orientation = "Turned Left";
  } else if (pitchDegrees > 12 || avgLookDown > 0.4) {
    orientation = "Looking Down";
  } else if (pitchDegrees < -12) {
    orientation = "Looking Up";
  } else if (Math.abs(rollDegrees) > 12) {
    orientation = "Tilted";
  }

  const headPose: HeadPose = {
    pitch: pitchDegrees,
    yaw: yawDegrees,
    roll: rollDegrees,
    orientation,
  };

  // 4. Expression & Vocalization
  const jawOpen = bsMap.get("jawOpen") || 0;
  const mouthSmileL = bsMap.get("mouthSmileLeft") || 0;
  const mouthSmileR = bsMap.get("mouthSmileRight") || 0;
  const smileVal = (mouthSmileL + mouthSmileR) / 2;
  const smileScore = Math.round(smileVal * 100);

  const isSpeaking = jawOpen > 0.12;
  const isSmiling = smileScore > 25;

  const blinkL = bsMap.get("eyeBlinkLeft") || 0;
  const blinkR = bsMap.get("eyeBlinkRight") || 0;
  const blinkRate = Math.round(((blinkL + blinkR) / 2) * 100);

  // 5. Composite Presentation Attention & Confidence
  const headCenteredBonus = orientation === "Centered" ? 30 : orientation === "Tilted" ? 15 : 0;
  const attentionScore = Math.max(
    10,
    Math.min(100, Math.round(eyeContactScore * 0.7 + headCenteredBonus))
  );

  const postureStability = Math.max(0, 100 - (Math.abs(yawDegrees) * 1.5 + Math.abs(pitchDegrees) * 1.2));
  const confidenceScore = Math.max(
    15,
    Math.min(
      100,
      Math.round(
        attentionScore * 0.45 +
        postureStability * 0.35 +
        (isSpeaking ? 12 : 5) +
        (isSmiling ? 8 : 0)
      )
    )
  );

  // 6. Situational Status & Coaching Feedback Tip
  let deliveryStatus = "Confident & Engaging";
  let feedbackTip = "Excellent direct eye contact! Your presentation demeanor is steady and clear.";

  if (orientation === "Looking Down" || avgLookDown > 0.45) {
    deliveryStatus = "Looking Down (Reading Notes)";
    feedbackTip = "Tip: Look up directly into the camera lens to project confidence to the AI judges.";
  } else if (orientation === "Turned Left" || orientation === "Turned Right") {
    deliveryStatus = "Gaze Diverted (Looking Away)";
    feedbackTip = "Tip: Re-center your gaze toward the screen to maintain high audience engagement.";
  } else if (attentionScore < 50) {
    deliveryStatus = "Low Engagement";
    feedbackTip = "Tip: Sit upright and address the AI judge avatar directly.";
  } else if (isSpeaking && confidenceScore > 80) {
    deliveryStatus = "Dynamic & Confident Delivery";
    feedbackTip = "Great vocal articulation and active audience connection!";
  } else if (attentionScore >= 75) {
    deliveryStatus = "Focused Presentation";
    feedbackTip = "Steady focus maintained. Continue your explanation at this pacing.";
  }

  return {
    faceDetected: true,
    eyeContactScore,
    attentionScore,
    confidenceScore,
    headPose,
    isSpeaking,
    isSmiling,
    smileScore,
    blinkRate,
    deliveryStatus,
    feedbackTip,
    timestamp: timestampMs,
  };
}

/**
 * Draw facial landmark connectors and iris tracking overlays onto a canvas.
 */
export async function drawFaceMeshOverlay(
  canvas: HTMLCanvasElement,
  result: FaceLandmarkerResult,
  mirrored: boolean = false
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx || !result.faceLandmarks || result.faceLandmarks.length === 0) {
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  try {
    const { DrawingUtils, FaceLandmarker } = await import("@mediapipe/tasks-vision");
    const du = new DrawingUtils(ctx);

    ctx.save();
    if (mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    const landmarks = result.faceLandmarks[0];

    // Subtle face contours in neon blue
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_CONTOURS, {
      color: "#38bdf888",
      lineWidth: 1.2,
    });

    // Iris tracking rings in bright emerald
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, {
      color: "#10b981",
      lineWidth: 2,
    });
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, {
      color: "#10b981",
      lineWidth: 2,
    });

    // Lips outline in cyan
    du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
      color: "#06b6d4aa",
      lineWidth: 1,
    });

    ctx.restore();
  } catch (drawErr) {
    console.debug("Mesh drawing exception:", drawErr);
  }
}
