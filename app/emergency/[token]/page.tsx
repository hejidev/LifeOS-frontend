"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { HeartPulse, Phone, AlertTriangle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmergencyPublic } from "@/lib/hooks/use-life-data";

function calcAge(dob?: string) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export default function PublicEmergencyPage() {
  const params = useParams();
  const token = params.token as string;
  const [pinInput, setPinInput] = useState("");
  const [submittedPin, setSubmittedPin] = useState<string | undefined>(undefined);
  const { data: emergency, isLoading, error } = useEmergencyPublic(token, submittedPin);

  const needsPin = (error as Error)?.message === "PIN required";
  const wrongPin = (error as Error)?.message === "Incorrect PIN";

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center px-4"><Skeleton className="h-64 w-full max-w-md rounded-xl" /></div>;
  }

  if (needsPin || wrongPin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Enter PIN</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); setSubmittedPin(pinInput); }} className="space-y-3">
              <Input value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))} maxLength={8} placeholder="Enter PIN" autoFocus />
              {wrongPin && <p className="text-xs text-destructive">Incorrect PIN — try again.</p>}
              <Button type="submit" className="w-full">Unlock</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !emergency) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">{(error as Error)?.message ?? "This emergency link is invalid."}</p>
      </div>
    );
  }

  const e = emergency as any;
  const age = calcAge(e.dateOfBirth);

  return (
    <div className="min-h-screen bg-red-950/10 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
            <HeartPulse className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">{e.name}{age !== null ? `, ${age}` : ""}</h1>
          <p className="text-xs text-muted-foreground">Emergency Medical Information</p>
          {e.pregnancyStatus && <p className="text-xs font-semibold text-destructive mt-1">⚠ PREGNANT</p>}
          {e.dnrStatus && <p className="text-xs font-semibold text-destructive mt-1">⚠ DNR ORDER ON FILE</p>}
        </div>

        <Card>
          <CardContent className="pt-6 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Blood type</p><p className="font-semibold">{e.bloodType || "Unknown"}</p></div>
            <div><p className="text-xs text-muted-foreground">Organ donor</p><p className="font-semibold">{e.organDonor ? "Yes" : "No"}</p></div>
            {e.height && <div><p className="text-xs text-muted-foreground">Height</p><p className="font-semibold">{e.height}</p></div>}
            {e.weight && <div><p className="text-xs text-muted-foreground">Weight</p><p className="font-semibold">{e.weight}</p></div>}
          </CardContent>
        </Card>

        {e.allergies && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Allergies</CardTitle></CardHeader>
            <CardContent className="pt-0"><p className="text-sm">{e.allergies}</p></CardContent>
          </Card>
        )}
        {e.conditions && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Medical conditions</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm">{e.conditions}</p></CardContent></Card>}
        {e.medications && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Current medications</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm">{e.medications}</p></CardContent></Card>}

        {(e.physicianName || e.preferredHospital) && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Care team</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-1">
              {e.preferredHospital && <p className="text-sm">Preferred hospital: {e.preferredHospital}</p>}
              {e.physicianName && (
                <div className="flex items-center justify-between">
                  <p className="text-sm">{e.physicianName}</p>
                  {e.physicianPhone && <a href={`tel:${e.physicianPhone}`} className="text-primary text-sm flex items-center gap-1"><Phone className="h-3 w-3" /> {e.physicianPhone}</a>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {e.insuranceProvider && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Insurance</CardTitle></CardHeader>
            <CardContent className="pt-0 text-sm space-y-1">
              <p>{e.insuranceProvider}{e.insurancePolicy ? ` · Policy ${e.insurancePolicy}` : ""}</p>
              {e.insurancePhone && <a href={`tel:${e.insurancePhone}`} className="text-primary flex items-center gap-1"><Phone className="h-3 w-3" /> {e.insurancePhone}</a>}
            </CardContent>
          </Card>
        )}

        {e.contacts?.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Emergency contacts</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2">
              {e.contacts.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div><p className="text-sm">{c.name}{c.canMakeMedicalDecisions ? " (medical decisions)" : ""}</p><p className="text-[11px] text-muted-foreground">{c.relationship}</p></div>
                  <a href={`tel:${c.phone}`} className="text-primary text-sm flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</a>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}