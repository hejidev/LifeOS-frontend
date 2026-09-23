"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ShoppingBag, Sparkles } from "lucide-react";
import { usePosDisplayReceiver, type PosDisplayState } from "@/lib/hooks/use-pos-display";

export default function CustomerDisplayPage() {
  const params = useSearchParams();
  const sessionId = params.get("session");
  const [state, setState] = useState<PosDisplayState | null>(null);

  usePosDisplayReceiver(sessionId, useCallback((s) => setState(s), []));

  if (!sessionId) {
    return (
      <div className="flex h-[100dvh] w-[100dvw] items-center justify-center bg-[#0B0F1A] text-white/40 font-mono px-6 text-center" style={{ fontSize: "clamp(0.85rem, 1.6vw, 1.1rem)" }}>
        No session — open this from the POS terminal.
      </div>
    );
  }

  const status = state?.status ?? "idle";

  return (
    <div className="relative h-[100dvh] w-[100dvw] overflow-hidden bg-[#0B0F1A] text-white flex flex-col">
      <BackgroundGlow status={status} />

      <AnimatePresence mode="wait">
        {status === "idle" && <IdleScreen key="idle" businessName={state?.businessName} />}
        {status === "shopping" && <ShoppingScreen key="shopping" state={state!} />}
        {status === "paid" && <PaidScreen key="paid" state={state!} />}
      </AnimatePresence>
    </div>
  );
}

function BackgroundGlow({ status }: { status: string }) {
  return (
    <>
      <div
        className="pointer-events-none absolute -top-1/4 left-1/2 -translate-x-1/2 rounded-full blur-[min(15vw,180px)] transition-colors duration-700"
        style={{
          width: "60vmin",
          height: "60vmin",
          background: status === "paid" ? "rgba(16,185,129,0.18)" : "rgba(99,102,241,0.14)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "clamp(20px, 2.5vw, 32px) clamp(20px, 2.5vw, 32px)",
        }}
      />
    </>
  );
}

// ── BEFORE: idle, waiting for the next customer ─────────────────────────
function IdleScreen({ businessName }: { businessName?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative z-10 flex flex-1 flex-col items-center justify-center gap-[clamp(1rem,3vh,2rem)] px-[6vw] text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center justify-center rounded-full bg-white/[0.04] border border-white/10"
        style={{ width: "clamp(4.5rem, 12vmin, 7rem)", height: "clamp(4.5rem, 12vmin, 7rem)" }}
      >
        <ShoppingBag className="text-white/50" style={{ width: "clamp(2rem, 5vmin, 3rem)", height: "clamp(2rem, 5vmin, 3rem)" }} />
      </motion.div>

      <div className="space-y-2">
        <p className="font-medium text-white/90" style={{ fontSize: "clamp(1.5rem, 4.5vmin, 2.75rem)" }}>
          {businessName ?? "Welcome"}
        </p>
        <p className="font-mono text-white/35 tracking-wide" style={{ fontSize: "clamp(0.9rem, 2vmin, 1.25rem)" }}>
          Ready when you are — we'll ring you up right here.
        </p>
      </div>

      <div className="flex items-center gap-2 pt-[clamp(0.5rem,1.5vh,1rem)]">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" style={{ width: "clamp(0.4rem,0.8vmin,0.6rem)", height: "clamp(0.4rem,0.8vmin,0.6rem)" }} />
        <span className="font-mono text-white/30" style={{ fontSize: "clamp(0.65rem, 1.3vmin, 0.85rem)" }}>
          Terminal connected
        </span>
      </div>
    </motion.div>
  );
}

// ── DURING: live shopping cart ───────────────────────────────────────────
function ShoppingScreen({ state }: { state: PosDisplayState }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative z-10 flex flex-1 flex-col"
      style={{ padding: "clamp(1.25rem, 4vmin, 3.5rem)" }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: "clamp(1rem, 3vh, 2rem)" }}>
        <p className="text-white/50 font-medium" style={{ fontSize: "clamp(1rem, 2.2vmin, 1.5rem)" }}>
          {state.businessName}
        </p>
        {state.servedBy && (
          <p className="text-white/30 font-mono" style={{ fontSize: "clamp(0.7rem, 1.4vmin, 1rem)" }}>
            Served by {state.servedBy}
          </p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ marginRight: "-1vw" }}>
        {state.lines.length === 0 ? (
          <p className="text-white/20 text-center" style={{ fontSize: "clamp(1.1rem, 2.5vmin, 1.8rem)", paddingTop: "8vh" }}>
            Ready when you are.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {state.lines.map((l, i) => (
              <motion.div
                key={`${l.name}-${i}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="flex items-baseline justify-between border-b border-white/[0.06]"
                style={{ paddingBlock: "clamp(0.6rem, 1.6vh, 1.2rem)" }}
              >
                <div className="flex items-baseline gap-[1.5vw] min-w-0">
                  <span className="font-medium truncate" style={{ fontSize: "clamp(1.1rem, 2.8vmin, 2rem)" }}>{l.name}</span>
                  <span className="text-white/35 font-mono shrink-0" style={{ fontSize: "clamp(0.8rem, 1.8vmin, 1.3rem)" }}>× {l.quantity}</span>
                </div>
                <span className="font-mono tabular-nums shrink-0 pl-4" style={{ fontSize: "clamp(1.1rem, 2.8vmin, 2rem)" }}>
                  {state.currency} {(l.unitPrice * l.quantity).toLocaleString()}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="border-t-2 border-white/10" style={{ paddingTop: "clamp(1rem, 3vh, 2rem)", marginTop: "clamp(0.75rem, 2vh, 1.5rem)" }}>
        {state.discount > 0 && (
          <div className="flex items-center justify-between text-white/50" style={{ fontSize: "clamp(0.9rem, 2vmin, 1.4rem)", marginBottom: "0.5em" }}>
            <span>Discount</span>
            <span className="font-mono">-{state.currency} {state.discount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex items-end justify-between">
          <span className="text-white/60 font-medium" style={{ fontSize: "clamp(1.1rem, 2.5vmin, 1.75rem)" }}>Total</span>
          <motion.span
            key={state.total}
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            className="font-mono font-bold tabular-nums"
            style={{ fontSize: "clamp(2.25rem, 7vmin, 5rem)" }}
          >
            {state.currency} {state.total.toLocaleString()}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}

// ── AFTER: payment confirmed ──────────────────────────────────────────────
function PaidScreen({ state }: { state: PosDisplayState }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="relative z-10 flex flex-1 flex-col items-center justify-center gap-[clamp(1rem,3vh,2rem)] px-[6vw] text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        className="flex items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-400/30"
        style={{ width: "clamp(5rem, 13vmin, 8rem)", height: "clamp(5rem, 13vmin, 8rem)" }}
      >
        <CheckCircle2 className="text-emerald-400" style={{ width: "clamp(2.25rem, 6vmin, 3.5rem)", height: "clamp(2.25rem, 6vmin, 3.5rem)" }} />
      </motion.div>

      <div className="space-y-3">
        <p className="font-semibold" style={{ fontSize: "clamp(1.75rem, 5.5vmin, 3.25rem)" }}>Payment received</p>
        <p className="text-white/40 font-mono" style={{ fontSize: "clamp(0.9rem, 2vmin, 1.25rem)" }}>Thank you for shopping with {state.businessName}!</p>
      </div>

      <div
        className="rounded-2xl border border-white/10 bg-white/[0.03] w-full max-w-[min(90vw,28rem)]"
        style={{ padding: "clamp(1rem, 3vmin, 1.75rem)" }}
      >
        <div className="flex items-center justify-between text-white/50" style={{ fontSize: "clamp(0.85rem, 1.8vmin, 1.1rem)" }}>
          <span className="flex items-center gap-1.5"><Sparkles className="h-[1em] w-[1em]" /> Total charged</span>
          <span className="font-mono font-bold text-white" style={{ fontSize: "clamp(1.3rem, 3vmin, 2rem)" }}>
            {state.currency} {state.total.toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}