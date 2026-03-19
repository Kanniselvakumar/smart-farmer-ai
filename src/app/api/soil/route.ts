import { NextRequest, NextResponse } from "next/server";
import { classifySoilImage } from "@/lib/soil-classifier";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || typeof image === "string" || typeof (image as any).arrayBuffer !== "function") {
      return NextResponse.json({ error: "Upload a soil image first." }, { status: 400 });
    }

    const file = image as File;
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Use an image file smaller than 10 MB." },
        { status: 400 },
      );
    }

    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const prediction = await classifySoilImage(imageBuffer);

    return NextResponse.json(prediction);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to classify the soil image right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
