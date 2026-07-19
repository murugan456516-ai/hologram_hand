import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private isInitialized = false;

  public async initialize() {
    if (this.isInitialized) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2, // Crucial: Set to 2 to enable dual-hand interaction
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing HandTracker:', error);
      throw error;
    }
  }

  public detect(videoElement: HTMLVideoElement, timestamp: number) {
    if (!this.landmarker || !this.isInitialized) return null;
    return this.landmarker.detectForVideo(videoElement, timestamp);
  }
}