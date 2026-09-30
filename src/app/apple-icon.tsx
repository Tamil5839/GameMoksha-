import { ImageResponse } from "next/og";
import { lotusPrims, primsToSvg } from "@/components/board/primitives";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const lotus = `data:image/svg+xml;base64,${Buffer.from(primsToSvg(lotusPrims(32, 40, 0.8), "0 0 64 64")).toString("base64")}`;

/** Home-screen icon for iPhones: the lotus on parchment. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#f5e6c8" }}>
        <img src={lotus} width={150} height={150} alt="" />
      </div>
    ),
    size,
  );
}
