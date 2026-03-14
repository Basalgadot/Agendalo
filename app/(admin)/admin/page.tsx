export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  const [businesses, totals] = await Promise.all([
    prisma.business.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { email: true } },
        _count: {
          select: {
            bookings: { where: { status: { notIn: ["CANCELLED", "NO_SHOW"] } } },
          },
        },
      },
    }),
    prisma.business.groupBy({
      by: ["plan"],
      _count: { id: true },
    }),
  ]);

  const now = new Date();

  return (
    <AdminClient
      businesses={businesses.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        ownerEmail: b.owner.email,
        plan: b.plan,
        isActive: b.isActive,
        trialEndsAt: b.trialEndsAt?.toISOString() ?? null,
        trialExpired: b.plan === "FREE_TRIAL" && b.trialEndsAt != null && b.trialEndsAt < now,
        bookingCount: b._count.bookings,
        createdAt: b.createdAt.toISOString(),
      }))}
      stats={{
        total: businesses.length,
        active: businesses.filter((b) => b.isActive).length,
        trial: businesses.filter((b) => b.plan === "FREE_TRIAL").length,
        trialExpired: businesses.filter(
          (b) => b.plan === "FREE_TRIAL" && b.trialEndsAt != null && b.trialEndsAt < now
        ).length,
      }}
    />
  );
}
