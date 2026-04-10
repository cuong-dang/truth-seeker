import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";
import { cleanupUnverifiedUsers } from "@/lib/cleanup";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();

  if (!name?.trim() || !email?.trim() || !password) {
    return Response.json({ error: "Name, email, and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { name: name.trim(), email: email.trim(), passwordHash },
  });

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.verificationToken.create({
    data: { identifier: email.trim(), token, expires },
  });

  await sendVerificationEmail(email.trim(), token);

  // Opportunistic cleanup of old unverified users
  cleanupUnverifiedUsers().catch(() => {});

  return Response.json({ ok: true }, { status: 201 });
}
