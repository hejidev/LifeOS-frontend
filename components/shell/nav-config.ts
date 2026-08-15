import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Sparkles,
  Wallet,
  Heart,
  GraduationCap,
  Briefcase,
  FolderLock,
  KeyRound,
  Target,
  Users,
  Building2,
  PenTool,
  Image,
  FileType,
  Globe,
  Shield,
  Settings,
  type LucideIcon,
  BriefcaseBusiness,
  Calendar,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  comingSoon?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const mainNavGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { title: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
      { title: "Tasks", href: "/app/tasks", icon: CheckSquare },
      { title: "Notes", href: "/app/notes", icon: FileText },
      { title: "AI Assistant", href: "/app/ai", icon: Sparkles },
    ],
  },
  {
    label: "Life Modules",
    items: [
      { title: "Finance", href: "/app/finance", icon: Wallet, comingSoon: false },
      { title: "Health", href: "/app/health", icon: Heart, comingSoon: false },
      { title: "Study", href: "/app/study", icon: GraduationCap, comingSoon: false },
      { title: "Career", href: "/app/career", icon: Briefcase, comingSoon: false },
      { title: "Documents", href: "/app/documents", icon: FolderLock, comingSoon: false },
      { title: "Password Vault", href: "/app/password-vault", icon: KeyRound, comingSoon: false },
      { title: "Habits", href: "/app/habits", icon: Target, comingSoon: false },
      { title: "Calendar", href: "/app/calendar", icon: Calendar, comingSoon: false },
      { title: "Family Space", href: "/app/family", icon: Users, comingSoon: false },
      { title: "Billing", href: "/app/billing", icon: Building2, comingSoon: false },
      { title: "Contact Support", href: "/app/contact", icon: Building2, comingSoon: false },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "AI Writing", href: "/app/ai-writing", icon: PenTool, comingSoon: false },
      { title: "AI Image Tools", href: "/app/ai-image-tools", icon: Image, comingSoon: false },
      { title: "File Converter", href: "/app/file-converter", icon: FileType, comingSoon: false },
      { title: "Global Utilities", href: "/app/utilities", icon: Globe, comingSoon: false },
      { title: "Emergency Vault", href: "/app/emergency-vault", icon: Shield, comingSoon: false },
    ],
  },
];

export const bottomNavItems: NavItem[] = [
  { title: "Settings", href: "/app/settings", icon: Settings },
];

