"use client";

import { useEffect, useRef } from "react";

const SCAN_CHAR_GAP_MS = 80;
const MIN_BARCODE_LENGTH = 4;

export function useBarcodeScanner(onScan: (code: string) => void, enabled = true) {
  const buffer = useRef("");
  const lastKeyTime = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTypingField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      const now = Date.now();
      const gap = now - lastKeyTime.current;
      lastKeyTime.current = now;

      if (gap > SCAN_CHAR_GAP_MS) {
        buffer.current = "";
      }

      if (e.key === "Enter") {
        const code = buffer.current;
        buffer.current = "";
        if (code.length >= MIN_BARCODE_LENGTH) {
          if (isTypingField) e.preventDefault();
          onScan(code);
        }
        return;
      }

      if (e.key.length === 1) {
        buffer.current += e.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onScan, enabled]);
}