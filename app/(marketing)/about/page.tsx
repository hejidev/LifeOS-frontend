"use client";

import { Target, Compass } from "lucide-react";
import { FaXTwitter, FaLinkedin, FaGithub } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeam, useTestimonials, usePublishedContent } from "@/lib/hooks/use-life-data";

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function SocialIcons({ linkedinUrl, twitterUrl, githubUrl }: { linkedinUrl?: string; twitterUrl?: string; githubUrl?: string }) {
  return (
    <div className="flex gap-3 mt-2 justify-center sm:justify-start">
      {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><FaLinkedin className="h-4 w-4" /></a>}
      {twitterUrl && <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><FaXTwitter className="h-4 w-4" /></a>}
      {githubUrl && <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><FaGithub className="h-4 w-4" /></a>}
    </div>
  );
}

function TestimonialMarquee({ testimonials }: { testimonials: any[] }) {
  if (testimonials.length === 0) return <p className="text-center text-sm text-muted-foreground">No testimonials yet.</p>;
  const doubled = [...testimonials, ...testimonials];

  return (
    <div className="overflow-hidden relative mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex gap-4 w-max animate-marquee">
        {doubled.map((t, i) => (
          <Card key={`${t.id}-${i}`} className="w-72 shrink-0">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground italic line-clamp-4">"{t.quote}"</p>
              <div className="flex items-center gap-2 mt-4">
                <Avatar className="h-8 w-8"><AvatarImage src={t.avatarUrl ?? undefined} /><AvatarFallback className="text-xs">{getInitials(t.name)}</AvatarFallback></Avatar>
                <div>
                  <p className="text-xs font-medium">{t.name}</p>
                  {t.role && <p className="text-[11px] text-muted-foreground">{t.role}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

export default function AboutPage() {
  const { data: team = [], isLoading: teamLoading } = useTeam();
  const { data: testimonials = [], isLoading: testimonialsLoading } = useTestimonials();
  const { data: cmsItems = [] } = usePublishedContent("ABOUT");

  const founders = (team as any[]).filter((m) => m.isFounder);
  const others = (team as any[]).filter((m) => !m.isFounder);

  return (
    <div>
      <section className="max-w-3xl mx-auto px-4 pt-14 sm:pt-20 pb-10 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">Built to run your whole life, not just a slice of it</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          LifeOS started from a simple frustration: tasks, notes, health, money, and work all live in different apps that don't talk to each other. We're building the one place that holds all of it — free at its core, and built to grow with whatever you're running, from a personal to-do list to a full merchant storefront.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <Compass className="h-6 w-6 text-primary mb-3" />
            <p className="font-semibold mb-2">Our vision</p>
            <p className="text-sm text-muted-foreground">A world where managing your life doesn't require ten different apps, ten different logins, and constant context-switching.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Target className="h-6 w-6 text-primary mb-3" />
            <p className="font-semibold mb-2">Our mission</p>
            <p className="text-sm text-muted-foreground">Give everyone a free, genuinely capable operating system for their life — and let those who need more, like merchants running a real business, grow into it.</p>
          </CardContent>
        </Card>
      </section>

      {founders.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold mb-6">{founders.length > 1 ? "Founders" : "Founder"}</h2>
          <div className="space-y-4">
            {founders.map((f) => (
              <Card key={f.id}>
                <CardContent className="pt-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  <Avatar className="h-16 w-16 border border-border shrink-0">
                    <AvatarImage src={f.imageUrl ?? undefined} alt={f.name} />
                    <AvatarFallback className="text-lg">{getInitials(f.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{f.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">{f.role}</p>
                    {f.bio && <p className="text-sm text-muted-foreground">{f.bio}</p>}
                    <SocialIcons {...f} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {(teamLoading || others.length > 0) && (
        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold mb-6">The team</h2>
          {teamLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {others.map((m) => (
                <Card key={m.id}>
                  <CardContent className="pt-6 text-center">
                    <Avatar className="h-16 w-16 mx-auto border border-border mb-3">
                      <AvatarImage src={m.imageUrl ?? undefined} alt={m.name} />
                      <AvatarFallback>{getInitials(m.name)}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.role}</p>
                    <div className="flex justify-center"><SocialIcons {...m} /></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="py-10">
        <h2 className="text-2xl font-bold mb-6 text-center">What people say</h2>
        {testimonialsLoading ? (
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : (
          <TestimonialMarquee testimonials={testimonials as any[]} />
        )}
      </section>

      {(cmsItems as any[]).length > 0 && (
        <section className="max-w-3xl mx-auto px-4 py-10 border-t border-border">
          <h2 className="text-xl font-bold mb-4">More from us</h2>
          {(cmsItems as any[]).map((c) => (
            <div key={c.id} className="space-y-3 text-sm text-muted-foreground">
              {c.coverImageUrl && <img src={c.coverImageUrl} alt="" className="w-full rounded-xl mb-4" />}
              {c.body.split("\n\n").map((p: string, i: number) => <p key={i}>{p}</p>)}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}