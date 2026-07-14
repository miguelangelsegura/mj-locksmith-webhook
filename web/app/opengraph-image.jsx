import { ImageResponse } from "next/og";

// Real, generated share card (Open Graph + Twitter). 1200x630, no external assets.
export const alt =
  "Dispango — AI receptionist for the Canadian trades industry. Answers every call, texts you the lead.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          color: "#fff",
          backgroundColor: "#0d1220",
          backgroundImage:
            "radial-gradient(900px 520px at 15% 0%, rgba(91,91,245,0.55), transparent 60%), radial-gradient(700px 480px at 100% 100%, rgba(255,122,77,0.32), transparent 62%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <div
            style={{
              width: "84px",
              height: "84px",
              borderRadius: "22px",
              backgroundImage: "linear-gradient(135deg, #5b5bf5, #3a34c9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="52" height="52" viewBox="0 0 32 32" fill="none">
              <circle cx="11" cy="22" r="2.6" fill="#fff" />
              <path d="M11 17a5 5 0 0 1 5 5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M11 12a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: "46px", fontWeight: 800, letterSpacing: "-1.5px" }}>Dispango</div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ fontSize: "68px", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", maxWidth: "1000px" }}>
            The call you missed just became someone else&apos;s job.
          </div>
          <div style={{ fontSize: "30px", color: "rgba(255,255,255,0.72)", maxWidth: "900px" }}>
            AI receptionist for the Canadian trades. Answers every call, captures the job, texts you the lead — 24/7.
          </div>
        </div>

        {/* Footer chips */}
        <div style={{ display: "flex", gap: "16px" }}>
          {["Flat $199/mo", "Keep your number", "Built in Canada"].map((t) => (
            <div
              key={t}
              style={{
                fontSize: "26px",
                fontWeight: 600,
                padding: "12px 26px",
                borderRadius: "999px",
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
