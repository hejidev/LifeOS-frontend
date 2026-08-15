"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  User,
  Moon,
  SunMedium,
  Bell,
  Shield,
  LayoutGrid,
  KeyRound,
  Globe,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

import {
  useUserProfile,
  useUpdateUserProfile,
  useUpdatePreferences,
  useUpdateNotifications,
  useChangePassword,
  useAccountOverview,
} from "@/lib/hooks/use-life-data";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function SettingsPage() {
  const { data: user, isLoading } = useUserProfile();
  const { data: overview } = useAccountOverview();
  const updateProfile = useUpdateUserProfile();
  const updatePreferences = useUpdatePreferences();
  const updateNotifications = useUpdateNotifications();
  const changePassword = useChangePassword();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setLocation(user.location ?? "");
    }
  }, [user]);

  if (isLoading || !user) {
    return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;
  }

  const saveProfile = () => {
    updateProfile.mutate({ name, location });
  };

  const submitPasswordChange = () => {
    setPasswordMessage(null);
    changePassword.mutate(passwordForm, {
      onSuccess: () => {
        setPasswordMessage("Password updated.");
        setPasswordForm({ currentPassword: "", newPassword: "" });
      },
      onError: (err: any) => {
        setPasswordMessage(err?.message ?? "Couldn't update your password.");
      },
    });
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Your profile, preferences, and everything LifeOS knows about you
          </p>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile card */}
        <Card className="lg:col-span-1 hover:border-primary/20 transition-colors">
          <CardHeader className="pb-3 flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Profile
            </CardTitle>
            <Badge variant="secondary" className="text-[11px] capitalize">
              {user.role.replace("_", " ")}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="text-xs h-8" />
            </div>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="text-xs h-8" placeholder="City, Country" />
            </div>
            <p className="text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3" /> {user.timezone}
            </p>
            <Button
              size="sm"
              className="w-full mt-1"
              disabled={updateProfile.isPending}
              onClick={saveProfile}
            >
              {updateProfile.isPending ? "Saving..." : "Save profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Preferences and appearance */}
        <Card className="lg:col-span-2 hover:border-primary/20 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-primary" />
              Preferences & appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* Theme */}
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/60 p-3">
              <div className="flex items-center gap-2">
                {user.preferences.darkMode ? (
                  <Moon className="h-4 w-4 text-primary" />
                ) : (
                  <SunMedium className="h-4 w-4 text-primary" />
                )}
                <div>
                  <p className="text-sm font-medium">Dark mode</p>
                  <p className="text-[11px] text-muted-foreground">
                    Toggle the app theme between light and dark.
                  </p>
                </div>
              </div>
              <Switch
                checked={user.preferences.darkMode}
                onCheckedChange={(checked) => updatePreferences.mutate({ darkMode: checked })}
              />
            </div>

            {/* Week start */}
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/60 p-3">
              <div>
                <p className="text-sm font-medium">Week starts on</p>
                <p className="text-[11px] text-muted-foreground">
                  Choose which day appears first in calendars and weekly views.
                </p>
              </div>
              <Select
                value={user.preferences.weekStartsOn === 0 ? "sunday" : "monday"}
                onValueChange={(v) => updatePreferences.mutate({ weekStartsOn: v === "sunday" ? 0 : 1 })}
              >
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="monday">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notifications */}
            <div className="space-y-2 rounded-md border border-border/60 bg-card/60 p-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Notifications</p>
                  <p className="text-[11px] text-muted-foreground">
                    Control reminders and alerts from tasks, calendar, and finance modules.
                  </p>
                </div>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Task reminders</Label>
                  <Switch
                    checked={user.notifications.notifyTasks}
                    onCheckedChange={(checked) => updateNotifications.mutate({ notifyTasks: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Calendar alerts</Label>
                  <Switch
                    checked={user.notifications.notifyCalendar}
                    onCheckedChange={(checked) => updateNotifications.mutate({ notifyCalendar: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Finance nudges</Label>
                  <Switch
                    checked={user.notifications.notifyFinance}
                    onCheckedChange={(checked) => updateNotifications.mutate({ notifyFinance: checked })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Your data at a glance — mirrors everything on the dashboard */}
      <motion.div variants={item}>
        <Card className="hover:border-primary/20 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" /> Your data at a glance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(overview?.modules ?? []).map((m) => (
                <div key={m.id} className="rounded-lg border border-border/60 bg-card/60 p-3 text-center">
                  <p className="text-xl font-bold">{m.count}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
                  {m.detail && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{m.detail}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="hover:border-primary/20 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>Email verified: {user.emailVerified ? "Yes" : "No"}</p>
            <p>Member since: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</p>
            <Button type="button" variant="outline" size="sm" className="mt-1">
              Sign out
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
