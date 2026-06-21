import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1B4F8A, #4C3D9E)",
          borderRadius: 96,
          fontSize: 280,
        }}
      >
        ⚡
      </div>
    ),
    { width: 512, height: 512 }
  );
}
