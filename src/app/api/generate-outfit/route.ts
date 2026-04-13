import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

type GarmentInput = {
  name: string;
  image: string | null;
  mimeType: string | null;
};

const STYLE_HINTS = [
  "casual and relaxed everyday style",
  "smart casual / business casual style",
  "sporty and active style",
  "elegant and dressy style",
  "trendy street fashion style",
];

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  let tops: GarmentInput[];
  let bottoms: GarmentInput[];
  let outers: GarmentInput[];
  let accessories: GarmentInput[];
  let wardrobe: GarmentInput[];
  let gender: "male" | "female";
  let variationIndex: number;

  try {
    const body = await req.json();
    tops = body.tops ?? [];
    bottoms = body.bottoms ?? [];
    outers = body.outers ?? [];
    accessories = body.accessories ?? [];
    wardrobe = body.wardrobe ?? [];
    gender = body.gender === "female" ? "female" : "male";
    variationIndex = typeof body.variationIndex === "number" ? body.variationIndex : 0;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const isMultiMode = wardrobe.length > 0;

  if (!isMultiMode && tops.length === 0 && bottoms.length === 0) {
    return NextResponse.json({ error: "At least one garment is required" }, { status: 400 });
  }
  if (isMultiMode && wardrobe.length === 0) {
    return NextResponse.json({ error: "Wardrobe is empty" }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = isMultiMode
      ? buildMultiContents(wardrobe, gender, variationIndex)
      : buildSingleContents(tops, bottoms, outers, accessories, gender);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
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

function mannequinDesc(gender: "male" | "female") {
  return `${gender} fashion mannequin, full body from head to toe, standing upright with feet shoulder-width apart and arms straight down at sides`;
}

const BACKGROUND = "Pure white background.";

function buildSingleContents(tops: GarmentInput[], bottoms: GarmentInput[], outers: GarmentInput[], accessories: GarmentInput[], gender: "male" | "female") {
  const parts: object[] = [];

  tops.forEach((item, i) => {
    parts.push({ text: `Top garment ${i + 1}${item.name ? ` (${item.name})` : ""}:` });
    if (item.image && item.mimeType) {
      parts.push({ inlineData: { data: item.image, mimeType: item.mimeType } });
    }
  });

  bottoms.forEach((item, i) => {
    parts.push({ text: `Bottom garment ${i + 1}${item.name ? ` (${item.name})` : ""}:` });
    if (item.image && item.mimeType) {
      parts.push({ inlineData: { data: item.image, mimeType: item.mimeType } });
    }
  });

  outers.forEach((item, i) => {
    parts.push({ text: `Outer garment ${i + 1}${item.name ? ` (${item.name})` : ""}:` });
    if (item.image && item.mimeType) {
      parts.push({ inlineData: { data: item.image, mimeType: item.mimeType } });
    }
  });

  accessories.forEach((item, i) => {
    parts.push({ text: `Accessory ${i + 1}${item.name ? ` (${item.name})` : ""}:` });
    if (item.image && item.mimeType) {
      parts.push({ inlineData: { data: item.image, mimeType: item.mimeType } });
    }
  });

  const topDesc =
    tops.length > 1
      ? tops.map((t) => t.name || "top").join(" layered under ")
      : tops[0]?.name || "the top garment";
  const bottomDesc =
    bottoms.length > 1
      ? bottoms.map((b) => b.name || "bottom").join(" layered under ")
      : bottoms[0]?.name || "the bottom garment";
  const outerDesc = outers.length > 0
    ? `, with ${outers.map((o) => o.name || "outer").join(" layered over ")} on top`
    : "";
  const accessoryDesc = accessories.length > 0
    ? `, accessorized with ${accessories.map((a) => a.name || "accessory").join(" and ")}`
    : "";

  const layeringRule = `CRITICAL RULE: Do NOT blend, merge, or combine the designs of separate garments into one. Each garment must remain visually distinct and recognizable as a separate piece. When multiple tops are provided, show the innermost one first and layer each subsequent one physically on top — both must be visible as distinct items of clothing (e.g. a t-shirt visible underneath an open overshirt).`;

  const allItems = [...tops, ...bottoms, ...outers, ...accessories];
  let instruction = "";
  if (allItems.length > 0) {
    const wearingParts: string[] = [];
    if (tops.length > 0) wearingParts.push(`${topDesc} as top`);
    if (bottoms.length > 0) wearingParts.push(`${bottomDesc} as bottom`);
    if (outers.length > 0) wearingParts.push(outerDesc.replace(", with ", "").replace(" on top", "") + " as outer layer");
    if (accessories.length > 0) wearingParts.push(accessoryDesc.replace(", accessorized with ", "") + " as accessories");
    instruction = `Generate a high quality fashion photo of a ${mannequinDesc(gender)} wearing ${wearingParts.join(", ")}${outerDesc}${accessoryDesc}. Reproduce each garment exactly as shown in the reference images above. ${layeringRule} ${BACKGROUND}`;
  }

  parts.push({ text: instruction });
  return [{ parts }];
}

function buildMultiContents(wardrobe: GarmentInput[], gender: "male" | "female", variationIndex: number) {
  const parts: object[] = [];
  const style = STYLE_HINTS[variationIndex % STYLE_HINTS.length];

  parts.push({ text: `Here are clothing items from a wardrobe (${wardrobe.length} items):` });

  wardrobe.forEach((item, i) => {
    parts.push({ text: `Item ${i + 1}${item.name ? ` - ${item.name}` : ""}:` });
    if (item.image && item.mimeType) {
      parts.push({ inlineData: { data: item.image, mimeType: item.mimeType } });
    }
  });

  parts.push({
    text:
      `From the wardrobe items shown above, select the best combination for a "${style}" outfit. ` +
      `Generate a high quality fashion photo of a ${mannequinDesc(gender)} wearing your chosen outfit combination. ` +
      `Do NOT blend or merge garment designs — each selected piece must remain visually distinct. ` +
      `${BACKGROUND}`,
  });

  return [{ parts }];
}
