"use client";

import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublishedContentBySlug } from "@/lib/hooks/use-life-data";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: post, isLoading, error } = usePublishedContentBySlug(slug);

  if (isLoading) return <div className="max-w-3xl mx-auto px-4 py-16"><Skeleton className="h-96 rounded-xl" /></div>;
  if (error || !post) return <div className="max-w-3xl mx-auto px-4 py-24 text-center text-muted-foreground">Post not found.</div>;

  const p = post as any;

  return (
    <article className="max-w-3xl mx-auto px-4 py-16">
      {p.coverImageUrl && <img src={p.coverImageUrl} alt="" className="w-full h-80 object-cover rounded-2xl mb-8" />}
      <h1 className="text-4xl font-bold mb-3">{p.title}</h1>
      <p className="text-sm text-muted-foreground mb-8">{new Date(p.publishedAt ?? p.createdAt).toLocaleDateString()}</p>
      <div className="prose prose-invert max-w-none space-y-4 text-muted-foreground">
        {p.body.split("\n\n").map((para: string, i: number) => <p key={i}>{para}</p>)}
      </div>
    </article>
  );
}