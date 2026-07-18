'use client';

import { useEffect, useRef, useState } from 'react';
import { OrbScene } from '@/lib/orbScene';
import { HandTracker } from '@/lib/handTracker';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<OrbScene | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  
  const [status, setStatus] = useState('SYSTEM BOOTING...');

  useEffect(() => {
    if (containerRef.current && !sceneRef.current) {
      sceneRef.current = new OrbScene(containerRef.current);
    }

    const bootSystem = async () => {
      try {
        trackerRef.current = new HandTracker();
        await trackerRef.current.initialize();
        setStatus('AWAITING OPTICAL INPUT');
        await enableCamera();
      } catch (err) {
        console.error(err);
        setStatus('VISION FRAMEWORK OFFLINE');
      }
    };

    bootSystem();

    return () => {
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, []);

  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', startARLoop);
        setStatus('SHOW HANDS');
      }
    } catch (err) {
      setStatus('CAMERA ACCESS DENIED');
    }
  };

  const startARLoop = () => {
    const video = videoRef.current;
    const tracker = trackerRef.current;
    
    if (!video || !tracker) return;

    const streamFrame = () => {
      if (video.paused || video.ended) return;

      const timestamp = performance.now();
      const results = tracker.detect(video, timestamp);

      if (results && results.landmarks && results.landmarks.length > 0) {
        sceneRef.current?.updateArmor(results.landmarks[0]);
        setStatus('TRACKING ACTIVE');
      } else {
        sceneRef.current?.hideArmor();
        setStatus('SHOW HANDS');
      }

      requestAnimationFrame(streamFrame);
    };

    streamFrame();
  };

  return (
    <main className="relative w-screen h-screen bg-[#050505] overflow-hidden select-none font-mono text-[#ffb000]">
      
      {/* 3D Canvas Container (Fullscreen Void) */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-10" />

      {/* --- DASHBOARD UI OVERLAY --- */}

      {/* Top Left Title */}
      <div className="absolute top-8 left-8 z-20">
        <h1 className="text-xl tracking-[0.5em] font-bold text-[#ff9900]">M.T.R.O.N.</h1>
        <div className="w-full h-[1px] bg-[#ff9900]/40 mt-3"></div>
      </div>

      {/* Bottom Right Webcam Monitor */}
      <div className="absolute bottom-8 right-8 z-20">
        
        <div className="relative border border-[#ff9900]/50 p-1 bg-black/80 backdrop-blur-sm rounded-sm shadow-[0_0_15px_rgba(255,153,0,0.1)]">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-64 h-40 object-cover transform scale-x-[-1] opacity-70 sepia-[0.3]"
          />
          <div className="absolute bottom-3 left-3 text-[10px] font-bold text-[#ff9900] tracking-widest drop-shadow-md">
            {status}
          </div>
        </div>

      </div>

      {/* Vignette Effect to darken edges like a CRT monitor */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] z-30"></div>
    </main>
  );
}