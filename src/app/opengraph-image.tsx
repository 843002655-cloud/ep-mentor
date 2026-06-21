import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "EP Mentor — 心脏电生理AI导师";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function og() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a1628 0%, #1B4F8A 50%, #4C3D9E 100%)",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        <div style={{ fontSize: 88, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 64, fontWeight: 900, color: "#ffffff", marginBottom: 16 }}>EP Mentor</div>
        <div style={{ fontSize: 32, color: "#93c5fd", marginBottom: 32 }}>心脏电生理 AI 导师</div>
        <div style={{ display: "flex", gap: 16 }}>
          {["SVT", "房颤", "室速", "导管消融"].map((cat) => (
            <div
              key={cat}
              style={{
                fontSize: 20,
                color: "#bfdbfe",
                background: "rgba(255,255,255,0.12)",
                padding: "8px 20px",
                borderRadius: 20,
              }}
            >
              {cat}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 20, color: "rgba(255,255,255,0.55)", marginTop: 36 }}>
          苏格拉底式对话，像资深术者一样思考每一份 EGM
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
