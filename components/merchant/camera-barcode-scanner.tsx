"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CameraBarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetect: (code: string) => void;
}

const SUPPORTED_FORMATS = [
  "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "codabar", "itf", "qr_code",
];

export function CameraBarcodeScanner({ open, onOpenChange, onDetect }: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const lastDetectedRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setReady(false);

    async function start() {
      try {
        await import("barcode-detector-api-polyfill");
        if (!("BarcodeDetector" in window)) {
          throw new Error("Barcode scanning isn't supported in this browser");
        }
        detectorRef.current = new (window as any).BarcodeDetector({ formats: SUPPORTED_FORMATS });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        scanLoop();
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.name === "NotAllowedError"
              ? "Camera access was denied. Allow camera permission and try again."
              : err?.message ?? "Couldn't start the camera."
          );
        }
      }
    }

    function scanLoop() {
      rafRef.current = requestAnimationFrame(async () => {
        if (cancelled || !videoRef.current || !detectorRef.current) return;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length > 0) {
            const value = codes[0].rawValue;
            const now = Date.now();
            const last = lastDetectedRef.current;
            if (value !== last.code || now - last.time > 2000) {
              lastDetectedRef.current = { code: value, time: now };
              onDetect(value);
            }
          }
        } catch {}
        scanLoop();
      });
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, onDetect]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" /> Scan with camera
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {error ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : (
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                  Starting camera...
                </div>
              )}
              <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" />
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Hold a barcode steady inside the frame.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}