import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create two test users for a back-and-forth
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: { name: "Alice", email: "alice@example.com" },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: { name: "Bob", email: "bob@example.com" },
  });

  // ─── Argument 1: Open source ──────────────────

  const arg1 = await prisma.argument.create({
    data: {
      content:
        "Open-source software produces higher quality code than proprietary software because public scrutiny catches bugs faster.",
      kind: "ROOT",
      authorId: alice.id,
    },
  });

  const q1 = await prisma.question.create({
    data: {
      content:
        "How do you account for the fact that many critical open-source projects are maintained by just one or two people?",
      authorId: bob.id,
      argumentId: arg1.id,
    },
  });

  const reply1 = await prisma.argument.create({
    data: {
      content:
        "That's a real problem, but it speaks to funding, not code quality. When those projects do get reviewed, the open model still catches more issues than a closed one would.",
      kind: "REPLY",
      authorId: alice.id,
      questionId: q1.id,
    },
  });

  await prisma.argument.create({
    data: {
      content:
        "The Linux kernel is a strong example — thousands of contributors, extensive review, and it runs the majority of servers worldwide.",
      kind: "SUPPORT",
      authorId: bob.id,
      parentId: arg1.id,
    },
  });

  await prisma.argument.create({
    data: {
      content:
        "Heartbleed was in OpenSSL for two years before anyone noticed. Public scrutiny is not guaranteed just because code is public.",
      kind: "COUNTER",
      authorId: bob.id,
      parentId: arg1.id,
    },
  });

  // ─── Argument 2: Remote work ──────────────────

  const arg2 = await prisma.argument.create({
    data: {
      content:
        "Remote work increases productivity because it eliminates commute time and gives workers more autonomy over their environment.",
      kind: "ROOT",
      authorId: bob.id,
    },
  });

  const q2 = await prisma.question.create({
    data: {
      content:
        "Is there a distinction between productivity on individual tasks vs. collaborative work? Could remote help one but hurt the other?",
      authorId: alice.id,
      argumentId: arg2.id,
    },
  });

  await prisma.argument.create({
    data: {
      content:
        "Good point — studies show deep focus work improves remotely, but spontaneous collaboration does suffer. The net effect depends on the role.",
      kind: "REPLY",
      authorId: bob.id,
      questionId: q2.id,
    },
  });

  const support2 = await prisma.argument.create({
    data: {
      content:
        "A Stanford study found remote workers were 13% more productive, took fewer sick days, and reported higher job satisfaction.",
      kind: "SUPPORT",
      authorId: alice.id,
      parentId: arg2.id,
    },
  });

  await prisma.question.create({
    data: {
      content:
        "Was that study conducted before or after widespread remote work adoption? Pre-pandemic remote workers were self-selected.",
      authorId: bob.id,
      argumentId: support2.id,
    },
  });

  const counter2 = await prisma.argument.create({
    data: {
      content:
        "Remote work makes it harder to onboard junior employees who learn best through osmosis and in-person mentorship.",
      kind: "COUNTER",
      authorId: alice.id,
      parentId: arg2.id,
    },
  });

  await prisma.argument.create({
    data: {
      content:
        "Companies like GitLab have onboarded thousands of people fully remotely with structured documentation and async processes.",
      kind: "COUNTER",
      authorId: bob.id,
      parentId: counter2.id,
    },
  });

  // ─── Argument 3: AI in education ──────────────

  const arg3 = await prisma.argument.create({
    data: {
      content:
        "AI tutoring systems will democratize education by giving every student access to personalized instruction regardless of income.",
      kind: "ROOT",
      authorId: alice.id,
    },
  });

  await prisma.argument.create({
    data: {
      content:
        "Khan Academy's AI tutor Khanmigo has already shown promising results in providing 1-on-1 style help to students who would never have access to a private tutor.",
      kind: "SUPPORT",
      authorId: bob.id,
      parentId: arg3.id,
    },
  });

  await prisma.argument.create({
    data: {
      content:
        "Access requires internet and devices. The students who need help most are often the ones with the least access to technology.",
      kind: "COUNTER",
      authorId: bob.id,
      parentId: arg3.id,
    },
  });

  await prisma.question.create({
    data: {
      content:
        "What evidence is there that personalized AI instruction actually produces better learning outcomes than a good textbook?",
      authorId: bob.id,
      argumentId: arg3.id,
    },
  });

  console.log("Seed complete: 3 arguments with questions, supports, and counters.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
