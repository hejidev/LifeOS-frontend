import { Router } from "express";
import type { Request } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../lib/errors";
import { consumeLimit } from "../lib/rate-limit";
import { verifyUnsubscribeToken } from "../lib/email-links";

const router = Router();

const LISTS: Record<
  string,
  { field: "notifyWeekly"; label: string }
> = {
  weekly: {
    field: "notifyWeekly",
    label: "the weekly review email",
  },
};

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const page = (heading: string, body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>LifeOS</title></head>
<body style="margin:0;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px">
<div style="max-width:420px;background:#111;border:1px solid #222;border-radius:16px;padding:32px;text-align:center">
<h1 style="margin:0 0 12px;font-size:20px">${heading}</h1><div style="color:#999;font-size:14px;line-height:1.6">${body}</div></div></body></html>`;


function read(req: Request) {
  const list = LISTS[req.params.list];

  const userId =
    typeof req.query.u === "string" ? req.query.u : "";
  const token =
    typeof req.query.t === "string" ? req.query.t : "";

  if (
    !list ||
    !userId ||
    !token ||
    userId.length > 64 ||
    token.length > 128 ||
    !verifyUnsubscribeToken(userId, req.params.list, token)
  ) {
    return null;
  }

  return {
    list,
    userId,
    token,
    name: req.params.list,
  };
}

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

router.get(
  "/:list",
  asyncHandler(async (req, res) => {
    const clientIp = req.ip ?? "unknown";

    await consumeLimit(
      `rl:unsub:${clientIp}`,
      60,
      3600,
      "Too many requests."
    );

    const found = read(req);

    if (!found) {
      return res.status(400).send(
        page(
          "This link isn't valid",
          "It may be incomplete. You can manage emails any time in LifeOS under Settings, then Notifications."
        )
      );
    }

    const action = `/api/public/unsubscribe/${found.name}?u=${encodeURIComponent(
      found.userId
    )}&t=${encodeURIComponent(found.token)}`;

    return res.send(
      page(
        "Stop these emails?",
        `<p style="margin:0 0 20px">You'll no longer receive ${esc(
          found.list.label
        )}.</p>
         <form method="post" action="${esc(action)}">
           <button type="submit" style="background:#6366f1;color:#fff;border:0;border-radius:8px;padding:12px 24px;font-size:14px;font-weight:600;cursor:pointer">Unsubscribe</button>
         </form>`
      )
    );
  })
);

router.post(
  "/:list",
  asyncHandler(async (req, res) => {
    const clientIp = req.ip ?? "unknown";

    await consumeLimit(
      `rl:unsub:${clientIp}`,
      60,
      3600,
      "Too many requests."
    );

    const found = read(req);

    if (!found) {
      return res.status(400).send(
        page("This link isn't valid", "It may be incomplete.")
      );
    }

    await prisma.user.updateMany({
      where: { id: found.userId },
      data: {
        [found.list.field]: false,
      },
    });

    return res.send(
      page(
        "You're unsubscribed",
        `You won't get ${esc(found.list.label)} any more. You can turn it back on in LifeOS under Settings.`
      )
    );
  })
);

export default router;