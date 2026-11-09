import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { verifyAccessToken } from "../services/token.service";
import { prisma } from "../config/prisma";
import { setIO } from "./io-instance";

import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "../config/redis";
import { logger } from "../lib/logger";

export function initSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  setIO(io);

  try {
    io.adapter(createAdapter(redis.duplicate(), redis.duplicate()));
  } catch (err) {
    logger.error("[socket] redis adapter unavailable, realtime only reaches clients on this instance:", err);
  }

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Not authenticated"));

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) return next(new Error("Not authenticated"));

      socket.data.user = { id: user.id, role: user.role };
      next();
    } catch {
      next(new Error("Not authenticated"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user.id as string;
    socket.join(`user:${userId}`);
  });

  return io;
}