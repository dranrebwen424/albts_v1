'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera, ArrowsClockwise, Lightning, LightningSlash} from '@phosphor-icons/react';
import { ViewfinderOverlay } from './viewfinder-overlay';
import { cn } from '@/lib/utils/cn';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

type CaptureState = 'requesting' | 'denied' | 'active' | 'captured';

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const ANALYZE_INTERVAL = 6; // process every 6th frame

  const [state, setState] = useState<CaptureState>('requesting');
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedUrl, setCapturedUrl] = useState<string>('');
  const [torchSupported, setTorchSupported] = useState(false);

  // Viewfinder feedback
  const [focusFeedback, setFocusFeedback] = useState<'blurry' | 'fair' | 'good' | 'unknown'>('unknown');
  const [stability, setStability] = useState<'stable' | 'unstable' | 'unknown'>('unknown');
  const captureReady = focusFeedback === 'good' && stability !== 'unstable';

  const streamRef = useRef<MediaStream | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      // Cleanup previous
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean } | undefined;
        if (capabilities?.torch) {
          setTorchSupported(true);
        }

        if (videoRef.current) {
          const video = videoRef.current;
          video.setAttribute('playsinline', '');
          video.muted = true;
          video.srcObject = stream;
          await new Promise<void>((resolve) => {
            const failTimer = setTimeout(() => { resolve(); }, 3000);
            const cleanup = () => { clearTimeout(failTimer); };
            if ('requestVideoFrameCallback' in video) {
              video.requestVideoFrameCallback(() => {
                cleanup();
                requestAnimationFrame(() => resolve());
              });
            } else {
              const poll = () => {
                const el = videoRef.current;
                if (el && el.videoWidth > 0 && el.videoHeight > 0) {
                  cleanup();
                  requestAnimationFrame(() => resolve());
                  return;
                }
                requestAnimationFrame(poll);
              };
              requestAnimationFrame(poll);
            }
            video.play().catch(() => { cleanup(); resolve(); });
          });
        }

        setState('active');
      } catch {
        if (!cancelled) {
          setState('denied');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [facingMode, retryCount]);

  // Torch toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (track as any).applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch {}
  };

  // Switch camera
  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Focus/stability analysis
  useEffect(() => {
    if (state !== 'active') return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Orientation tracking for stability
      const orientHistory: { alpha: number; beta: number; gamma: number }[] = [];
    const ORIENT_WINDOW = 10;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      orientHistory.push({ alpha: e.alpha || 0, beta: e.beta || 0, gamma: e.gamma || 0 });
      if (orientHistory.length > ORIENT_WINDOW) {
        orientHistory.shift();
      }

      if (orientHistory.length >= ORIENT_WINDOW) {
        const avg = orientHistory.reduce((a, b) => ({
          alpha: a.alpha + b.alpha,
          beta: a.beta + b.beta,
          gamma: a.gamma + b.gamma,
        }), { alpha: 0, beta: 0, gamma: 0 });
        avg.alpha /= orientHistory.length;
        avg.beta /= orientHistory.length;
        avg.gamma /= orientHistory.length;

        const variance = orientHistory.reduce((sum, v) =>
          sum + Math.pow(v.alpha - avg.alpha, 2) + Math.pow(v.beta - avg.beta, 2) + Math.pow(v.gamma - avg.gamma, 2)
        , 0) / orientHistory.length;

        setStability(variance < 2 ? 'stable' : 'unstable');
      }
    };

    // Request orientation permission on iOS
    const requestOrientation = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const DeviceOrientation = DeviceOrientationEvent as any;
      if (typeof DeviceOrientation.requestPermission === 'function') {
        try {
          const perm = await DeviceOrientation.requestPermission();
          if (perm === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch {
          // Permission denied or not available
        }
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };
    requestOrientation();

    // Focus analysis loop — throttled & downscaled for performance
    const analyze = () => {
      animFrameRef.current = requestAnimationFrame(analyze);
      frameCountRef.current++;

      if (frameCountRef.current % ANALYZE_INTERVAL !== 0) return;
      if (!videoRef.current || !ctx) return;
      const video = videoRef.current;
      if (video.readyState < 2) return;

      // Downscale to 320×240 for fast pixel readback
      const ANALYSIS_W = 320;
      const ANALYSIS_H = 240;
      canvas.width = ANALYSIS_W;
      canvas.height = ANALYSIS_H;
      ctx.drawImage(video, 0, 0, ANALYSIS_W, ANALYSIS_H);

      // Sample center region (~40% of center)
      const cropX = ANALYSIS_W * 0.3;
      const cropY = ANALYSIS_H * 0.25;
      const cropW = ANALYSIS_W * 0.4;
      const cropH = ANALYSIS_H * 0.5;

      const imageData = ctx.getImageData(cropX, cropY, cropW, cropH);
      const pixels = imageData.data;

      // Simple Laplacian-like edge detection variance
      let totalVariance = 0;
      let count = 0;
      for (let y = 1; y < cropH - 1; y += 2) {
        for (let x = 1; x < cropW - 1; x += 2) {
          const idx = (y * cropW + x) * 4;
          const gray = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
          const idxN = ((y - 1) * cropW + x) * 4;
          const idxS = ((y + 1) * cropW + x) * 4;
          const idxE = (y * cropW + (x + 1)) * 4;
          const idxW = (y * cropW + (x - 1)) * 4;
          const laplacian = Math.abs(
            (0.299 * pixels[idxN] + 0.587 * pixels[idxN + 1] + 0.114 * pixels[idxN + 2]) +
            (0.299 * pixels[idxS] + 0.587 * pixels[idxS + 1] + 0.114 * pixels[idxS + 2]) +
            (0.299 * pixels[idxE] + 0.587 * pixels[idxE + 1] + 0.114 * pixels[idxE + 2]) +
            (0.299 * pixels[idxW] + 0.587 * pixels[idxW + 1] + 0.114 * pixels[idxW + 2]) -
            4 * gray
          );
          totalVariance += laplacian;
          count++;
        }
      }

      const avgEdge = count > 0 ? totalVariance / count : 0;

      if (avgEdge < 8) {
        setFocusFeedback('blurry');
      } else if (avgEdge < 20) {
        setFocusFeedback('fair');
      } else {
        setFocusFeedback('good');
      }
    };

    animFrameRef.current = requestAnimationFrame(analyze);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [state]);

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedUrl(dataUrl);
    setState('captured');
  };

  // Use captured photo
  const usePhoto = () => {
    if (!capturedUrl) return;
    const byteString = atob(capturedUrl.split(',')[1]);
    const mimeString = capturedUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: mimeString });

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    onCapture(file);
  };

  // Retake
  const retake = () => {
    setCapturedUrl('');
    setState('active');
  };

  // Close
  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    onClose();
  };

  // Retry after denied
  const retryCamera = () => {
    setRetryCount(c => c + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Always-mounted video — hidden when not active so ref is always available */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={cn(
          'absolute inset-0 h-full w-full object-cover',
          state !== 'active' && 'hidden'
        )}
      />

      {/* Requesting */}
      {state === 'requesting' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <p className="text-sm text-white/70">Requesting camera access...</p>
          </div>
        </div>
      )}

      {/* Denied */}
      {state === 'denied' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 px-8 text-center">
            <Camera className="h-12 w-12 text-white/50" />
            <p className="text-sm text-white/70">
              Camera access denied. Please allow camera access in your browser settings or use &ldquo;Browse Files&rdquo; instead.
            </p>
            <div className="flex gap-3">
              <button
                onClick={retryCamera}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
              >
                Browse Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active — live view */}
      {state === 'active' && (
        <div className="relative h-full w-full flex flex-col">
          <div className="relative flex-1 overflow-hidden">
            <ViewfinderOverlay focusFeedback={focusFeedback} stability={stability} />

            {/* Top controls */}
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              {torchSupported && (
                <button
                  onClick={toggleTorch}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white"
                >
                  {torchOn ? <LightningSlash className="h-5 w-5" /> : <Lightning className="h-5 w-5" />}
                </button>
              )}
            </div>

            {/* Switch camera button */}
            <button
              onClick={switchCamera}
              className="absolute top-4 left-[calc(4rem+0.5rem)] z-20 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white"
            >
              <ArrowsClockwise className="h-4 w-4" />
            </button>
          </div>

          {/* Bottom controls */}
          <div className="relative flex flex-col items-center py-6 bg-black gap-2">
            {!captureReady && (
              <span className="text-xs text-white/60">
                {focusFeedback === 'blurry' ? 'Blurry — hold steady' : stability === 'unstable' ? 'Hold still...' : 'Position receipt in frame'}
              </span>
            )}
            <button
              onClick={capturePhoto}
              className={cn(
                'h-16 w-16 rounded-full border-4 flex items-center justify-center transition-all active:scale-95',
                captureReady
                  ? 'border-white opacity-100'
                  : 'border-white/40 opacity-60'
              )}
            >
              <div className={cn(
                'h-12 w-12 rounded-full transition-all',
                captureReady ? 'bg-white' : 'bg-white/40'
              )} />
            </button>
          </div>
        </div>
      )}

      {/* Captured — preview */}
      {state === 'captured' && (
        <div className="relative h-full w-full flex flex-col">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capturedUrl}
            alt="Captured receipt"
            className="flex-1 object-contain"
          />

          {/* Bottom actions */}
          <div className="flex items-center justify-center gap-4 py-6 bg-black">
            <button
              onClick={retake}
              className="px-6 py-3 rounded-lg border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Retake
            </button>
            <button
              onClick={usePhoto}
              className="px-8 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Use Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
