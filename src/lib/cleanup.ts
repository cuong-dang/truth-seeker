import { prisma } from "./prisma";

export async function cleanupUnverifiedUsers() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.user.deleteMany({
    where: {
      emailVerified: null,
      passwordHash: { not: null },
      createdAt: { lt: cutoff },
    },
  });

  return result.count;
}
