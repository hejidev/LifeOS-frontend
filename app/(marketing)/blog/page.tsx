"use client";

import Link from "next/link";
import { Newspaper } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { usePublishedContent } from "@/lib/hooks/use-life-data";

export default function BlogIndexPage() {
  const { data: posts = [], isLoading } = usePublishedContent("BLOG");

  return (
    <div className="max-w-4xl mx-auto px-4 py-14 sm:py-16">
      <div className="text-center mb-10">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 mb-3">
          <Newspaper className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold">From the LifeOS blog</h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">Product updates, tips for getting more out of LifeOS, and notes from the team as we build.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
      ) : posts.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm">No posts published yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(posts as any[]).map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`}>
              <Card className="h-full hover:border-primary/30 transition-colors overflow-hidden">
                {p.coverImageUrl && <img src={p.coverImageUrl} alt="" className="w-full h-40 object-cover" />}
                <CardContent className="pt-4">
                  <p className="font-semibold">{p.title}</p>
                  {p.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>}
                  <p className="text-xs text-muted-foreground mt-3">{new Date(p.publishedAt ?? p.createdAt).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}