"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const env_1 = require("../config/env");
const isDev = env_1.env.NODE_ENV !== "production";
exports.logger = {
    info: (...args) => console.log("[info]", ...args),
    warn: (...args) => console.warn("[warn]", ...args),
    error: (...args) => console.error("[error]", ...args),
    debug: (...args) => {
        if (isDev)
            console.debug("[debug]", ...args);
    },
};
