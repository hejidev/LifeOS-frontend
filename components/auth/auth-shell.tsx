"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Terminal, Sparkles, Shield, Zap, Lock, Activity, Cpu, } from "lucide-react";

interface Module {
  label: string;
  value: string;
}

interface AuthShellProps {
  prompt: string;
  headline: string;
  modules: Module[];
  children: React.ReactNode;
  variant?: "default" | "gradient" | "cyber" | "matrix";
}

function AnimatedGrid() {
  return (
    <div className="absolute inset-0 opacity-[0.03]">
      <div
        className="h-full w-full"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          animation: "gridMove 20s linear infinite",
        }}
      />
      <style jsx>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
      `}</style>
    </div>
  );
}

function FloatingParticles() {
  const particles = Array.from({ length: 30 });

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary"
          initial={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
            opacity: Math.random() * 0.5 + 0.2,
          }}
          animate={{
            y: [null, Math.random() * -100 - 50],
            opacity: [null, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );
}

function RotatingRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-[#E8A33D]/10"
          style={{
            width: `${i * 180}px`,
            height: `${i * 180}px`,
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{
            duration: 40 + i * 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function DataStreams() {
  const lines = Array.from({ length: 8 });

  return (
    <div className="absolute inset-0 overflow-hidden">
      {lines.map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px w-50 bg-linear-to-r from-transparent via-primary/30 to-transparent"
          initial={{
            x: -200,
            y: `${10 + i * 12}%`,
            opacity: 0,
          }}
          animate={{
            x: "100%",
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function TerminalOutput() {
  const [lines, setLines] = useState<string[]>([]);
  const outputs = [
    "Initializing secure session...",
    "Encrypting connection...",
    "Verifying credentials...",
    "Loading user modules...",
    "Syncing with server...",
    "Optimizing performance...",
    "Preparing dashboard...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLines((prev) => {
        const newLines = [...prev, outputs[Math.floor(Math.random() * outputs.length)]];
        return newLines.slice(-6);
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-[10px] text-white/30 space-y-1">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <span className="text-[#E8A33D]">›</span>
          <span>{line}</span>
        </motion.div>
      ))}
    </div>
  );
}

function AnimatedStats() {
  const [stats, setStats] = useState({ users: 12847, sessions: 3421, uptime: 99.99 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        users: prev.users + Math.floor(Math.random() * 10) - 3,
        sessions: prev.sessions + Math.floor(Math.random() * 20) - 8,
        uptime: Math.min(99.99, Math.max(99.9, prev.uptime + (Math.random() * 0.02 - 0.01))),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
      <div className="text-center">
        <div className="text-white/40">USERS</div>
        <div className="text-primary text-sm">{stats.users.toLocaleString()}</div>
      </div>
      <div className="text-center border-l border-white/10">
        <div className="text-white/40">SESSIONS</div>
        <div className="text-primary text-sm">{stats.sessions.toLocaleString()}</div>
      </div>
      <div className="text-center border-l border-white/10">
        <div className="text-white/40">UPTIME</div>
        <div className="text-primary text-sm">{stats.uptime}%</div>
      </div>
    </div>
  );
}

function SystemStatus() {
  const systems = [
    { name: "AUTH", status: "operational" },
    { name: "DB", status: "optimal" },
    { name: "API", status: "responsive" },
    { name: "CACHE", status: "warm" },
  ];

  return (
    <div className="space-y-1">
      {systems.map((sys) => (
        <motion.div
          key={sys.name}
          className="flex items-center justify-between font-mono text-[10px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="text-white/40">{sys.name}</span>
          <div className="flex items-center gap-1.5">
            <motion.div
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-white/60">{sys.status}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FeatureHighlights() {
  const features = [
    { icon: Shield, text: "End-to-end encryption" },
    { icon: Zap, text: "Lightning-fast auth" },
    { icon: Lock, text: "Multi-factor security" },
    { icon: Activity, text: "Real-time monitoring" },
  ];

  return (
    <div className="space-y-1">
      {features.map((f, i) => (
        <motion.div
          key={f.text}
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15 }}
        >
          <f.icon className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[10px] text-white/70">{f.text}</span>
        </motion.div>
      ))}
    </div>
  );
}

export function AuthShell({ prompt, headline, modules, children, variant = "default" }: AuthShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] bg-[#FDFDFB] -mt-5">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0B0D12] px-12 py-8 text-white">
        <AnimatedGrid />
        <FloatingParticles />
        <RotatingRings />
        <DataStreams />

        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          {/* <Link href="/" className="inline-flex items-center gap-2 group"> */}
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">LifeOS</span>
            <motion.span
              aria-hidden
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
              className="font-mono text-sm text-primary"
            >
              _
            </motion.span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative z-10 flex-1 flex flex-col justify-center space-y-10"
        >
          <div className="space-y-2">
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] text-primary"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Activity className="h-3 w-3" />
              <span>{prompt}</span>
            </motion.div>

            <h1 className="max-w-lg text-3xl font-bold leading-[1.2] tracking-tight text-white">
              {headline}
            </h1>

            <motion.p
              className="max-w-md text-sm text-white/50 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Experience the next generation of secure authentication. Built for developers, designed for everyone.
            </motion.p>
          </div>

          <FeatureHighlights />

          <div className="space-y-2">
            <div className="border-t border-white/10 pt-4">
              <SystemStatus />
            </div>
          </div>

          <AnimatedStats />

          <div className="border-t border-white/10">
            {modules.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.12, duration: 0.5 }}
                className="flex items-center justify-between border-b border-white/10 py-2.5 font-mono text-xs"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  />
                  <span className="text-white/45">{m.label}</span>
                </div>
                <span className="text-white/85">{m.value}</span>
              </motion.div>
            ))}
          </div>

          <TerminalOutput />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="relative z-10 space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              <Cpu className="h-3.5 w-3.5 text-primary/60" />
            </motion.div>
            <div className="h-px flex-1 bg-gradient-to-l from-primary/50 to-transparent" />
          </div>

          <p className="font-mono text-[10px] text-white/30 text-center">
            © {new Date().getFullYear()} lifeos — all systems operational
          </p>
        </motion.div>
      </div>

      <div className="flex items-center justify-center px-6 py-8 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">LifeOS</span>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
