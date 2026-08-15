import { Suspense } from "react";
import FamilyJoinClient from "./FamilyJoinClient";

export default function FamilyJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md animate-pulse">
            <div className="h-64 w-full rounded-xl bg-muted" />
          </div>
        </div>
      }
    >
      <FamilyJoinClient />
    </Suspense>
  );
}