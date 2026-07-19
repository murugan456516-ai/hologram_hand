'use client';

import { useEffect, useRef, useState } from 'react';
import { OrbScene } from '@/lib/orbScene';
import { HandTracker } from '@/lib/handTracker';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<OrbScene | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  
  const lockCooldownRef = useRef<number>(0);
  
  const [status, setStatus] = useState('SYSTEM BOOTING...');
  const [screenBrightness, setScreenBrightness] = useState(1.0);
  const [displayIntensity, setDisplayIntensity] = useState(10);

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

    const handleBrightness = (e: Event) => {
      const customEvent = e as CustomEvent;
      const intensity = customEvent.detail.intensity; 
      
      const percent = Math.round(intensity * 100);
      setDisplayIntensity(percent);

      const dynamicBrightness = 0.3 + (intensity * 1.2);
      setScreenBrightness(dynamicBrightness);

      // --- CRITICAL THRESHOLD: LOCK ONLY AT 0% ---
      if (percent === 0) {
        const now = Date.now();
        if (now - lockCooldownRef.current > 5000) {
          console.log("CORE DEPLETED: Executing System Lock...");
          fetch('http://localhost:3001/command/lock', { method: 'POST' })
            .catch(err => console.error("Bridge offline:", err));
          
          lockCooldownRef.current = now;
        }
      }
    };

    window.addEventListener('mtron-brightness', handleBrightness);

    return () => {
      sceneRef.current?.destroy();
      sceneRef.current = null;
      window.removeEventListener('mtron-brightness', handleBrightness);
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
        sceneRef.current?.updateArmor(results.landmarks);
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
    <main 
      style={{ filter: `brightness(${screenBrightness})`, transition: 'filter 0.1s ease-out' }}
      className="relative w-screen h-screen bg-[#050505] overflow-hidden select-none font-mono text-[#ffb000]"
    >
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-10" />

      <div className="absolute top-8 left-8 z-20 flex flex-col gap-6">
        <div>
          <h1 className="text-xl tracking-[0.5em] font-bold text-[#ff9900]">M.T.R.O.N.</h1>
          <div className="w-full h-[1px] bg-[#ff9900]/40 mt-3"></div>
        </div>

        <div className={`p-4 border backdrop-blur-sm transition-colors duration-300 ${
          displayIntensity === 0 ? 'bg-red-900/30 border-red-500' : 'bg-black/50 border-[#ffb000]/50'
        }`}>
          <div className="text-xs tracking-widest opacity-70 mb-1">MODULE 01</div>
          <div className="text-lg font-bold">CORE INTENSITY</div>
          <div className={`mt-2 text-3xl font-light tracking-wider ${displayIntensity === 0 ? 'text-red-500 font-bold' : 'text-[#00ffff]'}`}>
            {displayIntensity}%
          </div>
          
          <div className="mt-4 text-[10px] opacity-50 text-[#00aaff]">ACTION: TWIST DOWN TO LOCK</div>
          
          {displayIntensity < 5 && (
             <div className="mt-2 text-[10px] text-red-500 font-bold animate-pulse">
               WARNING: 0% TRIGGERS SYSTEM SHUTDOWN
             </div>
          )}
          
          <div className="w-full h-1 bg-black mt-2 overflow-hidden border border-[#ffb000]/30 relative">
             <div 
               className={`absolute top-0 left-0 h-full transition-all duration-100 ease-out ${displayIntensity === 0 ? 'bg-red-600' : 'bg-[#00ffff]'}`} 
               style={{ width: `${Math.max(displayIntensity, 1)}%` }} 
             />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 z-20">
        <div className="relative border border-[#ff9900]/50 p-1 bg-black/80 backdrop-blur-sm rounded-sm">
          <video 
            ref={videoRef} autoPlay playsInline muted 
            className="w-64 h-40 object-cover transform scale-x-[-1] opacity-70 sepia-[0.3]"
          />
          <div className="absolute bottom-3 left-3 text-[10px] font-bold text-[#ff9900] tracking-widest drop-shadow-md">
            {status}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] z-30"></div>
    </main>
  );
}