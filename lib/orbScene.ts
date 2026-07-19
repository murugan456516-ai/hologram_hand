import * as THREE from 'three';

const HAND_CONNECTIONS = [
  // Fingers
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Perimeter
  [5, 9], [9, 13], [13, 17], [0, 5], [0, 17],
  // Palm Cross-Weave
  [0, 9], [0, 13], [5, 13], [9, 17]
];

export class OrbScene {
  private container: HTMLDivElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  
  private innerJoints: THREE.Mesh[] = [];
  private outerJoints: THREE.Mesh[] = [];
  private innerBones: THREE.Mesh[] = [];
  private outerBones: THREE.Mesh[] = [];
  
  private webInnerMesh!: THREE.Mesh;
  private webOuterMesh!: THREE.Mesh;
  private webGeometry!: THREE.BufferGeometry;
  private webSegments = 6; 
  
  // The Rasengan Globe Elements
  private handGlobe!: THREE.Group;
  private rasenganCore!: THREE.Mesh;
  private rasenganShell!: THREE.Mesh;
  private rasenganRings: THREE.Mesh[] = [];
  private outerRings: THREE.Mesh[] = []; // The actual outer orbital rings
  
  private dustSystem!: THREE.Points;
  
  private animationFrameId?: number;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.init();
  }

  private init() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    // --- Unified Hologram Skin Materials (Gold & Orange) ---
    const meshOuterMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00, // Bright Gold Gauntlet
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const meshInnerMat = new THREE.MeshBasicMaterial({
      color: 0x140500, // Very dark amber/brown for occlusion
      wireframe: false, 
      transparent: true,
      opacity: 0.98,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });

    // --- Build Hand Joints ---
    const jointOuterGeo = new THREE.IcosahedronGeometry(0.045, 1);
    const jointInnerGeo = new THREE.IcosahedronGeometry(0.04, 1);

    for (let i = 0; i < 21; i++) {
      const innerMesh = new THREE.Mesh(jointInnerGeo, meshInnerMat);
      const outerMesh = new THREE.Mesh(jointOuterGeo, meshOuterMat);
      innerMesh.visible = false;
      outerMesh.visible = false;
      this.scene.add(innerMesh);
      this.scene.add(outerMesh);
      this.innerJoints.push(innerMesh);
      this.outerJoints.push(outerMesh);
    }

    // --- Build Hand Bones ---
    const boneOuterGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 6, 2);
    const boneInnerGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 6, 2);

    for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
      const innerBone = new THREE.Mesh(boneInnerGeo, meshInnerMat);
      const outerBone = new THREE.Mesh(boneOuterGeo, meshOuterMat);
      innerBone.visible = false;
      outerBone.visible = false;
      this.scene.add(innerBone);
      this.scene.add(outerBone);
      this.innerBones.push(innerBone);
      this.outerBones.push(outerBone);
    }

    // --- Build Custom Subdivided Webbing Mesh ---
    this.webGeometry = new THREE.BufferGeometry();
    const numVertices = ((this.webSegments + 1) * (this.webSegments + 2)) / 2;
    const webPositions = new Float32Array(numVertices * 3);
    const webIndices = [];

    let curRowIdx = 0;
    let nextRowIdx = 1;
    for (let i = 0; i < this.webSegments; i++) {
      for (let j = 0; j <= i; j++) {
        webIndices.push(curRowIdx + j, nextRowIdx + j + 1, nextRowIdx + j);
        if (j < i) {
          webIndices.push(curRowIdx + j, curRowIdx + j + 1, nextRowIdx + j + 1);
        }
      }
      curRowIdx += (i + 1);
      nextRowIdx += (i + 2);
    }

    this.webGeometry.setAttribute('position', new THREE.BufferAttribute(webPositions, 3));
    this.webGeometry.setIndex(webIndices);

    this.webInnerMesh = new THREE.Mesh(this.webGeometry, meshInnerMat);
    this.webOuterMesh = new THREE.Mesh(this.webGeometry, meshOuterMat);
    this.webInnerMesh.visible = false;
    this.webOuterMesh.visible = false;
    this.scene.add(this.webInnerMesh);
    this.scene.add(this.webOuterMesh);

    // --- Create the Rasengan Globe ---
    this.handGlobe = new THREE.Group();

    // 1. The Dense Inner Core (Pale Blue)
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xccffff, 
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.rasenganCore = new THREE.Mesh(new THREE.SphereGeometry(0.05, 32, 32), coreMat);

    // 2. The Dense Outer Shell (Deep Chakra Blue)
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x0066ff, 
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.rasenganShell = new THREE.Mesh(new THREE.SphereGeometry(0.20, 24, 24), shellMat);

    // 3. Swirling Chakra Rings (Mid Blue, Inside Shell)
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff, 
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const innerRingGeo = new THREE.TorusGeometry(0.17, 0.003, 16, 64);
    
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(innerRingGeo, innerRingMat);
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      this.rasenganRings.push(ring);
      this.handGlobe.add(ring);
    }

    // 4. Actual Outer Orbital Rings (Cyan, Outside Shell)
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff, // Bright cyan
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    // Radius 0.24 is outside the 0.20 shell
    const outerRingGeo = new THREE.TorusGeometry(0.24, 0.002, 16, 64);

    for (let i = 0; i < 3; i++) {
      const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
      // Give each ring a random initial tilt
      outerRing.rotation.x = Math.random() * Math.PI;
      outerRing.rotation.y = Math.random() * Math.PI;
      
      this.outerRings.push(outerRing);
      this.handGlobe.add(outerRing);
    }

    this.handGlobe.add(this.rasenganCore);
    this.handGlobe.add(this.rasenganShell);
    this.handGlobe.visible = false;
    this.scene.add(this.handGlobe);

    // --- Global Ambient Dust ---
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 300;
    const dustPositions = new Float32Array(dustCount * 3);
    for(let i = 0; i < dustCount * 3; i++) {
      dustPositions[i] = (Math.random() - 0.5) * 3;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0x00ccff, // Blue ambient dust to match energy
      size: 0.015,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    this.dustSystem = new THREE.Points(dustGeo, dustMaterial);
    this.scene.add(this.dustSystem);

    this.animate();
    window.addEventListener('resize', this.handleResize);
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    const time = Date.now() * 0.001;
    
    // Hand joints idle scan
    this.outerJoints.forEach((mesh, index) => {
      mesh.rotation.x = time * (index % 2 === 0 ? 1 : -1);
      mesh.rotation.y = time * 0.5;
    });

    // --- Rasengan Core & Shell Animation Logic ---
    const scalePulse = 1.0 + Math.sin(time * 10) * 0.05;
    this.rasenganCore.scale.set(scalePulse, scalePulse, scalePulse);

    this.rasenganShell.rotation.y -= 0.08;
    this.rasenganShell.rotation.x += 0.04;

    // Spin inner rings
    this.rasenganRings.forEach((ring, i) => {
      ring.rotation.x += 0.1 + (i * 0.02);
      ring.rotation.y += 0.12 + (i * 0.03);
      ring.rotation.z -= 0.05 + (i * 0.01);
    });

    // --- Outer Rings Animation Logic ---
    // Spin outer rings in an aggressive, chaotic pattern
    this.outerRings.forEach((ring, i) => {
      ring.rotation.x += 0.06 + (i * 0.015);
      ring.rotation.y += 0.09 + (i * 0.02);
      ring.rotation.z -= 0.04 + (i * 0.01);
    });
    
    // Slow drift for the background ambient dust
    this.dustSystem.rotation.y = time * 0.05;

    this.renderer.render(this.scene, this.camera);
  };

  public updateArmor(handsOrLandmarks: any[]) {
    if (!handsOrLandmarks || handsOrLandmarks.length === 0) return;

    let trackedHand;
    if (handsOrLandmarks[0].x !== undefined) {
      trackedHand = handsOrLandmarks; 
    } else {
      trackedHand = handsOrLandmarks[0]; 
    }

    if (!trackedHand || typeof trackedHand.map !== 'function') return;

    let centerX = 0, centerY = 0, centerZ = 0;

    const trackedPoints = trackedHand.map((lm: any) => {
      const x = -(lm.x - 0.5) * 2.5 * (this.container.clientWidth / this.container.clientHeight);
      const y = -(lm.y - 0.5) * 2.5;
      const z = -lm.z * 2.0; 
      
      centerX += x;
      centerY += y;
      centerZ += z;

      return new THREE.Vector3(x, y, z);
    });

    const indexBase = trackedPoints[5];
    const pinkyBase = trackedPoints[17];
    
    const rollAngle = Math.atan2(pinkyBase.y - indexBase.y, pinkyBase.x - indexBase.x);
    const rotationMultiplier = Math.abs(rollAngle) / Math.PI;
    const zoomScale = 1.0 + (rotationMultiplier * 2.5); 

    trackedPoints.forEach((point: THREE.Vector3, i: number) => {
      this.innerJoints[i].position.copy(point);
      this.outerJoints[i].position.copy(point);
      this.innerJoints[i].visible = true;
      this.outerJoints[i].visible = true;
    });

    const yAxis = new THREE.Vector3(0, 1, 0);

    HAND_CONNECTIONS.forEach(([start, end], i) => {
      const pStart = trackedPoints[start];
      const pEnd = trackedPoints[end];
      
      const distance = pStart.distanceTo(pEnd);
      const midpoint = pStart.clone().lerp(pEnd, 0.5);
      const direction = pEnd.clone().sub(pStart).normalize();

      const outerBone = this.outerBones[i];
      outerBone.position.copy(midpoint);
      outerBone.quaternion.setFromUnitVectors(yAxis, direction);
      outerBone.scale.set(1, distance, 1);
      outerBone.visible = true;

      const innerBone = this.innerBones[i];
      innerBone.position.copy(midpoint);
      innerBone.quaternion.setFromUnitVectors(yAxis, direction);
      innerBone.scale.set(1, distance, 1);
      innerBone.visible = true;
    });

    const webArray = this.webGeometry.attributes.position.array as Float32Array;
    const p0 = trackedPoints[0]; 
    const p2 = trackedPoints[2]; 
    const p6 = trackedPoints[6]; 
    
    let wIdx = 0;
    for (let i = 0; i <= this.webSegments; i++) {
      for (let j = 0; j <= i; j++) {
        const u = j / this.webSegments;
        const v = (i - j) / this.webSegments;
        const w = 1 - (u + v);

        webArray[wIdx++] = p6.x * u + p2.x * v + p0.x * w;
        webArray[wIdx++] = p6.y * u + p2.y * v + p0.y * w;
        webArray[wIdx++] = p6.z * u + p2.z * v + p0.z * w;
      }
    }
    
    this.webGeometry.attributes.position.needsUpdate = true;
    this.webGeometry.computeVertexNormals();
    this.webInnerMesh.visible = true;
    this.webOuterMesh.visible = true;

    const avgX = centerX / 21;
    const avgY = centerY / 21;
    const avgZ = centerZ / 21;

    const baseRadius = 0.20;
    const floatingGap = 0.30; 
    
    const dynamicYOffset = floatingGap + (baseRadius * zoomScale);

    this.handGlobe.position.set(avgX, avgY + dynamicYOffset, avgZ);
    this.handGlobe.scale.set(zoomScale, zoomScale, zoomScale); 
    this.handGlobe.visible = true;
  }

  public hideArmor() {
    this.innerJoints.forEach(mesh => mesh.visible = false);
    this.outerJoints.forEach(mesh => mesh.visible = false);
    this.innerBones.forEach(mesh => mesh.visible = false);
    this.outerBones.forEach(mesh => mesh.visible = false);
    this.webInnerMesh.visible = false;
    this.webOuterMesh.visible = false;
    this.handGlobe.visible = false;
  }

  private handleResize = () => {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  public destroy() {
    window.removeEventListener('resize', this.handleResize);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}