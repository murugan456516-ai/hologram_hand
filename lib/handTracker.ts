import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class HandTracker {
  private landmarker!: HandLandmarker;
  private isLoaded = false;

  async initialize() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
    );
    
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2
    });
    this.isLoaded = true;
  }

  detect(video: HTMLVideoElement, timestamp: number) {
    if (!this.isLoaded || video.readyState < 2) return null;
    return this.landmarker.detectForVideo(video, timestamp);
  }
}