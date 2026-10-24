"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function PrintArea({ text }: { text: string | null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !text) return null;

  return createPortal(
    <div id="print-area">
      <pre>{text}</pre>
      <style>{`
        #print-area { display: none; }
        @page { margin: 0; }
        @media print {
          body > *:not(#print-area) { display: none !important; }
          #print-area { display: block; width: 72mm; padding: 3mm 2mm; background: #fff; color: #000; }
          #print-area pre {
            margin: 0;
            font: 10.5px/1.35 "Courier New", Consolas, monospace;
            white-space: pre-wrap;
            word-break: break-word;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}