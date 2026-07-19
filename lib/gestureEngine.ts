import * as THREE from 'three';

export class GestureEngine {
  // Thresholds for gesture detection
  private static PINCH_THRESHOLD = 0.05;

  public static getGesture(points: THREE.Vector3[]): 'NONE' | 'PINCH' | 'FIST' {
    if (!points || points.length < 21) return 'NONE';

    // 1. PINCH: Check distance between thumb tip (4) and index tip (8)
    const distThumbIndex = points[4].distanceTo(points[8]);
    if (distThumbIndex < this.PINCH_THRESHOLD) {
      return 'PINCH';
    }

    // 2. FIST: Check if finger tips are closer to palm center (9) than the middle joints
    const palm = points[9];
    const fingersClosed = [8, 12, 16, 20].every(tipIdx => {
      const jointIdx = tipIdx - 2;
      return points[tipIdx].distanceTo(palm) < points[jointIdx].distanceTo(palm);
    });

    if (fingersClosed) {
      return 'FIST';
    }

    return 'NONE';
  }
}