"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import { Wrench, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExchangeRates, useTranslateText } from "@/lib/hooks/use-life-data";
import { LANGUAGES } from "@/lib/data/languages";
import { useMySocialProfile, useCreateSocialProfile } from "@/lib/hooks/use-social-profile";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const TOOLS = ["currency", "language", "qr", "password", "hash", "uuid", "json", "base64", "text", "color"] as const;
type Tool = typeof TOOLS[number];

function generatePassword(length = 16) {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()-_=+";
    const bytes = new Uint32Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

async function hashText(text: string, algo: string) {
    const data = new TextEncoder().encode(text);
    const buf = await window.crypto.subtle.digest(algo, data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex: string) {
    const m = hex.replace("#", "").match(/.{1,2}/g);
    if (!m) return null;
    const [r, g, b] = m.map((x) => parseInt(x, 16));
    return { r, g, b };
}

const SOCIAL_PLATFORMS = [
    { value: "instagram", label: "Instagram" },
    { value: "twitter", label: "X (Twitter)" },
    { value: "tiktok", label: "TikTok" },
    { value: "facebook", label: "Facebook" },
    { value: "youtube", label: "YouTube" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "snapchat", label: "Snapchat" },
    { value: "pinterest", label: "Pinterest" },
    { value: "threads", label: "Threads" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "telegram", label: "Telegram" },
    { value: "discord", label: "Discord" },
    { value: "twitch", label: "Twitch" },
    { value: "github", label: "GitHub" },
    { value: "spotify", label: "Spotify" },
    { value: "reddit", label: "Reddit" },
    { value: "website", label: "Website" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "other", label: "Other" },
] as const;

type ProfileLinkRow = { platform: string; customPlatform: string; url: string; label: string };

export default function UtilitiesPage() {
    const [tool, setTool] = useState<Tool>("currency");

    const [base, setBase] = useState("USD");
    const [amount, setAmount] = useState("100");
    const { data: rates } = useExchangeRates(base);

    const [qrText, setQrText] = useState("");
    const [qrImage, setQrImage] = useState<string | null>(null);
    const { data: socialProfile, isLoading: socialProfileLoading } = useMySocialProfile();
    const createSocialProfile = useCreateSocialProfile();

    const [profileForm, setProfileForm] = useState({
        slug: "",
        displayName: "",
        bio: "",
        isPublic: true,
    });
    const [profileLinks, setProfileLinks] = useState<ProfileLinkRow[]>([
        { platform: "instagram", customPlatform: "", url: "", label: "" },
    ]);

    function addLinkRow() {
        if (profileLinks.length >= 30) return;
        setProfileLinks((prev) => [...prev, { platform: "instagram", customPlatform: "", url: "", label: "" }]);
    }

    function removeLinkRow(index: number) {
        setProfileLinks((prev) => prev.filter((_, i) => i !== index));
    }

    function updateLinkRow(index: number, patch: Partial<ProfileLinkRow>) {
        setProfileLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    }

    function handleCreateProfile() {
        const links = profileLinks
            .filter((l) => l.url.trim())
            .map((l, i) => ({
                platform: l.platform === "other" ? l.customPlatform.trim() : l.platform,
                url: l.url.trim(),
                label: l.label.trim() || undefined,
                enabled: true,
                sortOrder: i,
            }));

        if (links.length === 0) return;

        createSocialProfile.mutate({
            slug: profileForm.slug.trim().toLowerCase(),
            displayName: profileForm.displayName.trim(),
            bio: profileForm.bio.trim() || undefined,
            isPublic: profileForm.isPublic,
            links,
        });
    }

    const [pwLength, setPwLength] = useState(16);
    const [password, setPassword] = useState("");

    const [hashInput, setHashInput] = useState("");
    const [hashAlgo, setHashAlgo] = useState("SHA-256");
    const [hashResult, setHashResult] = useState("");

    const [uuid, setUuid] = useState("");

    const [jsonInput, setJsonInput] = useState("");
    const [jsonResult, setJsonResult] = useState("");
    const [jsonError, setJsonError] = useState("");

    const [b64Input, setB64Input] = useState("");
    const [b64Result, setB64Result] = useState("");

    const [textInput, setTextInput] = useState("");

    const [colorHex, setColorHex] = useState("#6366f1");

    const translateText = useTranslateText();
    const [langSearch, setLangSearch] = useState("");
    const [translateInput, setTranslateInput] = useState("");
    const [targetLang, setTargetLang] = useState("Spanish");
    const [translated, setTranslated] = useState("");

    const filteredLanguages = LANGUAGES.filter((l) =>
        l.name.toLowerCase().includes(langSearch.toLowerCase()) || l.native.toLowerCase().includes(langSearch.toLowerCase())
    );
    const continents: (typeof LANGUAGES[number]["continent"])[] = ["Africa", "Asia", "Europe", "Americas"];

    function handleTranslate() {
        if (!translateInput.trim()) return;
        translateText.mutate({ text: translateInput, targetLanguage: targetLang }, { onSuccess: setTranslated });
    }

    async function handleQrGenerate() {
        if (!qrText.trim()) return;
        const dataUrl = await QRCode.toDataURL(qrText, { width: 300, margin: 1 });
        setQrImage(dataUrl);
    }

    async function handleSocialQrGenerate(slug: string) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
        const publicUrl = `${baseUrl}/connect/${slug}`;

        const dataUrl = await QRCode.toDataURL(publicUrl, {
            width: 500,
            margin: 2,
            errorCorrectionLevel: "H",
        });

        setQrImage(dataUrl);
    }

    const rgb = hexToRgb(colorHex);

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={item}>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Wrench className="h-6 w-6 text-primary" /> Global Utilities</h1>
                <p className="text-muted-foreground mt-1">Everyday tools — most run entirely in your browser.</p>
            </motion.div>

            <motion.div variants={item}>
                <Tabs value={tool} onValueChange={(v) => setTool(v as Tool)}>
                    <TabsList className="flex-wrap h-auto">
                        {TOOLS.map((t) => <TabsTrigger key={t} value={t} className="gap-0 flex capitalize text-xs sm:text-lg">{t}</TabsTrigger>)}
                    </TabsList>
                </Tabs>
            </motion.div>

            <motion.div variants={item}>
                <Card className="hover:border-primary/20 transition-colors max-w-8xl">
                    <CardContent className="pt-6 space-y-4">
                        {tool === "currency" && (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
                                    <select className="h-10 rounded-lg border border-input bg-background px-2 text-sm" value={base} onChange={(e) => setBase(e.target.value)}>
                                        {["USD", "EUR", "GBP", "NGN", "JPY", "CAD", "AUD", "INR"].map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                {rates && (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {Object.entries(rates.rates as Record<string, number>).slice(0, 12).map(([cur, rate]) => (
                                            <div key={cur} className="flex justify-between rounded-lg border border-border/60 bg-card/60 p-2">
                                                <span>{cur}</span><span className="font-medium">{(Number(amount) * rate).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {tool === "language" && (
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Quick translate</p>
                                    <textarea
                                        rows={3}
                                        className="w-full rounded-lg border border-input bg-background p-3 text-sm"
                                        placeholder="Enter text to translate..."
                                        value={translateInput}
                                        onChange={(e) => setTranslateInput(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <select className="h-10 flex-1 rounded-lg border border-input bg-background px-2 text-[10px] sm:text-sm" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                                            {LANGUAGES.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}
                                        </select>
                                        <Button onClick={handleTranslate} disabled={translateText.isPending || !translateInput.trim()}>
                                            {translateText.isPending ? "Translating..." : "Translate"}
                                        </Button>
                                    </div>
                                    {translated && (
                                        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-card/60 p-3">
                                            <p className="text-sm flex-1">{translated}</p>
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => navigator.clipboard.writeText(translated)}><Copy className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    )}
                                    {translateText.isError && <p className="text-xs text-destructive">{(translateText.error as Error).message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Language directory</p>
                                    <Input placeholder="Search languages..." value={langSearch} onChange={(e) => setLangSearch(e.target.value)} />
                                    {continents.map((continent) => {
                                        const list = filteredLanguages.filter((l) => l.continent === continent);
                                        if (list.length === 0) return null;
                                        return (
                                            <div key={continent} className="space-y-1">
                                                <p className="text-xs font-semibold text-muted-foreground pt-2">{continent}</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                                    {list.map((l) => (
                                                        <div key={l.name} className="rounded-lg border border-border/60 bg-card/60 px-2 py-1.5 text-xs" dir={l.rtl ? "rtl" : "ltr"}>
                                                            <p className="font-medium">{l.name}</p>
                                                            <p className="text-muted-foreground">{l.native}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {tool === "qr" && (
                            <div className="space-y-6">
                                {/* Normal QR */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium">Text or URL QR</p>

                                    <Input
                                        placeholder="Text or URL to encode"
                                        value={qrText}
                                        onChange={(e) => setQrText(e.target.value)}
                                    />

                                    <Button
                                        onClick={handleQrGenerate}
                                        disabled={!qrText.trim()}
                                    >
                                        Generate QR
                                    </Button>
                                </div>

                                {/* Social Profile QR */}
                                <div className="border-t pt-6 space-y-3">
                                    <div>
                                        <p className="text-sm font-medium">
                                            Social Profile QR
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            Put all your social media links behind one QR code — great for a printed business card.
                                        </p>
                                    </div>

                                    {socialProfile ? (
                                        <div className="rounded-lg border p-4 space-y-3">
                                            <div>
                                                <p className="font-medium">
                                                    {socialProfile.displayName}
                                                </p>

                                                <p className="text-sm text-muted-foreground">
                                                    /connect/{socialProfile.slug}
                                                </p>

                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {socialProfile.links?.length ?? 0} link{socialProfile.links?.length !== 1 ? "s" : ""} attached
                                                </p>
                                            </div>

                                            <Button
                                                onClick={() =>
                                                    handleSocialQrGenerate(socialProfile.slug)
                                                }
                                            >
                                                Generate Social QR
                                            </Button>
                                        </div>
                                    ) : socialProfileLoading ? (
                                        <p className="text-sm text-muted-foreground">Loading your social profile...</p>
                                    ) : (
                                        <div className="space-y-4 rounded-lg border p-4">
                                            <p className="text-sm font-medium">Create your social profile</p>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <Input
                                                    placeholder="Username (e.g. john-store)"
                                                    value={profileForm.slug}
                                                    onChange={(e) => setProfileForm((f) => ({ ...f, slug: e.target.value }))}
                                                />
                                                <Input
                                                    placeholder="Display name (e.g. John's Store)"
                                                    value={profileForm.displayName}
                                                    onChange={(e) => setProfileForm((f) => ({ ...f, displayName: e.target.value }))}
                                                />
                                            </div>
                                            <Input
                                                placeholder="Short bio (optional)"
                                                value={profileForm.bio}
                                                onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                                            />

                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    Links ({profileLinks.length}/30)
                                                </p>

                                                {profileLinks.map((link, i) => (
                                                    <div key={i} className="flex flex-wrap gap-2 items-center rounded-lg border border-border/60 p-2">
                                                        <select
                                                            className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
                                                            value={link.platform}
                                                            onChange={(e) => updateLinkRow(i, { platform: e.target.value })}
                                                        >
                                                            {SOCIAL_PLATFORMS.map((p) => (
                                                                <option key={p.value} value={p.value}>{p.label}</option>
                                                            ))}
                                                        </select>

                                                        {link.platform === "other" && (
                                                            <Input
                                                                placeholder="Platform name"
                                                                className="h-9 w-32 text-xs"
                                                                value={link.customPlatform}
                                                                onChange={(e) => updateLinkRow(i, { customPlatform: e.target.value })}
                                                            />
                                                        )}

                                                        <Input
                                                            placeholder="URL (https://...)"
                                                            className="h-9 flex-1 min-w-40 text-xs"
                                                            value={link.url}
                                                            onChange={(e) => updateLinkRow(i, { url: e.target.value })}
                                                        />

                                                        <Input
                                                            placeholder="Label (optional)"
                                                            className="h-9 w-28 text-xs"
                                                            value={link.label}
                                                            onChange={(e) => updateLinkRow(i, { label: e.target.value })}
                                                        />

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 text-destructive"
                                                            onClick={() => removeLinkRow(i)}
                                                            disabled={profileLinks.length === 1}
                                                        >
                                                            ×
                                                        </Button>
                                                    </div>
                                                ))}

                                                <Button size="sm" variant="outline" onClick={addLinkRow} disabled={profileLinks.length >= 30}>
                                                    + Add another link
                                                </Button>
                                            </div>

                                            <Button
                                                onClick={handleCreateProfile}
                                                disabled={
                                                    createSocialProfile.isPending ||
                                                    !profileForm.slug.trim() ||
                                                    !profileForm.displayName.trim() ||
                                                    !profileLinks.some((l) => l.url.trim())
                                                }
                                            >
                                                {createSocialProfile.isPending ? "Creating..." : "Create profile & QR"}
                                            </Button>

                                            {createSocialProfile.isError && (
                                                <p className="text-xs text-destructive">
                                                    {(createSocialProfile.error as Error).message}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* QR Result */}
                                {qrImage && (
                                    <div className="space-y-3">
                                        <img
                                            src={qrImage}
                                            alt="QR code"
                                            className="rounded-lg border border-border/60"
                                        />

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <a
                                                href={qrImage}
                                                download="social-profile-qrcode.png"
                                            >
                                                Download QR
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {tool === "password" && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Length: {pwLength}</span>
                                    <input type="range" min={8} max={32} value={pwLength} onChange={(e) => setPwLength(Number(e.target.value))} className="flex-1 accent-primary" />
                                </div>
                                <Button onClick={() => setPassword(generatePassword(pwLength))}>Generate</Button>
                                {password && (
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-sm bg-muted/50 rounded px-3 py-2 break-all">{password}</code>
                                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(password)}><Copy className="h-3.5 w-3.5" /></Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {tool === "hash" && (
                            <div className="space-y-3">
                                <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={hashAlgo} onChange={(e) => setHashAlgo(e.target.value)}>
                                    {["SHA-1", "SHA-256", "SHA-384", "SHA-512"].map((a) => <option key={a} value={a}>{a}</option>)}
                                </select>
                                <Input placeholder="Text to hash" value={hashInput} onChange={(e) => setHashInput(e.target.value)} />
                                <Button onClick={async () => setHashResult(await hashText(hashInput, hashAlgo))} disabled={!hashInput.trim()}>Hash</Button>
                                {hashResult && <code className="block text-xs bg-muted/50 rounded px-3 py-2 break-all">{hashResult}</code>}
                            </div>
                        )}

                        {tool === "uuid" && (
                            <div className="space-y-3">
                                <Button onClick={() => setUuid(crypto.randomUUID())}>Generate UUID</Button>
                                {uuid && (
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-sm bg-muted/50 rounded px-3 py-2">{uuid}</code>
                                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(uuid)}><Copy className="h-3.5 w-3.5" /></Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {tool === "json" && (
                            <div className="space-y-3">
                                <textarea rows={8} className="w-full rounded-lg border border-input bg-background p-3 text-xs font-mono" placeholder="Paste JSON..." value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} />
                                <Button onClick={() => { try { setJsonResult(JSON.stringify(JSON.parse(jsonInput), null, 2)); setJsonError(""); } catch (e: any) { setJsonError(e.message); setJsonResult(""); } }}>Format</Button>
                                {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
                                {jsonResult && <pre className="text-xs font-mono whitespace-pre-wrap rounded-lg border border-border/60 bg-card/60 p-3 max-h-75 overflow-auto">{jsonResult}</pre>}
                            </div>
                        )}

                        {tool === "base64" && (
                            <div className="space-y-3">
                                <textarea rows={5} className="w-full rounded-lg border border-input bg-background p-3 text-xs font-mono" value={b64Input} onChange={(e) => setB64Input(e.target.value)} />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => setB64Result(btoa(unescape(encodeURIComponent(b64Input))))}>Encode</Button>
                                    <Button size="sm" variant="outline" onClick={() => setB64Result(decodeURIComponent(escape(atob(b64Input))))}>Decode</Button>
                                </div>
                                {b64Result && <pre className="text-xs font-mono whitespace-pre-wrap rounded-lg border border-border/60 bg-card/60 p-3 break-all">{b64Result}</pre>}
                            </div>
                        )}

                        {tool === "text" && (
                            <div className="space-y-3">
                                <textarea rows={5} className="w-full rounded-lg border border-input bg-background p-3 text-sm" value={textInput} onChange={(e) => setTextInput(e.target.value)} />
                                <div className="flex gap-2 flex-wrap">
                                    <Button size="sm" variant="outline" onClick={() => setTextInput(textInput.toUpperCase())}>UPPERCASE</Button>
                                    <Button size="sm" variant="outline" onClick={() => setTextInput(textInput.toLowerCase())}>lowercase</Button>
                                    <Button size="sm" variant="outline" onClick={() => setTextInput(textInput.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase()))}>Title Case</Button>
                                </div>
                                <p className="text-xs text-muted-foreground">{textInput.length} characters · {textInput.trim() ? textInput.trim().split(/\s+/).length : 0} words</p>
                            </div>
                        )}

                        {tool === "color" && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="h-12 w-12 rounded" />
                                    <Input value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="w-32" />
                                </div>
                                {rgb && <p className="text-sm">RGB: {rgb.r}, {rgb.g}, {rgb.b}</p>}
                                {rgb && <p className="text-sm">HSL: {(() => {
                                    const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
                                    const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s = 0; const l = (max + min) / 2;
                                    if (max !== min) {
                                        const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                                        if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6;
                                    }
                                    return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
                                })()}</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}