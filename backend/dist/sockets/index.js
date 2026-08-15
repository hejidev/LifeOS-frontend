"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
const socket_io_1 = require("socket.io");
const env_1 = require("../config/env");
const token_service_1 = require("../services/token.service");
const prisma_1 = require("../config/prisma");
const io_instance_1 = require("./io-instance");
function initSocket(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: { origin: env_1.env.FRONTEND_URL, credentials: true },
    });
    (0, io_instance_1.setIO)(io);
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
