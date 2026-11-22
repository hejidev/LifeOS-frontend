"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Section } from "@/components/app/kit";
import { saveTextAs } from "@/lib/download";
import { cn } from "@/lib/utils";

export function QrPanel({ value, fileName }: { value: string; fileName: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    QRCode.toDataURL(value, { width: 640, margin: 3, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setImage(url);
      })
      .catch(() => {
        if (!cancelled) {
          setImage(null);
          setError("That's too much data for one QR code. Shorten it.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  async function downloadSvg() {
    const svg = await QRCode.toString(value, { type: "svg", margin: 3, errorCorrectionLevel: "M" });
    saveTextAs(svg, `${fileName}.svg`, "image/svg+xml");
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!image) return <div className="mx-auto h-64 w-64 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-3">
      <img src={image} alt="QR code" className="mx-auto h-64 w-64 rounded-lg border bg-white" />
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" asChild><a href={image} download={`${fileName}.png`}><Download className="mr-1.5 h-3.5 w-3.5" /> PNG</a></Button>
        <Button size="sm" variant="outline" onClick={downloadSvg}><Download className="mr-1.5 h-3.5 w-3.5" /> SVG</Button>
      </div>
    </div>
  );
}

const escapeWifi = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");

function whatsappNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
}

const KINDS = [
  { key: "text", label: "Text or link" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "whatsapp", label: "WhatsApp" },
] as const;

export function QrTool() {
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("text");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState({ ssid: "", password: "", security: "WPA" });
  const [chat, setChat] = useState({ phone: "", message: "" });

  let value = "";
  if (kind === "text") value = text.trim();
  if (kind === "wifi" && wifi.ssid.trim()) {
    value = wifi.security === "nopass" ? `WIFI:T:nopass;S:${escapeWifi(wifi.ssid)};;` : `WIFI:T:${wifi.security};S:${escapeWifi(wifi.ssid)};P:${escapeWifi(wifi.password)};;`;
  }
  if (kind === "whatsapp") {
    const number = whatsappNumber(chat.phone);
    if (number.length >= 8) value = `https://wa.me/${number}${chat.message.trim() ? `?text=${encodeURIComponent(chat.message.trim())}` : ""}`;
  }

  const select = "flex h-10 w-full rounded-lg border bg-background px-3 text-sm";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Create a QR code">
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((item) => (
            <button key={item.key} type="button" onClick={() => setKind(item.key)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", kind === item.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{item.label}</button>
          ))}
        </div>

        {kind === "text" && (
          <div className="space-y-1"><Label>Text or URL</Label><Textarea rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder="https://example.com" maxLength={2000} /></div>
        )}

        {kind === "wifi" && (
          <div className="space-y-3">
            <div className="space-y-1"><Label>Network name</Label><Input value={wifi.ssid} onChange={(event) => setWifi((current) => ({ ...current, ssid: event.target.value }))} maxLength={64} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Security</Label><select className={select} value={wifi.security} onChange={(event) => setWifi((current) => ({ ...current, security: event.target.value }))}><option value="WPA">WPA/WPA2/WPA3</option><option value="WEP">WEP</option><option value="nopass">No password</option></select></div>
              {wifi.security !== "nopass" && <div className="space-y-1"><Label>Password</Label><Input value={wifi.password} onChange={(event) => setWifi((current) => ({ ...current, password: event.target.value }))} maxLength={64} /></div>}
            </div>
            <p className="text-xs text-muted-foreground">Guests scan it with their camera to join the network.</p>
          </div>
        )}

        {kind === "whatsapp" && (
          <div className="space-y-3">
            <div className="space-y-1"><Label>WhatsApp number</Label><Input value={chat.phone} onChange={(event) => setChat((current) => ({ ...current, phone: event.target.value }))} placeholder="0801 234 5678 or +234 801 234 5678" /></div>
            <div className="space-y-1"><Label>Starting message (optional)</Label><Input value={chat.message} onChange={(event) => setChat((current) => ({ ...current, message: event.target.value }))} maxLength={300} /></div>
            <p className="text-xs text-muted-foreground">Numbers starting with 0 are treated as Nigerian. For other countries, include the country code.</p>
          </div>
        )}
      </Section>

      <Section title="Your QR code">
        {value ? <QrPanel value={value} fileName={`qr-${kind}`} /> : <p className="py-10 text-center text-sm text-muted-foreground">Fill in the details and your QR code appears here.</p>}
      </Section>
    </div>
  );
}