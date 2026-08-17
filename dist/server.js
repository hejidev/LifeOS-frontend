"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_dns_1 = __importDefault(require("node:dns"));
node_dns_1.default.setDefaultResultOrder("ipv4first");
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const sockets_1 = require("./sockets");
const server = http_1.default.createServer(app_1.default);
(0, sockets_1.initSocket)(server);
server.listen(env_1.env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env_1.env.PORT}`);
});
