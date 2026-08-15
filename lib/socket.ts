import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/api/client";

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace("/api", "");

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  if (socket && socket.connected) return socket;

  socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}