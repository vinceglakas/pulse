import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import BriefPage from "./brief-client";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !UUID_REGEX.test(id)) {
    return { title: "Brief | Pulsed" };
  }

  const { data } = await supabase
    .from("briefs")
    .select("topic, brief_text")
    .eq("id", id)
    .single();

  if (!data) {
    return { title: "Brief | Pulsed" };
  }

  const topic = data.topic ?? "Research Brief";

  // Try to extract executive_summary from structured JSON brief
  let description = "";
  try {
    const cleaned = (data.brief_text as string)
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.executive_summary === "string") {
      description = parsed.executive_summary.slice(0, 160);
    }
  } catch {
    description = (data.brief_text as string).slice(0, 160);
  }

  const ogImageUrl = `/api/og/${id}`;

  return {
    title: `${topic} | Pulsed`,
    description,
    openGraph: {
      title: `${topic} | Pulsed`,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${topic} | Pulsed`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function Page({ params }: Props) {
  return <BriefPage params={params} />;
}
