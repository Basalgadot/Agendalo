export const dynamic = "force-dynamic";
import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendalo.app";

  const businesses = await prisma.business.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  const businessUrls: MetadataRoute.Sitemap = businesses.map((b) => ({
    url: `${appUrl}/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...businessUrls,
  ];
}
