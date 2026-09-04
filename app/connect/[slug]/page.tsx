"use client";

import { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Loader2, User, UserX } from "lucide-react";
import { api } from "@/lib/api/client";
import { getLinkLabel, getPlatformConfig } from "@/lib/social-platforms";

interface PublicLink {
  platform: string;
  url: string;
  label?: string;
}

interface PublicProfile {
  slug: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  links: PublicLink[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 28 },
  },
};

function PageBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-32 left-1/2 h-105 w-105 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-80 w-[320px] rounded-full bg-violet-500/15 blur-[100px]" />
      <div className="absolute top-1/3 -left-24 h-70 w-70 rounded-full bg-indigo-600/10 blur-[90px]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}

function LoadingState({ redirecting }: { redirecting?: boolean }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <PageBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex flex-col items-center gap-4"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          {redirecting ? "Taking you there..." : "Loading profile..."}
        </p>
      </motion.div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <PageBackground />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-sm text-center space-y-4"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm">
          <UserX className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Profile not found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
      </motion.div>
    </div>
  );
}

function SocialLinkButton({ link }: { link: PublicLink }) {
  const config = getPlatformConfig(link.platform);
  const { Icon } = config;
  const label = getLinkLabel(link.platform, link.label);

  return (
    <motion.a
      variants={item}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex items-center gap-3.5 rounded-2xl border border-border/70 bg-card/70 px-4 py-3.5 backdrop-blur-sm transition-colors hover:border-border hover:bg-card"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
        style={{ backgroundColor: config.iconBg }}
      >
        <Icon className="h-5 w-5" style={{ color: config.iconColor }} aria-hidden />
      </div>

      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{label}</p>
      </div>

      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          boxShadow: `inset 0 0 0 1px ${config.color}33, 0 8px 32px -8px ${config.color}22`,
        }}
      />
    </motion.a>
  );
}

export default function PublicConnectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/public/social-profile/${encodeURIComponent(slug)}`)
      .then((data: PublicProfile) => {
        if (cancelled) return;
        setProfile(data);
        if (data.links.length === 1) {
          setRedirecting(true);
          window.location.replace(data.links[0].url);
        }
      })
      .catch((err) => {
        console.error("Failed to load social profile:", err);
        if (!cancelled) setError("This profile doesn't exist or isn't public.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading || redirecting) {
    return <LoadingState redirecting={redirecting} />;
  }

  if (error || !profile) {
    return <ErrorState message={error ?? "This link may be invalid."} />;
  }

  return (
    <div className="relative min-h-screen bg-background px-4 py-10 sm:py-14">
      <PageBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.05 }}
            className="relative mx-auto mb-5 h-fit w-fit"
          >
            <div className="absolute -inset-1 rounded-full bg-linear-to-br from-indigo-500/50 via-violet-500/40 to-indigo-600/30 blur-sm" />
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-border/80 bg-muted shadow-xl shadow-black/20">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-indigo-500/20 to-violet-500/10">
                  <User className="h-9 w-9 text-muted-foreground" />
                </div>
              )}
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="text-2xl font-semibold tracking-tight"
          >
            {profile.displayName}
          </motion.h1>

          {profile.bio && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground"
            >
              {profile.bio}
            </motion.p>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.24 }}
            className="mt-3 inline-flex items-center rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm"
          >
            @{profile.slug}
          </motion.p>
        </div>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {profile.links.length === 0 ? (
            <motion.p variants={item} className="py-8 text-center text-sm text-muted-foreground">
              No links added yet.
            </motion.p>
          ) : (
            profile.links.map((link, i) => (
              <SocialLinkButton key={`${link.platform}-${i}`} link={link} />
            ))
          )}
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-center"
        >
          <p className="text-xs text-muted-foreground/70">
            Powered by{" "}
            <span className="gradient-text font-medium">Life OS</span>
          </p>
        </motion.footer>
      </motion.div>
    </div>
  );
}