"use client";

import { useEffect, useState } from "react";
import { Binary, Braces, Coins, Fingerprint, Hash, KeyRound, Languages, Link2, Palette, QrCode, Type, Wrench } from "lucide-react";
import { PageHeader } from "@/components/app/kit";
import { CurrencyTool } from "@/components/utilities/currency-tool";
import { LinkPageTool } from "@/components/utilities/link-page-tool";
import { Base64Tool, ColorTool, HashTool, JsonTool, PasswordTool, TextTool, UuidTool } from "@/components/utilities/local-tools";
import { QrTool } from "@/components/utilities/qr-tool";
import { TranslateTool } from "@/components/utilities/translate-tool";
import { cn } from "@/lib/utils";

const TOOLS = [
  { key: "currency", label: "Currency", group: "Everyday", icon: Coins, view: CurrencyTool },
  { key: "translate", label: "Translate", group: "Everyday", icon: Languages, view: TranslateTool },
  { key: "qr", label: "QR codes", group: "Everyday", icon: QrCode, view: QrTool },
  { key: "link", label: "Link page", group: "Everyday", icon: Link2, view: LinkPageTool },
  { key: "text", label: "Text", group: "Everyday", icon: Type, view: TextTool },
  { key: "password", label: "Password", group: "Security", icon: KeyRound, view: PasswordTool },
  { key: "hash", label: "Hash", group: "Security", icon: Hash, view: HashTool },
  { key: "uuid", label: "UUID", group: "Developer", icon: Fingerprint, view: UuidTool },
  { key: "json", label: "JSON", group: "Developer", icon: Braces, view: JsonTool },
  { key: "base64", label: "Base64", group: "Developer", icon: Binary, view: Base64Tool },
  { key: "color", label: "Color", group: "Design", icon: Palette, view: ColorTool },
] as const;

type ToolKey = (typeof TOOLS)[number]["key"];
const GROUPS = ["Everyday", "Security", "Developer", "Design"];

export default function UtilitiesPage() {
  const [tool, setTool] = useState<ToolKey>("currency");

  useEffect(() => {
    const requested = window.location.hash.slice(1);
    if (TOOLS.some((item) => item.key === requested)) setTool(requested as ToolKey);
  }, []);

  function choose(key: ToolKey) {
    setTool(key);
    window.history.replaceState(null, "", `#${key}`);
  }

  const active = TOOLS.find((item) => item.key === tool)!;
  const View = active.view;

  return (
    <div className="space-y-6">
      <PageHeader icon={Wrench} title="Utilities" subtitle="Everyday tools. Most run entirely in your browser." />

      <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
        <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-4 lg:overflow-visible lg:pb-0">
          {GROUPS.map((group) => (
            <div key={group} className="flex gap-1.5 lg:flex-col lg:gap-1">
              <p className="hidden px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:block">{group}</p>
              {TOOLS.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => choose(item.key)}
                  className={cn("flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors lg:border-transparent", tool === item.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                >
                  <item.icon className="h-4 w-4" /> {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="min-w-0"><View /></div>
      </div>
    </div>
  );
}