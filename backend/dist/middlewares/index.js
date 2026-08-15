"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
const server_1 = require("next/server");
function middleware(req) {
    const { pathname } = req.nextUrl;
    const isPublic = pathname === "/" ||
        pathname === "/about" ||
        pathname === "/contact" ||
        pathname === "/faq" ||
        pathname.startsWith("/blog") ||
        pathname === "/terms" ||
        pathname === "/privacy" ||
        pathname === "/login" ||
        pathname === "/signup" ||
        pathname.startsWith("/staff") ||
        pathname === "/forgot-password" ||
        pathname === "/reset-password" ||
        pathname === "/family/join" ||
        pathname.startsWith("/emergency/") ||
        pathname.startsWith("/oauth") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon");
    if (isPublic)
        return server_1.NextResponse.next();
    const isAuthed = req.cookies.get("lifeos_authed")?.value === "1";
    if (!isAuthed) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return server_1.NextResponse.redirect(url);
    }
    const role = req.cookies.get("lifeos_role")?.value;
    if (pathname.startsWith("/super-admin") && role !== "SUPER_ADMIN") {
        const url = req.nextUrl.clone();
        url.pathname = "/app/dashboard";
        return server_1.NextResponse.redirect(url);
    }
    if (pathname.startsWith("/admin") && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        const url = req.nextUrl.clone();
        url.pathname = "/app/dashboard";
        return server_1.NextResponse.redirect(url);
    }
    return server_1.NextResponse.next();
}
exports.config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
