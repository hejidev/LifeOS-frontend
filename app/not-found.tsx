"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Home, ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md space-y-6"
      >
        <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-bg mx-auto">
          <Compass className="h-8 w-8 text-white" />
        </div>

        <div className="space-y-2">
          <p className="text-7xl font-bold gradient-text leading-none">404</p>
          <h1 className="text-xl font-semibold">This page wandered off</h1>
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist, moved, or the link might be broken.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go back
          </Button>
          <Button asChild>
            <Link href="/"><Home className="mr-2 h-4 w-4" /> Go home</Link>
          </Button>
        </div>

        <div className="pt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="flex h-5 w-5 items-center justify-center rounded gradient-bg">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          LifeOS
        </div>
      </motion.div>
    </div>
  );
}