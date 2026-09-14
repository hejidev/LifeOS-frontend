"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MarketingPageHeaderProps {
  title: ReactNode;
  description?: string;
  tagline?: string;
  icon?: ReactNode;
  size?: "hero" | "default";
}

export function MarketingPageHeader({ title, description, tagline, icon, size = "default" }: MarketingPageHeaderProps) {
  const isHero = size === "hero";

  return (
    <section className="relative overflow-hidden px-4 pt-14 sm:pt-20 pb-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]",
            isHero ? "-top-24 h-[420px] w-[420px]" : "-top-16 h-[260px] w-[260px]"
          )}
        />
      </div>

      <div className="max-w-3xl mx-auto text-center">
        {icon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4"
          >
            {icon}
          </motion.div>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={cn("leading-[0.92] tracking-tight", isHero ? "text-5xl sm:text-7xl" : "text-4xl sm:text-5xl")}
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {title}
        </motion.h1>

        {description && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.5 }}
            className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {description}
          </motion.p>
        )}

        {tagline && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.32, duration: 0.5 }}
            className="mt-5 text-sm text-muted-foreground/80"
          >
            {tagline}
          </motion.p>
        )}
      </div>
    </section>
  );
}