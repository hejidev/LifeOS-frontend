import { Suspense } from "react";
import OAuthCallback from "./OAuthCallback";

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p>Loading...</p>
        </div>
      }
    >
      <OAuthCallback />
    </Suspense>
  );
}