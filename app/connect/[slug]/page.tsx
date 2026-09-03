"use client";

import { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, User } from "lucide-react";
import { api } from "@/lib/api/client";

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

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  twitter: "X (Twitter)",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  pinterest: "Pinterest",
  threads: "Threads",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  discord: "Discord",
  twitch: "Twitch",
  github: "GitHub",
  spotify: "Spotify",
  reddit: "Reddit",
  website: "Website",
  email: "Email",
  phone: "Phone",
};

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          {redirecting ? "Redirecting..." : "Loading..."}
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Profile not found</p>
          <p className="text-sm text-muted-foreground">{error ?? "This link may be invalid."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm mx-auto space-y-6"
      >
        <div className="text-center space-y-3">
          <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.displayName} className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{profile.displayName}</h1>
            {profile.bio && <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}
          </div>
        </div>

        <div className="space-y-2.5">
          {profile.links.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No links added yet.</p>
          ) : (
            profile.links.map((link, i) => (
              <a
                key={`${link.platform}-${i}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 hover:border-primary/40 hover:bg-card/80 transition-colors"
              >
                <span className="text-sm font-medium">
                  {link.label || PLATFORM_LABELS[link.platform] || link.platform}
                </span>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}