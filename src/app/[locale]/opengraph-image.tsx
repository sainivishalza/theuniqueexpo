import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Route-level default social-share image -- any page that doesn't set its
// own openGraph.images (the homepage, and most non-content pages) falls
// back to this instead of showing a blank/broken preview when shared.
export default function OpengraphImage() {
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
          background: "linear-gradient(135deg, #011714 0%, #03483f 45%, #0b6b5b 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 88,
              height: 88,
              borderRadius: 20,
              background: "linear-gradient(135deg, #d4af5a 0%, #c9a24a 100%)",
            }}
          />
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#ffffff" }}>
            The Unique Expo
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#d4af5a", fontWeight: 600 }}>
          Discover Something Unique Together
        </div>
      </div>
    ),
    { ...size }
  );
}
