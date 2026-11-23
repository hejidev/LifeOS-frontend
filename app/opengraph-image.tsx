import { ImageResponse } from "next/og";

export const alt = "LifeOS: your whole life in one place";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg, #0b0f1a 0%, #1e1b4b 100%)", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", marginRight: 20 }} />
          <div style={{ fontSize: 44, fontWeight: 700 }}>LifeOS</div>
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>Your whole life, in one place.</div>
        <div style={{ fontSize: 30, marginTop: 28, color: "#c7d2fe", maxWidth: 900 }}>Tasks, money, health, family and a point-of-sale for your shop.</div>
      </div>
    ),
    size
  );
}