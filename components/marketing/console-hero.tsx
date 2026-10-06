// components/marketing/console-hero.tsx
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface StatusItem {
  label: string;
  value: string;
}

interface ConsoleHeroProps {
  prompt: string;
  title: ReactNode;
  description: string;
  tagline?: string;
  status?: StatusItem[];
  icon?: ReactNode;
}

export function ConsoleHero({ prompt, title, description, tagline, status = [], icon }: ConsoleHeroProps) {
  return (
    <div className="relative overflow-hidden bg-[#0B0D12] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

      <div className="relative max-w-5xl mx-auto px-4 py-16 sm:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] text-primary mb-6"
        >
          {icon}
          <span>&gt; {prompt}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.15] max-w-3xl mx-auto"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 text-white/50 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed"
        >
          {description}
        </motion.p>

        {tagline && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3 font-mono text-xs text-white/30"
          >
            {tagline}
          </motion.p>
        )}

        {status.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[11px]"
          >
            {status.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/40">{s.label}</span>
                <span className="text-white/80">{s.value}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}