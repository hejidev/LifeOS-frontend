"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
const socket_io_1 = require("socket.io");
const env_1 = require("../config/env");
const token_service_1 = require("../services/token.service");
const prisma_1 = require("../config/prisma");
const io_instance_1 = require("./io-instance");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("../config/redis");
const logger_1 = require("../lib/logger");
function initSocket(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: { origin: env_1.env.FRONTEND_URL, credentials: true },
    });
    (0, io_instance_1.setIO)(io);
    try {
        io.adapter((0, redis_adapter_1.createAdapter)(redis_1.redis.duplicate(), redis_1.redis.duplicate()));
    }
    catch (err) {
        logger_1.logger.error("[socket] redis adapter unavailable, realtime only reaches clients on this instance:", err);
    }
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token)
                return next(new Error("Not authenticated"));
            const payload = (0, token_service_1.verifyAccessToken)(token);
            const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user || !user.isActive)
                return next(new Error("Not authenticated"));
            socket.data.user = { id: user.id, role: user.role };
            next();
        }
        catch {
            next(new Error("Not authenticated"));
        }
    });
    io.on("connection", (socket) => {
        const userId = socket.data.user.id;
        socket.join(`user:${userId}`);
    });
    return io;
}
