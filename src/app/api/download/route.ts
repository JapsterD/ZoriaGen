import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, { redirect: "follow" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("Content-Type") || "";
    if (!contentType.startsWith("video/")) {
      return NextResponse.json(
        { error: "Not a video response" },
        { status: 502 }
      );
    }

    const arrayBuffer = await upstream.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(arrayBuffer.byteLength),
        "Content-Disposition": `attachment; filename="zoria-video.mp4"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
