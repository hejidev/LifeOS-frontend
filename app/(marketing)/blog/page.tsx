"use client";

import Link from "next/link";
import { Newspaper } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { usePublishedContent } from "@/lib/hooks/use-life-data";
import { ConsoleHero } from "@/components/marketing/console-hero";

export default function BlogIndexPage() {
  const { data: posts = [], isLoading } = usePublishedContent("BLOG");

  return (
    <div>
      <ConsoleHero
        icon={<Newspaper className="h-3 w-3" />}
        prompt="feed/blog"
        title="From the LifeOS blog"
        description="Product updates, tips for getting more out of LifeOS, and notes from the team as we build."
        status={[{ label: "ENTRIES", value: `${(posts as any[]).length}` }]}
      />

      <div className="max-w-4xl mx-auto px-4 py-14 sm:py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <p className="font-mono text-xs text-muted-foreground">&gt; no entries found</p>
            <p className="text-muted-foreground text-sm">Nothing published yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(posts as any[]).map((p, i) => (
              <Link key={p.id} href={`/blog/${p.slug}`}>
                <Card className="h-full hover:border-primary/30 transition-colors overflow-hidden group relative">
                  <span className="absolute top-3 right-3 z-10 font-mono text-[10px] text-white/70 bg-black/40 rounded px-1.5 py-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {p.coverImageUrl && <img src={p.coverImageUrl} alt="" className="w-full h-40 object-cover" />}
                  <CardContent className="pt-4">
                    <p className="font-semibold group-hover:text-primary transition-colors">{p.title}</p>
                    {p.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>}
                    <p className="text-xs font-mono text-muted-foreground mt-3">{new Date(p.publishedAt ?? p.createdAt).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}