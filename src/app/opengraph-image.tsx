import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "ITCodeCraft — IT-школа онлайн для дітей 9–17 років";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonts = join(process.cwd(), "src/assets/fonts");

export default async function Image() {
  const [display, sans] = await Promise.all([
    readFile(join(fonts, "Unbounded-Bold.ttf")),
    readFile(join(fonts, "Onest-Medium.ttf")),
  ]);

  const chip = (text: string) => (
    <div
      style={{
        display: "flex",
        padding: "10px 22px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.18)",
        border: "1.5px solid rgba(255,255,255,0.4)",
        fontSize: 26,
        color: "#fff",
      }}
    >
      {text}
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(120deg, #6d4aff 0%, #9a5cf2 55%, #c155e8 100%)",
          fontFamily: "Onest",
          color: "#fff",
        }}
      >
        {/* світлові плями й орбіта */}
        <div style={{ position: "absolute", top: -140, left: -120, width: 460, height: 460, borderRadius: 999, background: "rgba(255,255,255,0.14)" }} />
        <div style={{ position: "absolute", right: -170, top: 50, width: 640, height: 640, borderRadius: 999, border: "2px solid rgba(255,255,255,0.28)" }} />
        <div style={{ position: "absolute", right: -60, top: 160, width: 420, height: 420, borderRadius: 999, border: "2px dashed rgba(255,255,255,0.3)" }} />

        {/* картка прогресу */}
        <div
          style={{
            position: "absolute",
            right: 70,
            top: 150,
            width: 360,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            padding: 30,
            borderRadius: 32,
            background: "#fff",
            color: "#1d1747",
            boxShadow: "0 30px 60px rgba(45,26,140,0.4)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 20, color: "#6a6397" }}>Курс · Python</div>
            <div style={{ fontFamily: "Unbounded", fontSize: 26 }}>Рівень 4</div>
          </div>
          <div style={{ display: "flex", height: 14, borderRadius: 999, background: "#e7e0fb" }}>
            <div style={{ width: "80%", borderRadius: 999, background: "linear-gradient(90deg,#6d4aff,#c155e8)" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ display: "flex", flex: 1, justifyContent: "center", padding: "12px 0", borderRadius: 16, background: "#e5f6ef", color: "#0f9d6b", fontSize: 20 }}>
              Урок 5 ✓
            </div>
            <div style={{ display: "flex", flex: 1, justifyContent: "center", padding: "12px 0", borderRadius: 16, background: "#fdeed8", color: "#b86300", fontSize: 20 }}>
              7 днів
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 760 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: 18,
                background: "#fff",
                color: "#6d4aff",
                fontFamily: "Unbounded",
                fontSize: 30,
              }}
            >
              {"</>"}
            </div>
            <div style={{ fontFamily: "Unbounded", fontSize: 38 }}>ITCodeCraft</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ fontFamily: "Unbounded", fontSize: 58, lineHeight: 1.15 }}>
              Діти стають творцями технологій
            </div>
            <div style={{ fontSize: 30, lineHeight: 1.35, color: "rgba(255,255,255,0.88)" }}>
              Програмування, дизайн і геймдев онлайн: уроки крок за кроком, домашки та рівні, як у грі
            </div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {chip("9–17 років")}
            {chip("2 уроки безкоштовно")}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Unbounded", data: display, style: "normal", weight: 700 },
        { name: "Onest", data: sans, style: "normal", weight: 500 },
      ],
    },
  );
}
