export async function GET() {
  const baseUrl = "https://www.runpulsed.ai";

  const urls = [
    `<url><loc>${baseUrl}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${baseUrl}/signup</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`,
    `<url><loc>${baseUrl}/pricing</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    `<url><loc>${baseUrl}/login</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
    `<url><loc>${baseUrl}/privacy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>`,
    `<url><loc>${baseUrl}/terms</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>`,
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
