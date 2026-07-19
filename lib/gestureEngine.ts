import * as THREE from 'three';

export class GestureEngine {
  private static PINCH_THRESHOLD = 0.15;
  private static lastGesture: string = 'NONE';
  private static cooldownUntil: number = 0;

  public static getGesture(points: THREE.Vector3[]): 'NONE' | 'PINCH' | 'FIST' {
    if (!points || points.length < 21) return 'NONE';

    const now = Date.now();
    let currentGesture: 'NONE' | 'PINCH' | 'FIST' = 'NONE';

    // 1. PINCH DETECTION
    const distThumbIndex = points[4].distanceTo(points[8]);
    if (distThumbIndex < this.PINCH_THRESHOLD) {
      currentGesture = 'PINCH';
    } 
    else {
      // 2. FORGIVING FIST DETECTION
      const wrist = points[0];
      
      // Calculate base knuckle distances to the wrist
      const indexKnuckleDist = points[5].distanceTo(wrist);
      const middleKnuckleDist = points[9].distanceTo(wrist);
      
      // Calculate fingertip distances to the wrist
      const indexTipDist = points[8].distanceTo(wrist);
      const middleTipDist = points[12].distanceTo(wrist);

      // In an open hand, the ratio is ~1.8x to 2.0x.
      // We use 1.25x as a generous threshold so relaxed fists trigger perfectly.
      const isIndexClosed = indexTipDist < (indexKnuckleDist * 1.25);
      const isMiddleClosed = middleTipDist < (middleKnuckleDist * 1.25);

      // UNCOMMENT THIS LINE IF IT FAILS AGAIN TO SEE THE EXACT NUMBERS:
      // console.log(`Index: ${(indexTipDist/indexKnuckleDist).toFixed(2)}, Middle: ${(middleTipDist/middleKnuckleDist).toFixed(2)}`);

      if (isIndexClosed && isMiddleClosed) {
        currentGesture = 'FIST';
      }
    }

    // 3. EVENT DISPATCH
    if (currentGesture !== 'NONE') {
      if (now > this.cooldownUntil && this.lastGesture !== currentGesture) {
        console.log(`[M.T.R.O.N] Gesture Confirmed: ${currentGesture}`);
        window.dispatchEvent(new CustomEvent('mtron-command', { detail: { action: currentGesture } }));
        
        // Lock out new commands for 1 second
        this.cooldownUntil = now + 1000;
      }
    } else if (now > this.cooldownUntil) {
       this.lastGesture = 'NONE';
    }

    if (currentGesture !== 'NONE') {
        this.lastGesture = currentGesture;
    }

    return currentGesture;
  }
}