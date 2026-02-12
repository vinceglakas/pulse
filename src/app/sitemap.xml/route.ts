import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: briefs } = await supabase
    .from("briefs")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  const baseUrl = "https://pulsed.ai";

  const urls = [
    `<url><loc>${baseUrl}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${baseUrl}/signup</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`,
    ...(briefs ?? []).map(
      (b) =>
        `<url><loc>${baseUrl}/brief/${b.id}</loc><lastmod>${new Date(b.created_at).toISOString().split("T")[0]}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
