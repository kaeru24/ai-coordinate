import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type GarmentInput = {
  name: string;
  image: string | null;
  mimeType: string | null;
};


export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  let tops: GarmentInput[];
  let bottoms: GarmentInput[];
  let outers: GarmentInput[];
  let accessories: GarmentInput[];

  try {
    const body = await req.json();
    tops = body.tops ?? [];
    bottoms = body.bottoms ?? [];
    outers = body.outers ?? [];
    accessories = body.accessories ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (tops.length === 0 && bottoms.length === 0 && outers.length === 0) {
    return NextResponse.json({ error: "At least one garment is required" }, { status: 400 });
  }

  let mannequin: { data: string; mimeType: string };
  try {
    mannequin = loadMannequinBase64("male");
  } catch {
    return NextResponse.json(
      { error: "Mannequin image not found: public/mannequins/male.png" },
      { status: 500 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = buildSingleContents(tops, bottoms, outers, accessories, mannequin, "Mannequin 1");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents,
      config: { responseModalities: ["IMAGE"] },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(
      (p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData?.data
    );

    if (!imagePart?.inlineData) {
      return NextResponse.json({ error: "No image was returned by Gemini API" }, { status: 502 });
    }

    return NextResponse.json({
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Gemini API error: ${message}` }, { status: 500 });
  }
}

const BACKGROUND = "Pure white background.";

function loadMannequinBase64(gender: "male" | "female"): { data: string; mimeType: string } {
  const filePath = path.join(process.cwd(), "public", "mannequins", `${gender}.png`);
  const data = fs.readFileSync(filePath).toString("base64");
  return { data, mimeType: "image/png" };
}

function buildSingleContents(
  tops: GarmentInput[],
  bottoms: GarmentInput[],
  outers: GarmentInput[],
  accessories: GarmentInput[],
  mannequin: { data: string; mimeType: string },
  mannequinLabel: string
) {
  const parts: object[] = [];

  // ── Step 1: 冒頭テキスト + マネキン参照画像 ──
  const itemCount = bottoms.length + tops.length + outers.length + accessories.length;
  parts.push({
    text: `You are an expert fashion photographer and virtual stylist. Take the provided ${mannequinLabel} (image_0.png) as the fixed base reference.\n\n=== MANDATORY BASE COMPLIANCE (image_0.png is the MASTER) ===\nThe final generated image must be a full-body photograph of the EXACT SAME ${mannequinLabel}, in the EXACT SAME front-facing pose, and centered within the frame EXACTLY like image_0.png. The background must remain the identical pure white (#FFFFFF), and the soft, even studio lighting must not change. Do not modify the ${mannequinLabel}'s body shape or skin tone. Do not crop the feet.\n\n${mannequinLabel} is wearing exactly ${itemCount} garment(s).`,
  });
  parts.push({ inlineData: { data: mannequin.data, mimeType: mannequin.mimeType } });

  // ── Step 2: VIRTUAL DRESSING ──
  parts.push({ text: `=== VIRTUAL DRESSING & LAYERING (UNTUCKED) ===\nVirtually dress this fixed base mannequin with the following garments. Follow these physical layering and untucked styling rules strictly:` });

  let itemNumber = 1;

  if (bottoms.length > 0) {
    bottoms.forEach((item) => {
      parts.push({
        text: `${itemNumber}. **BOTTOM GARMENT (${item.name ?? "Bottom"}):**\n   - Details: ${item.name ?? "Bottom garment"}. Refer to the provided reference image for the exact appearance.`,
      });
      if (item.image && item.mimeType) parts.push({ inlineData: { data: item.image, mimeType: item.mimeType } });
      itemNumber++;
    });
  }

  if (tops.length > 0) {
    tops.forEach((item) => {
      parts.push({
        text: `${itemNumber}. **INNER TOP (${item.name ?? "Inner Top"}):**\n   - Details: ${item.name ?? "Inner top"}. Refer to the provided reference image for the exact appearance.\n   - Styling: **MUST be Worn UNTUCKED. Drape the hem of this Inner Top visibly OVER and BELOW the pants' waistband.** The fabric should drape naturally over the trousers. The shirt must be worn untucked. Do NOT tuck the shirt into the pants in any way. The hem should hang naturally over the waistband. No front tuck, no partial tuck.`,
      });
      if (item.image && item.mimeType) parts.push({ inlineData: { data: item.image, mimeType: item.mimeType } });
      itemNumber++;
    });
  }

  if (outers.length > 0) {
    outers.forEach((item) => {
      parts.push({
        text: `${itemNumber}. **OUTER GARMENT (${item.name ?? "Outer"}):**\n   - Details: ${item.name ?? "Outer garment"}. Refer to the provided reference image for the exact appearance.\n   - Styling: **MUST be Worn OPEN.** Drape this jacket over the INNER TOP and BOTTOM. The open front must clearly display the untucked Inner Top and the pants' waistband area underneath. The outer hem should extend to or below the inner top.`,
      });
      if (item.image && item.mimeType) parts.push({ inlineData: { data: item.image, mimeType: item.mimeType } });
      itemNumber++;
    });
  }

  if (accessories.length > 0) {
    accessories.forEach((item) => {
      parts.push({
        text: `${itemNumber}. **ACCESSORY (${item.name ?? "Accessory"}):**\n   - Details: ${item.name ?? "Accessory"}. Refer to the provided reference image for the exact appearance.`,
      });
      if (item.image && item.mimeType) parts.push({ inlineData: { data: item.image, mimeType: item.mimeType } });
      itemNumber++;
    });
  }

  // ── Step 3: CRITICAL OVERLAP RULES ──
  if (tops.length > 0 || outers.length > 0) {
    parts.push({
      text: `=== CRITICAL OVERLAP RULES (FIX THE HEMLINE) ===\n1. **MULTI-LAYER HEMLINE STRUCTURE:** The mannequin must display a clearly defined, untucked, multi-layered hemline structure. **All tops must have their hems resting outside of the pants.** The combined, overhanging hems of both tops must completely conceal the pants' waistband. No part of any garment is tucked inside the pants.\n2. **UNTUCKED RULE:** The shirt must be worn untucked. Do NOT tuck the shirt into the pants in any way. The hem should hang naturally over the waistband. No front tuck, no partial tuck.`,
    });
  }

  // ── Step 4: FINAL VISUAL CHECKS ──
  const finalChecks: string[] = [
    `${mannequinLabel} is identical to image_0.png.`,
    `The background, pose, and framing match image_0.png.`,
  ];

  if (bottoms.length > 0 && bottoms[0].name) {
    finalChecks.push(`${bottoms[0].name} is visible at the legs with its exact appearance from the reference image.`);
  }
  if (tops.length > 0 && bottoms.length > 0 && tops[0].name) {
    finalChecks.push(`The ${tops[0].name} hem is visibly outside and below the waistband.`);
  }
  if (outers.length > 0 && bottoms.length > 0 && outers[0].name) {
    finalChecks.push(`The ${outers[0].name} hem is visibly outside and below the waistband, and below the inner top hem.`);
  }
  if (tops.length > 0 && outers.length > 0) {
    finalChecks.push(`A distinct multi-layer hemline is visible.`);
  }
  if (outers.length > 0) {
    finalChecks.push(`The outer garment is open and the inner top is visible underneath.`);
  }

  finalChecks.push(`No shoes are generated.`);
  finalChecks.push(`No part of any garment is tucked in.`);

  const checksText = finalChecks.map((v, i) => `(${i + 1}) ${v}`).join("\n");

  parts.push({
    text: `=== FINAL VISUAL CHECKS ===\n${checksText}\nDo not apply any creative styling that conflicts with these rules.`,
  });

  return [{ parts }];
}
