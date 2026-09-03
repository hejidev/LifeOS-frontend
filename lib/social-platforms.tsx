import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import {
  SiDiscord,
  SiFacebook,
  SiGithub,
  SiInstagram,
  SiPinterest,
  SiReddit,
  SiSnapchat,
  SiSpotify,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiTwitch,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { HiOutlineEnvelope, HiOutlineGlobeAlt, HiOutlinePhone } from "react-icons/hi2";
import { LuLink } from "react-icons/lu";

function LinkedInIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.127 0 2.063 2.063 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export interface PlatformConfig {
  label: string;
  color: string;
  iconBg: string;
  iconColor: string;
  Icon: IconType;
}

export const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  instagram: {
    label: "Instagram",
    color: "#E4405F",
    iconBg: "rgba(228, 64, 95, 0.15)",
    iconColor: "#E4405F",
    Icon: SiInstagram,
  },
  twitter: {
    label: "X (Twitter)",
    color: "#ffffff",
    iconBg: "rgba(255, 255, 255, 0.12)",
    iconColor: "#ffffff",
    Icon: SiX,
  },
  tiktok: {
    label: "TikTok",
    color: "#ff0050",
    iconBg: "rgba(255, 0, 80, 0.15)",
    iconColor: "#ff0050",
    Icon: SiTiktok,
  },
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    iconBg: "rgba(24, 119, 242, 0.15)",
    iconColor: "#1877F2",
    Icon: SiFacebook,
  },
  youtube: {
    label: "YouTube",
    color: "#FF0000",
    iconBg: "rgba(255, 0, 0, 0.15)",
    iconColor: "#FF0000",
    Icon: SiYoutube,
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    iconBg: "rgba(10, 102, 194, 0.15)",
    iconColor: "#0A66C2",
    Icon: LinkedInIcon as IconType,
  },
  snapchat: {
    label: "Snapchat",
    color: "#FFFC00",
    iconBg: "rgba(255, 252, 0, 0.12)",
    iconColor: "#FFFC00",
    Icon: SiSnapchat,
  },
  pinterest: {
    label: "Pinterest",
    color: "#E60023",
    iconBg: "rgba(230, 0, 35, 0.15)",
    iconColor: "#E60023",
    Icon: SiPinterest,
  },
  threads: {
    label: "Threads",
    color: "#ffffff",
    iconBg: "rgba(255, 255, 255, 0.12)",
    iconColor: "#ffffff",
    Icon: SiThreads,
  },
  whatsapp: {
    label: "WhatsApp",
    color: "#25D366",
    iconBg: "rgba(37, 211, 102, 0.15)",
    iconColor: "#25D366",
    Icon: SiWhatsapp,
  },
  telegram: {
    label: "Telegram",
    color: "#26A5E4",
    iconBg: "rgba(38, 165, 228, 0.15)",
    iconColor: "#26A5E4",
    Icon: SiTelegram,
  },
  discord: {
    label: "Discord",
    color: "#5865F2",
    iconBg: "rgba(88, 101, 242, 0.15)",
    iconColor: "#5865F2",
    Icon: SiDiscord,
  },
  twitch: {
    label: "Twitch",
    color: "#9146FF",
    iconBg: "rgba(145, 70, 255, 0.15)",
    iconColor: "#9146FF",
    Icon: SiTwitch,
  },
  github: {
    label: "GitHub",
    color: "#ffffff",
    iconBg: "rgba(255, 255, 255, 0.12)",
    iconColor: "#ffffff",
    Icon: SiGithub,
  },
  spotify: {
    label: "Spotify",
    color: "#1DB954",
    iconBg: "rgba(29, 185, 84, 0.15)",
    iconColor: "#1DB954",
    Icon: SiSpotify,
  },
  reddit: {
    label: "Reddit",
    color: "#FF4500",
    iconBg: "rgba(255, 69, 0, 0.15)",
    iconColor: "#FF4500",
    Icon: SiReddit,
  },
  website: {
    label: "Website",
    color: "#6366f1",
    iconBg: "rgba(99, 102, 241, 0.15)",
    iconColor: "#6366f1",
    Icon: HiOutlineGlobeAlt,
  },
  email: {
    label: "Email",
    color: "#6366f1",
    iconBg: "rgba(99, 102, 241, 0.15)",
    iconColor: "#6366f1",
    Icon: HiOutlineEnvelope,
  },
  phone: {
    label: "Phone",
    color: "#6366f1",
    iconBg: "rgba(99, 102, 241, 0.15)",
    iconColor: "#6366f1",
    Icon: HiOutlinePhone,
  },
};

const FALLBACK_CONFIG: PlatformConfig = {
  label: "Link",
  color: "#a1a1aa",
  iconBg: "rgba(161, 161, 170, 0.12)",
  iconColor: "#a1a1aa",
  Icon: LuLink,
};

export function getPlatformConfig(platform: string): PlatformConfig {
  return PLATFORM_CONFIG[platform] ?? {
    ...FALLBACK_CONFIG,
    label: platform.charAt(0).toUpperCase() + platform.slice(1),
  };
}

export function getLinkLabel(platform: string, customLabel?: string): string {
  if (customLabel?.trim()) return customLabel.trim();
  return getPlatformConfig(platform).label;
}
