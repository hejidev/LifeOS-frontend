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
  PenTool,
  Image,
  FileType,
  Globe,
  Shield,
  Settings,
  type LucideIcon,
  BriefcaseBusiness,
  Calendar,
  Bell, CreditCard, Flag,
  LifeBuoy
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
      { title: "Calendar", href: "/app/calendar", icon: Calendar },
      { title: "Goals", href: "/app/goals", icon: Flag },
      { title: "AI Assistant", href: "/app/ai", icon: Sparkles },
    ],
  },
  {
    label: "Life Modules",
    items: [
      { title: "Finance", href: "/app/finance", icon: Wallet },
      { title: "Health", href: "/app/health", icon: Heart },
      { title: "Habits", href: "/app/habits", icon: Target },
      { title: "Study", href: "/app/study", icon: GraduationCap },
      { title: "Career", href: "/app/career", icon: Briefcase },
      { title: "Documents", href: "/app/documents", icon: FolderLock },
      { title: "Password Vault", href: "/app/password-vault", icon: KeyRound },
      { title: "Family Space", href: "/app/family", icon: Users },
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
  { title: "Notifications", href: "/app/notifications", icon: Bell },
  { title: "Billing", href: "/app/billing", icon: CreditCard },
  { title: "Contact Support", href: "/app/contact", icon: LifeBuoy },
  { title: "Settings", href: "/app/settings", icon: Settings },
];

