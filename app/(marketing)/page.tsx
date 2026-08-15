"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  LayoutDashboard,
  CheckSquare,
  FileText,
  Wallet,
  Heart,
  GraduationCap,
  ArrowRight,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingTeaser } from "@/components/marketing/price-teaser";

const modules = [
  { icon: LayoutDashboard, title: "Personal Dashboard", desc: "Daily overview with weather, calendar, goals & AI insights" },
  { icon: CheckSquare, title: "Smart Tasks", desc: "AI scheduling, priorities, smart reminders & recurring tasks" },
  { icon: FileText, title: "Notes", desc: "Notion-like markdown notes with AI summaries" },
  { icon: Wallet, title: "Finance", desc: "Track spending, income, savings & investments — free" },
  { icon: Heart, title: "Health", desc: "Water, sleep, exercise, mood tracking with pattern detection" },
  { icon: GraduationCap, title: "Study", desc: "PDF uploads, quizzes, flashcards & progress tracking" },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-125 w-125 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-20 right-0 h-75 w-75 rounded-full bg-purple-500/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <Badge variant="secondary" className="mb-6">
              <Zap className="mr-1 h-3 w-3" /> Free forever — no credit card required
            </Badge>
          </motion.div>
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
          >
            Your life,{" "}
            <span className="gradient-text">intelligently</span>
            <br />
            organized
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            One platform where every feature works together. Your calendar knows your tasks.
            Your budget reflects your shopping list. Your AI assistant understands your data.
          </motion.p>
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" asChild>
              <Link href="/signup">
                Start for Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">View Demo</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need. Nothing you don&apos;t.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              20+ integrated modules for students, workers, parents, freelancers, and everyone in between.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod, i) => (
              <motion.div
                key={mod.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full hover:border-primary/30 transition-colors group">
                  <CardContent className="p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                      <mod.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{mod.title}</h3>
                    <p className="text-sm text-muted-foreground">{mod.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-6 border-t border-border">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Free forever. Premium when you need more.</h2>
            <p className="text-muted-foreground">Essential features are never locked behind a paywall.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-primary/50">
              <CardContent className="p-8">
                <Badge className="mb-4">Most Popular</Badge>
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <p className="text-3xl font-bold mb-6">$0<span className="text-base font-normal text-muted-foreground">/forever</span></p>
                <ul className="space-y-3 text-sm text-muted-foreground mb-8">
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-success" /> All core modules</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-success" /> Tasks, Notes, Dashboard</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-success" /> Finance & Health tracking</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-success" /> Basic AI assistant</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-success" /> 1GB storage</li>
                </ul>
                <Button className="w-full" asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <p className="text-3xl font-bold mb-6">$9<span className="text-base font-normal text-muted-foreground">/month</span></p>
                <ul className="space-y-3 text-sm text-muted-foreground mb-8">
                  <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Extended AI credits</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> 50GB storage</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Team workspaces</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Advanced analytics</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Automation workflows</li>
                </ul>
                <Button variant="outline" className="w-full" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <PricingTeaser />
      </section>
    </div>
  );
}
