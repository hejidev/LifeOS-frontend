"use client";

import { useEffect, useState } from "react";

function cookie(name: string) {
  const hit = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

export function useAuthState() {
  const [state, setState] = useState({ authed: false, home: "/app/dashboard" });

  useEffect(() => {
    const role = cookie("lifeos_role");
    setState({
      authed: cookie("lifeos_authed") === "1",
      home: role === "SUPER_ADMIN" ? "/super-admin" : role === "ADMIN" ? "/admin" : "/app/dashboard",
    });
  }, []);

  return state;
}