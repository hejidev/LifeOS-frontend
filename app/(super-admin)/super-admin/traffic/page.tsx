"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, FlaskConical, Gauge, Loader2, Network, Play, Server, Square, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, PageHeader, Pill, Tile, when } from "@/components/merchant/ops-ui";
import { AREA_COLORS, AREA_KEYS, AREA_LABELS, MiniBars, ShareBars, StackedBars, fmtMs, rate } from "@/components/platform/tools-ui";
import {
    useBalanceProbe,
    useFixtures,
    useInstances,
    useLoadTest,
    useLoadTests,
    useSeedFixtures,
    useStartLoadTest,
    useStopLoadTest,
    useTraffic,
} from "@/lib/hooks/use-platform-tools";
import type { RunSnapshot } from "@/lib/hooks/use-platform-tools";
import { cn } from "@/lib/utils";

const WINDOWS = [
    { value: "15m", label: "15 min" },
    { value: "1h", label: "1 hour" },
    { value: "6h", label: "6 hours" },
    { value: "24h", label: "24 hours" },
];

const TARGET_OPTIONS = [
    { key: "public", label: "Public API", note: "Health and database ping" },
    { key: "user", label: "User dashboard", note: "Uses a temporary test user" },
    { key: "merchant", label: "Merchant dashboard", note: "Uses a temporary test merchant with sample sales" },
    { key: "admin", label: "Admin dashboard", note: "Uses a temporary test admin" },
    { key: "super_admin", label: "Super admin dashboard", note: "Uses your own signed-in session" },
];

const VERDICTS = {
    healthy: { label: "Healthy", tone: "success" as const, icon: CheckCircle2 },
    degraded: { label: "Degraded", tone: "warning" as const, icon: AlertTriangle },
    failing: { label: "Failing", tone: "danger" as const, icon: XCircle },
};

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function uptime(seconds: number) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function LiveTraffic() {
    const [windowKey, setWindowKey] = useState("1h");
    const { data, isLoading, error } = useTraffic(windowKey);

    if (error) return <Empty>Couldn't load traffic.</Empty>;

    return (
        <div className="space-y-4">
            <Tabs value={windowKey} onValueChange={setWindowKey}>
                <TabsList>
                    {WINDOWS.map((item) => (
                        <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {isLoading || !data ? (
                <Skeleton className="h-96 w-full" />
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <Tile label="Requests" value={data.totals.requests.toLocaleString()} hint={`${data.totals.rps}/s average`} />
                        <Tile label="Server errors" value={rate(data.totals.serverErrors, data.totals.requests)} tone={data.totals.serverErrors > 0 ? "danger" : "success"} hint={`${data.totals.serverErrors} requests`} />
                        <Tile label="Typical (p50)" value={fmtMs(data.totals.p50)} />
                        <Tile label="Slow (p95)" value={fmtMs(data.totals.p95)} hint="Estimated from buckets" />
                        <Tile label="Slowest 1%" value={fmtMs(data.totals.p99)} hint={`Max ${fmtMs(data.totals.maxMs)}`} />
                    </div>

                    <Card>
                        <CardContent className="space-y-3 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold">Requests over time</p>
                                <div className="flex flex-wrap gap-3">
                                    {AREA_KEYS.map((key) => (
                                        <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                            <span className={cn("h-2.5 w-2.5 rounded-sm", AREA_COLORS[key])} /> {AREA_LABELS[key]}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            {data.totals.requests === 0 ? (
                                <Empty>No requests recorded in this window yet.</Empty>
                            ) : (
                                <StackedBars columns={data.series.map((point) => ({ label: clock(point.t), values: point.byArea }))} keys={AREA_KEYS} />
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-0">
                            <p className="px-4 pt-4 text-sm font-semibold">By dashboard</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b text-left text-xs text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2 font-medium">Dashboard</th>
                                            <th className="px-4 py-2 text-right font-medium">Requests</th>
                                            <th className="px-4 py-2 text-right font-medium">4xx</th>
                                            <th className="px-4 py-2 text-right font-medium">5xx</th>
                                            <th className="px-4 py-2 text-right font-medium">Avg</th>
                                            <th className="px-4 py-2 text-right font-medium">p95</th>
                                            <th className="px-4 py-2 text-right font-medium">p99</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.areas.map((area) => (
                                            <tr key={area.area} className="border-b last:border-0">
                                                <td className="px-4 py-2.5">
                                                    <span className="flex items-center gap-2"><span className={cn("h-2.5 w-2.5 rounded-sm", AREA_COLORS[area.area])} /> {AREA_LABELS[area.area]}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-right">{area.requests.toLocaleString()}</td>
                                                <td className="px-4 py-2.5 text-right text-muted-foreground">{area.clientErrors}</td>
                                                <td className={cn("px-4 py-2.5 text-right", area.serverErrors > 0 && "font-semibold text-destructive")}>{area.serverErrors}</td>
                                                <td className="px-4 py-2.5 text-right">{area.requests ? fmtMs(area.avgMs) : "-"}</td>
                                                <td className="px-4 py-2.5 text-right">{area.requests ? fmtMs(area.p95) : "-"}</td>
                                                <td className="px-4 py-2.5 text-right">{area.requests ? fmtMs(area.p99) : "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-0">
                            <p className="px-4 pt-4 text-sm font-semibold">Slowest routes <span className="text-xs font-normal text-muted-foreground">(by hour, at least 3 requests)</span></p>
                            {data.routes.length === 0 ? (
                                <Empty>No route data yet.</Empty>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="border-b text-left text-xs text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-2 font-medium">Route</th>
                                                <th className="px-4 py-2 text-right font-medium">Requests</th>
                                                <th className="px-4 py-2 text-right font-medium">Avg</th>
                                                <th className="px-4 py-2 text-right font-medium">Max</th>
                                                <th className="px-4 py-2 text-right font-medium">5xx</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.routes.map((route) => (
                                                <tr key={route.route} className="border-b last:border-0">
                                                    <td className="px-4 py-2.5 font-mono text-xs">{route.route}</td>
                                                    <td className="px-4 py-2.5 text-right">{route.requests.toLocaleString()}</td>
                                                    <td className="px-4 py-2.5 text-right">{fmtMs(route.avgMs)}</td>
                                                    <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtMs(route.maxMs)}</td>
                                                    <td className={cn("px-4 py-2.5 text-right", route.serverErrors > 0 && "font-semibold text-destructive")}>{route.serverErrors}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

function LoadBalance() {
    const { data: instances, isLoading } = useInstances();
    const { data: traffic } = useTraffic("1h");
    const probe = useBalanceProbe();
    const live = (instances ?? []).filter((instance) => instance.live);

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="space-y-2 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold"><Network className="h-4 w-4 text-primary" /> Instances behind your load balancer</p>
                    {isLoading ? (
                        <Skeleton className="h-8 w-48" />
                    ) : live.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No live instance has reported in the last 90 seconds.</p>
                    ) : live.length === 1 ? (
                        <p className="text-sm text-muted-foreground">
                            Only <span className="font-semibold text-foreground">1 instance</span> is serving traffic, so there is nothing to balance yet. In Render, scale the service to 2 or more instances to share the load.
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{live.length} instances</span> are serving traffic. Render spreads requests across them.
                        </p>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(instances ?? []).map((instance) => (
                    <Card key={instance.instance} className={cn(!instance.live && "opacity-60")}>
                        <CardContent className="space-y-3 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 font-mono text-sm font-semibold"><Server className="h-4 w-4 text-muted-foreground" /> {instance.instance}</span>
                                <div className="flex gap-1.5">
                                    {instance.current ? <Pill tone="primary">Answering you</Pill> : null}
                                    <Pill tone={instance.live ? "success" : "neutral"}>{instance.live ? "Live" : "Offline"}</Pill>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                                <span className="text-muted-foreground">Up for</span><span className="text-right">{uptime(instance.uptimeSec)}</span>
                                <span className="text-muted-foreground">Memory</span><span className="text-right">{instance.rssMb} MB</span>
                                <span className="text-muted-foreground">Event loop lag</span>
                                <span className={cn("text-right", instance.loopLagMs > 100 && "font-semibold text-amber-600")}>{instance.loopLagMs} ms</span>
                                <span className="text-muted-foreground">Database ping</span>
                                <span className={cn("text-right", instance.dbPingMs > 150 && "font-semibold text-amber-600")}>{instance.dbPingMs} ms</span>
                                <span className="text-muted-foreground">Requests handled</span><span className="text-right">{instance.requests.toLocaleString()}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">Last report {when(instance.lastSeenAt)}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardContent className="space-y-3 p-4">
                        <p className="text-sm font-semibold">Real traffic share, last hour</p>
                        <ShareBars rows={traffic?.instances ?? []} />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">Probe the balancer</p>
                            <Button size="sm" onClick={() => probe.mutate()} disabled={probe.isPending}>
                                {probe.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Gauge className="mr-1.5 h-4 w-4" />} Send 60 requests
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Fires 60 quick pings through your public address and shows which instance answered each one.</p>
                        {probe.isError ? <p className="text-sm text-destructive">{probe.error instanceof Error ? probe.error.message : "The probe failed."}</p> : null}
                        {probe.data ? (
                            <div className="space-y-3">
                                <ShareBars rows={probe.data.instances} />
                                <p className="text-xs text-muted-foreground">
                                    Average {fmtMs(probe.data.avgMs)} · p95 {fmtMs(probe.data.p95)}{probe.data.failed > 0 ? ` · ${probe.data.failed} failed` : ""}
                                </p>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function RunView({ snap, running, onStop, stopping }: { snap: RunSnapshot; running: boolean; onStop?: () => void; stopping?: boolean }) {
    const verdict = snap.verdict ? VERDICTS[snap.verdict] : null;
    const failedRate = rate(snap.failed, snap.requests);

    return (
        <div className="space-y-4">
            {snap.error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{snap.error}</p> : null}

            {verdict ? (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                    <verdict.icon className="h-5 w-5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold">Result: {verdict.label}</p>
                        {snap.stoppedReason ? <p className="text-xs text-muted-foreground">{snap.stoppedReason}</p> : null}
                    </div>
                    <Pill tone={verdict.tone}>{verdict.label}</Pill>
                </div>
            ) : null}

            {running ? (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <div className="flex-1 text-sm">Running · {snap.elapsedSec}s elapsed · {snap.activeWorkers} users active</div>
                    <Button size="sm" variant="destructive" onClick={onStop} disabled={stopping}>
                        <Square className="mr-1.5 h-3.5 w-3.5" /> Stop
                    </Button>
                </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <Tile label="Requests" value={snap.requests.toLocaleString()} />
                <Tile label="Per second" value={String(snap.rps)} />
                <Tile label="Failed" value={failedRate} tone={snap.failed > 0 ? "danger" : "success"} hint={`${snap.failed} requests`} />
                <Tile label="Typical (p50)" value={fmtMs(snap.p50)} />
                <Tile label="Slow (p95)" value={fmtMs(snap.p95)} />
                <Tile label="Slowest 1%" value={fmtMs(snap.p99)} hint={`Max ${fmtMs(snap.maxMs)}`} />
            </div>

            {snap.serverHealth ? (
                <div className="grid gap-4 sm:grid-cols-3">
                    <Tile label="Event loop lag (p99)" value={`${snap.serverHealth.loopLagP99Ms} ms`} tone={snap.serverHealth.loopLagP99Ms > 100 ? "danger" : "success"} hint="On the server that ran the test" />
                    <Tile label="Database ping (avg)" value={fmtMs(snap.serverHealth.dbPingAvgMs)} />
                    <Tile label="Database ping (max)" value={fmtMs(snap.serverHealth.dbPingMaxMs)} tone={snap.serverHealth.dbPingMaxMs > 300 ? "danger" : undefined} />
                </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
                <Card><CardContent className="p-4"><MiniBars title="Requests per second" values={snap.timeline.map((point) => point.requests)} /></CardContent></Card>
                <Card><CardContent className="p-4"><MiniBars title="Average response time per second" values={snap.timeline.map((point) => point.avgMs)} tone="bg-amber-500" /></CardContent></Card>
            </div>

            {snap.warnings && snap.warnings.length > 0 ? (
                <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                    {snap.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                </div>
            ) : null}

            {snap.hints && snap.hints.length > 0 ? (
                <Card>
                    <CardContent className="space-y-1.5 p-4">
                        <p className="text-sm font-semibold">What this suggests</p>
                        {snap.hints.map((hint) => <p key={hint} className="text-sm text-muted-foreground">• {hint}</p>)}
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardContent className="p-0">
                        <p className="px-4 pt-4 text-sm font-semibold">By dashboard</p>
                        <table className="w-full text-sm">
                            <thead className="border-b text-left text-xs text-muted-foreground">
                                <tr><th className="px-4 py-2 font-medium">Dashboard</th><th className="px-4 py-2 text-right font-medium">Requests</th><th className="px-4 py-2 text-right font-medium">Failed</th><th className="px-4 py-2 text-right font-medium">Avg</th><th className="px-4 py-2 text-right font-medium">p95</th></tr>
                            </thead>
                            <tbody>
                                {snap.targets.map((target) => (
                                    <tr key={target.target} className="border-b last:border-0">
                                        <td className="px-4 py-2.5">{target.label}</td>
                                        <td className="px-4 py-2.5 text-right">{target.requests.toLocaleString()}</td>
                                        <td className={cn("px-4 py-2.5 text-right", target.failed > 0 && "font-semibold text-destructive")}>{target.failed}</td>
                                        <td className="px-4 py-2.5 text-right">{fmtMs(target.avgMs)}</td>
                                        <td className="px-4 py-2.5 text-right">{fmtMs(target.p95)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="space-y-3 p-4">
                        <p className="text-sm font-semibold">Which instance answered</p>
                        <ShareBars rows={snap.instances} />
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    <p className="px-4 pt-4 text-sm font-semibold">By endpoint</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b text-left text-xs text-muted-foreground">
                                <tr><th className="px-4 py-2 font-medium">Endpoint</th><th className="px-4 py-2 text-right font-medium">Requests</th><th className="px-4 py-2 text-right font-medium">Failed</th><th className="px-4 py-2 text-right font-medium">p50</th><th className="px-4 py-2 text-right font-medium">p95</th><th className="px-4 py-2 text-right font-medium">p99</th><th className="px-4 py-2 text-right font-medium">Max</th></tr>
                            </thead>
                            <tbody>
                                {[...snap.endpoints].sort((a, b) => b.p95 - a.p95).map((endpoint) => (
                                    <tr key={`${endpoint.target}${endpoint.label}`} className="border-b last:border-0">
                                        <td className="px-4 py-2.5"><span className="font-mono text-xs">{endpoint.label}</span> <span className="text-[11px] text-muted-foreground">· {endpoint.target}</span></td>
                                        <td className="px-4 py-2.5 text-right">{endpoint.requests.toLocaleString()}</td>
                                        <td className={cn("px-4 py-2.5 text-right", endpoint.failed > 0 && "font-semibold text-destructive")}>{endpoint.failed}</td>
                                        <td className="px-4 py-2.5 text-right">{fmtMs(endpoint.p50)}</td>
                                        <td className="px-4 py-2.5 text-right">{fmtMs(endpoint.p95)}</td>
                                        <td className="px-4 py-2.5 text-right">{fmtMs(endpoint.p99)}</td>
                                        <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtMs(endpoint.maxMs)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function LoadTest() {
    const fixtures = useFixtures();
    const seed = useSeedFixtures();
    const history = useLoadTests();
    const start = useStartLoadTest();
    const stop = useStopLoadTest();
    const [targets, setTargets] = useState<string[]>(["public", "user", "merchant"]);
    const [concurrency, setConcurrency] = useState(10);
    const [durationSec, setDurationSec] = useState(15);
    const [rampUpSec, setRampUpSec] = useState(3);
    const [thinkMs, setThinkMs] = useState(1000);
    const [direct, setDirect] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const run = useLoadTest(activeId);

    useEffect(() => {
        const running = history.data?.find((item) => item.status === "RUNNING");
        if (running && !activeId) setActiveId(running.id);
    }, [history.data, activeId]);

    const running = run.data?.status === "RUNNING";
    const snapshot = run.data ? (run.data.status === "RUNNING" ? run.data.progress : run.data.result) : null;
    const needsMerchantData = targets.includes("merchant") && fixtures.data && !fixtures.data.merchant.ready;

    function toggle(key: string) {
        setTargets((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
    }

    async function begin() {
        setError(null);
        try {
            const id = await start.mutateAsync({ targets, concurrency, durationSec, rampUpSec: Math.min(rampUpSec, Math.floor(durationSec / 2)), thinkMs, direct });
            setActiveId(id);
            setConfirmed(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't start the test.");
        }
    }

    async function prepare() {
        setError(null);
        try {
            await seed.mutateAsync();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't prepare the test data.");
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardContent className="space-y-3 p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold"><FlaskConical className="h-4 w-4 text-primary" /> Configure a test</p>
                        <div className="space-y-2">
                            {TARGET_OPTIONS.map((option) => (
                                <label key={option.key} className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 hover:bg-muted/40">
                                    <input type="checkbox" className="mt-1" checked={targets.includes(option.key)} onChange={() => toggle(option.key)} disabled={running} />
                                    <span className="text-sm"><span className="font-medium">{option.label}</span><span className="block text-xs text-muted-foreground">{option.note}</span></span>
                                </label>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1"><Label className="text-xs">Simulated users</Label><Input type="number" min={1} max={100} value={concurrency} onChange={(event) => setConcurrency(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} disabled={running} /></div>
                            <div className="space-y-1"><Label className="text-xs">Seconds</Label><Input type="number" min={5} max={60} value={durationSec} onChange={(event) => setDurationSec(Math.min(60, Math.max(5, Number(event.target.value) || 5)))} disabled={running} /></div>
                            <div className="space-y-1"><Label className="text-xs">Ramp-up (s)</Label><Input type="number" min={0} max={15} value={rampUpSec} onChange={(event) => setRampUpSec(Math.min(15, Math.max(0, Number(event.target.value) || 0)))} disabled={running} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Think time (ms)</Label>
                                <Input type="number" min={0} max={10000} step={100} value={thinkMs} onChange={(event) => setThinkMs(Math.min(10000, Math.max(0, Number(event.target.value) || 0)))} disabled={running} />
                                <p className="text-[11px] text-muted-foreground">Pause between each user's requests. 0 means non-stop.</p>
                            </div>
                            <label className="flex cursor-pointer items-start gap-2 pt-5 text-xs">
                                <input type="checkbox" className="mt-0.5" checked={direct} onChange={(event) => setDirect(event.target.checked)} disabled={running} />
                                Test the server directly (skips the load balancer)
                            </label>
                        </div>
                        <p className="text-xs text-muted-foreground">Only read-only requests are sent, so no data is changed. The test stops by itself if more than 40% of requests fail.</p>
                        <label className="flex items-start gap-2 text-xs">
                            <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={running} />
                            I understand this sends real traffic to my live API and may slow it briefly.
                        </label>
                        {needsMerchantData ? <p className="text-xs text-amber-600">The test merchant has no sample data yet. Use Prepare test data first.</p> : null}
                        {error ? <p className="text-sm text-destructive">{error}</p> : null}
                        <Button className="w-full" disabled={!confirmed || targets.length === 0 || running || start.isPending || !!needsMerchantData} onClick={begin}>
                            {start.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Start test
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="space-y-3 p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold"><Database className="h-4 w-4 text-primary" /> Test accounts and data</p>
                        {fixtures.isLoading || !fixtures.data ? (
                            <Skeleton className="h-24 w-full" />
                        ) : (
                            <div className="space-y-2 text-sm">
                                {(["user", "merchant", "admin"] as const).map((key) => (
                                    <div key={key} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="font-medium capitalize">{key}</p>
                                            <p className="truncate text-[11px] text-muted-foreground">{fixtures.data![key].email}</p>
                                        </div>
                                        <Pill tone={fixtures.data![key].exists ? "success" : "neutral"}>{fixtures.data![key].exists ? "Created" : "Not created"}</Pill>
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground">
                                    Sample merchant data: {fixtures.data.merchant.products} products · {fixtures.data.merchant.customers} customers · {fixtures.data.merchant.sales} sales
                                </p>
                            </div>
                        )}
                        <Button variant="outline" className="w-full" onClick={prepare} disabled={seed.isPending || running}>
                            {seed.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Prepare test data
                        </Button>
                        {seed.data ? <p className="text-xs text-emerald-600">Added {seed.data.created.products} products, {seed.data.created.customers} customers and {seed.data.created.sales} sales.</p> : null}
                        <p className="text-xs text-muted-foreground">
                            The test accounts are switched off between runs, so no login stays active. They can be deleted from the Users page if you no longer need them. A test that includes the admin dashboard may send you one admin sign-in notice.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {run.data && snapshot ? (
                <RunView snap={snapshot} running={running} onStop={() => activeId && stop.mutate(activeId)} stopping={stop.isPending} />
            ) : run.data && run.data.status === "RUNNING" ? (
                <div className="flex items-center gap-3 rounded-lg border p-3 text-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Getting ready: signing in the test accounts…</div>
            ) : null}

            <Card>
                <CardContent className="p-0">
                    <p className="px-4 pt-4 text-sm font-semibold">Recent tests</p>
                    {!history.data || history.data.length === 0 ? (
                        <Empty>No tests run yet.</Empty>
                    ) : (
                        <div className="divide-y">
                            {history.data.map((item) => (
                                <button key={item.id} onClick={() => setActiveId(item.id)} className={cn("flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-muted/40", item.id === activeId && "bg-muted/50")}>
                                    <div>
                                        <p className="font-medium">{when(item.createdAt)} · {item.createdByName}</p>
                                        <p className="text-xs text-muted-foreground">{item.config.targets.join(", ")} · {item.config.concurrency} users · {item.config.durationSec}s</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {item.requests != null ? <span>{item.requests.toLocaleString()} requests</span> : null}
                                        {item.p95 != null ? <span>p95 {fmtMs(item.p95)}</span> : null}
                                        <Pill tone={item.verdict === "healthy" ? "success" : item.verdict === "degraded" ? "warning" : item.verdict === "failing" || item.status === "FAILED" ? "danger" : "neutral"}>
                                            {item.verdict ?? item.status.toLowerCase()}
                                        </Pill>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function TrafficPage() {
    const [tab, setTab] = useState("traffic");
    return (
        <div className="space-y-5">
            <PageHeader icon={Gauge} title="Traffic and load" subtitle="Watch real traffic, see how requests are shared across servers, and test your dashboards under load" />
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="traffic">Live traffic</TabsTrigger>
                    <TabsTrigger value="balance">Load balance</TabsTrigger>
                    <TabsTrigger value="test">Load test</TabsTrigger>
                </TabsList>
            </Tabs>
            {tab === "traffic" ? <LiveTraffic /> : tab === "balance" ? <LoadBalance /> : <LoadTest />}
        </div>
    );
}