import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

// ─── S3/MinIO upload from local files ────────────

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});
const BUCKET = process.env.S3_BUCKET!;
const SEED_IMAGES_DIR = join(__dirname, "seed-images");

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: BUCKET,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${BUCKET}/*`],
            },
          ],
        }),
      })
    );
  }
  bucketReady = true;
}

// Upload a local file from prisma/seed-images/ to MinIO and return the public URL
const uploadCache = new Map<string, string>();

async function upload(filename: string): Promise<string> {
  if (uploadCache.has(filename)) return uploadCache.get(filename)!;

  await ensureBucket();

  const filePath = join(SEED_IMAGES_DIR, filename);
  const body = readFileSync(filePath);
  const ext = filename.split(".").pop() || "jpg";

  const contentTypeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
  };

  const key = `seed/${filename}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentTypeMap[ext] || "image/jpeg",
    })
  );

  const publicBase = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${BUCKET}`;
  const url = `${publicBase}/${key}`;
  uploadCache.set(filename, url);
  console.log(`  ✓ uploaded ${filename} (${(body.length / 1024).toFixed(0)}KB)`);
  return url;
}

// ─────────────────────────────────────────────────

async function main() {
  console.log("Mirroring external images to MinIO...\n");

  // Clean existing data — use raw SQL to bypass FK ordering issues
  await prisma.$executeRawUnsafe(`TRUNCATE "ArgumentVote", "QuestionVote", "Argument", "Question", "VerificationToken", "Session", "Account", "User" CASCADE`);


  // ─── Upload local seed images to MinIO ──────────
  const urls = {
    // Profile pictures (downloaded from pravatar.cc)
    alice: await upload("alice.jpg"),
    marcus: await upload("marcus.jpg"),
    sarah: await upload("sarah.jpg"),
    james: await upload("james.jpg"),
    priya: await upload("priya.jpg"),
    david: await upload("david.jpg"),
    emma: await upload("emma.jpg"),
    omar: await upload("omar.jpg"),
    // Topic images
    fanucRobot: await upload("fanuc-robot.jpg"),
    healthCost: await upload("health-cost.jpg"),
    socialMedia: await upload("social-media.jpg"),
    nuclearPlant: await upload("nuclear-plant.jpg"),
    bitcoin: await upload("bitcoin.jpg"),
    // Reaction GIFs (downloaded from Tenor)
    exactlyRight: await upload("exactly-right.gif"),
    makingItRain: await upload("making-it-rain.gif"),
    thisIsFine: await upload("this-is-fine.gif"),
    exactlyCorrect: await upload("exactly-correct.gif"),
    micDrop: await upload("mic-drop.gif"),
    picardFacepalm: await upload("picard-facepalm.gif"),
    mindBlown: await upload("mind-blown.gif"),
    facepalm: await upload("facepalm.gif"),
    boom: await upload("boom.gif"),
  };

  console.log(`\nUploaded ${uploadCache.size} images to MinIO.\n`);

  // ─── Users ─────────────────────────────────────
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Alice Chen",
        email: "alice@example.com",
        image: urls.alice,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: "Marcus Johnson",
        email: "marcus@example.com",
        image: urls.marcus,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: "Sarah Williams",
        email: "sarah@example.com",
        image: urls.sarah,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: "James Rodriguez",
        email: "james@example.com",
        image: urls.james,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: "Priya Patel",
        email: "priya@example.com",
        image: urls.priya,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: "David Kim",
        email: "david@example.com",
        image: urls.david,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: "Emma Thompson",
        email: "emma@example.com",
        image: urls.emma,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: "Omar Hassan",
        email: "omar@example.com",
        image: urls.omar,
        emailVerified: new Date(),
      },
    }),
  ]);

  const [alice, marcus, sarah, james, priya, david, emma, omar] = users;

  // Helper to create an argument
  const arg = (
    content: string,
    authorId: string,
    kind: "ROOT" | "SUPPORT" | "COUNTER" | "REPLY" = "ROOT",
    opts: { parentId?: string; questionId?: string; imageUrl?: string; tag?: "NEWS" | "TECH" | "EDUCATION" | "POLITICS" | "RELIGION" | "GAMING" | "SPORTS" | "ENTERTAINMENT" } = {}
  ) =>
    prisma.argument.create({
      data: { content, kind, authorId, ...opts },
    });

  // Helper to create a question
  const q = (content: string, authorId: string, argumentId: string, imageUrl?: string) =>
    prisma.question.create({
      data: { content, authorId, argumentId, imageUrl },
    });

  // ─── 1. AI replacing jobs ──────────────────────
  // Posts: 1 root + 1Q + 1 reply + 1S + 1C + 1 question on counter = 6
  const ai = await arg(
    "AI will not cause mass unemployment — it will shift labor demand toward supervision, maintenance, and creative roles, just like every previous technological revolution.",
    alice.id,
    "ROOT",
    { imageUrl: urls.fanucRobot, tag: "TECH" }
  );

  const aiQ1 = await q(
    "Every previous revolution also caused decades of painful transition. Are you dismissing the human cost of that transition period?",
    marcus.id,
    ai.id
  );
  await arg(
    "No, the transition cost is real. But the claim that AI causes permanent mass unemployment is historically unsupported. Policy should focus on transition support, not preventing adoption.",
    alice.id,
    "REPLY",
    { questionId: aiQ1.id, imageUrl: urls.exactlyRight }
  );

  await arg(
    "The ATM was predicted to eliminate bank tellers. Instead, cheaper branches meant more branches, and teller employment actually rose for decades after ATMs were introduced.",
    david.id,
    "SUPPORT",
    { parentId: ai.id }
  );

  const aiC1 = await arg(
    "Previous revolutions automated physical tasks. AI automates cognitive tasks — the very skills workers retrained into. This time there may be nowhere to retrain to.",
    james.id,
    "COUNTER",
    { parentId: ai.id }
  );

  await q(
    "Can you name a specific cognitive domain where AI has fully replaced human judgment, not just assisted it?",
    alice.id,
    aiC1.id
  );

  // ─── 2. Universal basic income ─────────────────
  // Posts: 1 root + 2Q + 2 replies + 1S + 1C = 7
  const ubi = await arg(
    "Universal basic income is the most efficient form of welfare because it eliminates bureaucratic overhead and lets individuals decide what they need most.",
    james.id,
    "ROOT",
    { tag: "POLITICS" }
  );

  const ubiQ1 = await q(
    "What prevents UBI from simply inflating prices, especially in housing, since landlords know everyone just got a raise?",
    priya.id,
    ubi.id
  );
  await arg(
    "Cash transfers in Alaska (PFD) and multiple pilot programs haven't shown significant inflation effects. Housing inflation is driven by supply constraints, not demand-side income.",
    james.id,
    "REPLY",
    { questionId: ubiQ1.id }
  );

  const ubiQ2 = await q(
    "How do you fund it at scale without either massive tax increases or unsustainable debt?",
    david.id,
    ubi.id
  );
  await arg(
    "You consolidate existing welfare programs (which already spend trillions) and top up with a modest VAT. The math works for a basic floor — not a comfortable income, a survival floor.",
    james.id,
    "REPLY",
    { questionId: ubiQ2.id }
  );

  await arg(
    "GiveDirectly's randomized trials in Kenya showed that unconditional cash transfers increased earnings, assets, and psychological well-being with no increase in alcohol or tobacco spending.",
    emma.id,
    "SUPPORT",
    { parentId: ubi.id, imageUrl: urls.makingItRain }
  );

  await arg(
    "UBI removes the incentive to work for a significant portion of the population. Finland's UBI trial showed no improvement in employment rates.",
    marcus.id,
    "COUNTER",
    { parentId: ubi.id, imageUrl: urls.thisIsFine }
  );

  // ─── 3. Religion in public schools ─────────────
  // Posts: 1 root + 1Q + 1 reply + 1S + 1C + 1 counter-counter = 6
  const religion = await arg(
    "Comparative religion should be a required subject in public schools because understanding different belief systems reduces prejudice and improves critical thinking.",
    omar.id,
    "ROOT",
    { tag: "RELIGION" }
  );

  const relQ1 = await q(
    "Who decides what gets taught about each religion? Isn't any curriculum inherently biased by the teacher's or textbook author's perspective?",
    priya.id,
    religion.id
  );
  await arg(
    "The same challenge applies to teaching history or literature. We solve it with academic standards, peer review, and teaching methodology — not avoidance.",
    omar.id,
    "REPLY",
    { questionId: relQ1.id }
  );

  await arg(
    "Countries with comparative religion education (like the UK) consistently score lower on religious intolerance indexes than countries that avoid the topic entirely.",
    emma.id,
    "SUPPORT",
    { parentId: religion.id }
  );

  const relC1 = await arg(
    "Parents have the right to control their children's religious education. A state-mandated curriculum on religion violates parental authority.",
    sarah.id,
    "COUNTER",
    { parentId: religion.id }
  );

  await arg(
    "Schools already teach evolution, sex education, and history that some parents disagree with. The standard isn't parental veto — it's educational value.",
    marcus.id,
    "COUNTER",
    { parentId: relC1.id, imageUrl: urls.exactlyCorrect }
  );

  // ─── 4. Universal healthcare ───────────────────
  // Posts: 1 root + 1Q + 1 reply + 2S + 1C + 1Q on support = 7
  const health = await arg(
    "Single-payer healthcare would save the US money overall because administrative costs consume 34% of US healthcare spending vs. 17% in Canada's single-payer system.",
    sarah.id,
    "ROOT",
    { imageUrl: urls.healthCost, tag: "NEWS" }
  );

  const healthQ1 = await q(
    "Administrative costs include fraud prevention, quality tracking, and billing accuracy. Would cutting them just shift costs to worse outcomes?",
    james.id,
    health.id
  );
  await arg(
    "Most of that 34% is insurance company overhead — marketing, underwriting, executive compensation, profit margins. Those aren't quality functions. Medicare's admin cost is 2%.",
    sarah.id,
    "REPLY",
    { questionId: healthQ1.id, imageUrl: urls.micDrop }
  );

  const healthS1 = await arg(
    "Taiwan switched to single-payer in 1995 and achieved universal coverage while spending only 6.6% of GDP on healthcare, compared to the US at 17.7%.",
    alice.id,
    "SUPPORT",
    { parentId: health.id }
  );

  await q(
    "Taiwan has a much younger and healthier population than the US. Isn't this an apples-to-oranges comparison?",
    david.id,
    healthS1.id
  );

  await arg(
    "Even within the US, Medicare patients report higher satisfaction than privately insured patients, and Medicare has lower per-beneficiary cost growth.",
    omar.id,
    "SUPPORT",
    { parentId: health.id }
  );

  await arg(
    "Wait times in Canada for specialist care average 27.4 weeks. Americans would not accept this tradeoff regardless of cost savings.",
    priya.id,
    "COUNTER",
    { parentId: health.id }
  );

  // ─── 5. Social media age restrictions ──────────
  // Posts: 1 root + 1Q + 1 reply + 1S + 1C + 1 reply to Q on counter = 7
  const social = await arg(
    "Social media platforms should be legally required to verify users are 16+ because adolescent brains are neurologically vulnerable to the dopamine-driven feedback loops these platforms are designed around.",
    emma.id,
    "ROOT",
    { tag: "TECH" }
  );

  const socialQ1 = await q(
    "How do you verify age without creating a surveillance infrastructure that's worse than the problem?",
    david.id,
    social.id
  );
  await arg(
    "The UK's age verification for alcohol and gambling uses third-party age estimation that doesn't store personal data. It's not perfect, but it raises the barrier enough to matter.",
    emma.id,
    "REPLY",
    { questionId: socialQ1.id }
  );

  await arg(
    "Internal Facebook research (leaked by Frances Haugen) showed Instagram makes body image issues worse for 1 in 3 teen girls. The company knew and did nothing.",
    sarah.id,
    "SUPPORT",
    { parentId: social.id, imageUrl: urls.socialMedia }
  );

  const socialC1 = await arg(
    "Age restrictions don't work. Kids will lie about their age or use VPNs. Prohibition-style approaches always fail on the internet.",
    david.id,
    "COUNTER",
    { parentId: social.id }
  );

  const socialC1Q = await q(
    "By that logic, should we also remove age restrictions on alcohol and gambling since kids can get fake IDs?",
    emma.id,
    socialC1.id
  );
  await arg(
    "Physical age restrictions work because there's a physical gatekeeper. Digital restrictions lack that. The enforcement mechanism matters more than the rule.",
    david.id,
    "REPLY",
    { questionId: socialC1Q.id, imageUrl: urls.picardFacepalm }
  );

  // ─── 6. Nuclear energy ─────────────────────────
  // Posts: 1 root + 1Q + 1 reply + 1S + 1C + 1S on counter = 6
  const nuclear = await arg(
    "Nuclear energy is the only proven technology that can provide carbon-free baseload power at the scale needed to replace fossil fuels.",
    david.id,
    "ROOT",
    { imageUrl: urls.nuclearPlant, tag: "NEWS" }
  );

  const nucQ1 = await q(
    "What about the unsolved problem of nuclear waste storage? Yucca Mountain was abandoned. Where does the waste go?",
    emma.id,
    nuclear.id
  );
  await arg(
    "All the nuclear waste ever produced in the US fits on a single football field stacked 10 yards high. Compare that to the billions of tons of CO2 fossil fuels dump into the atmosphere every year.",
    david.id,
    "REPLY",
    { questionId: nucQ1.id }
  );

  await arg(
    "France generates 70% of its electricity from nuclear and has some of the cheapest, cleanest power in Europe. It's not theoretical — it's proven at national scale.",
    alice.id,
    "SUPPORT",
    { parentId: nuclear.id }
  );

  const nucC1 = await arg(
    "New nuclear plants take 10-15 years to build and cost $20+ billion. Solar and wind are deployable now at a fraction of the cost per megawatt.",
    james.id,
    "COUNTER",
    { parentId: nuclear.id }
  );

  await arg(
    "Solar and wind require massive battery storage for baseload, which doesn't exist at scale yet. You're comparing a proven technology to a hypothetical future storage solution.",
    david.id,
    "SUPPORT",
    { parentId: nucC1.id }
  );

  // ─── 7. College degree value ───────────────────
  // Posts: 1 root + 1Q + 2 replies + 1S + 1C = 6
  const college = await arg(
    "A four-year college degree is no longer worth the cost for most students because the average graduate carries $30k in debt for a credential that many employers no longer require.",
    marcus.id,
    "ROOT",
    { tag: "EDUCATION" }
  );

  const collQ1 = await q(
    "Are you comparing median outcomes? Because the lifetime earnings premium for a bachelor's degree is still around $1.2 million over a high school diploma.",
    priya.id,
    college.id
  );
  await arg(
    "That $1.2M figure includes doctors, lawyers, and engineers who would earn well regardless. For the median liberal arts graduate, the premium is much smaller and takes decades to offset the debt.",
    marcus.id,
    "REPLY",
    { questionId: collQ1.id }
  );
  await arg(
    "Also, that statistic suffers from selection bias. People who go to college tend to come from wealthier families with better networks. The degree isn't the only variable.",
    james.id,
    "REPLY",
    { questionId: collQ1.id }
  );

  await arg(
    "Google, Apple, IBM, and Tesla have all dropped degree requirements for most positions. The market is signaling that skills matter more than credentials.",
    alice.id,
    "SUPPORT",
    { parentId: college.id }
  );

  await arg(
    "College isn't just job training — it teaches critical thinking, exposure to diverse ideas, and civic engagement. Reducing it to ROI misses the point.",
    omar.id,
    "COUNTER",
    { parentId: college.id }
  );

  // ─── 8. Cryptocurrency as currency ─────────────
  // Posts: 1 root + 1Q + 1 reply + 1S + 1C + 1Q on counter = 6
  const crypto = await arg(
    "Bitcoin will never function as a currency because its fixed supply makes it deflationary — people hoard it instead of spending it, which is the opposite of what a currency needs to do.",
    james.id,
    "ROOT",
    { imageUrl: urls.bitcoin, tag: "TECH" }
  );

  const cryptoQ1 = await q(
    "Isn't mild deflation actually good for consumers? Prices going down means your money buys more over time.",
    david.id,
    crypto.id
  );
  await arg(
    "It sounds good in theory, but deflation incentivizes delayed spending. If your money is worth more tomorrow, why buy today? That feedback loop crashes economies. Japan's lost decade is the textbook example.",
    james.id,
    "REPLY",
    { questionId: cryptoQ1.id, imageUrl: urls.mindBlown }
  );

  await arg(
    "El Salvador adopted Bitcoin as legal tender and it's been a disaster. Usage dropped to under 20% of the population, and the country lost over $60M on its Bitcoin purchases.",
    priya.id,
    "SUPPORT",
    { parentId: crypto.id }
  );

  const cryptoC1 = await arg(
    "Bitcoin doesn't need to be a daily currency to have value. It functions as digital gold — a store of value and hedge against monetary debasement.",
    alice.id,
    "COUNTER",
    { parentId: crypto.id }
  );

  await q(
    "If it's digital gold and not a currency, doesn't that concede the original argument that it won't function as a currency?",
    james.id,
    cryptoC1.id
  );

  // ─── 9. Free speech online ─────────────────────
  // Posts: 1 root + 2Q + 2 replies + 1C = 6
  const speech = await arg(
    "Private platforms moderating content is not censorship. The First Amendment protects you from government restrictions, not from a company's terms of service.",
    priya.id,
    "ROOT",
    { tag: "POLITICS" }
  );

  const speechQ1 = await q(
    "When a handful of companies control 90%+ of online discourse, isn't their moderation power functionally equivalent to government censorship?",
    omar.id,
    speech.id
  );
  await arg(
    "No, because you can always start your own platform, blog, or newsletter. Government censorship means jail. Platform moderation means using a different website.",
    priya.id,
    "REPLY",
    { questionId: speechQ1.id }
  );

  const speechQ2 = await q(
    "What about when platforms coordinate? If Twitter, Facebook, and YouTube all ban someone simultaneously, where exactly do they go?",
    david.id,
    speech.id,
    urls.facepalm
  );
  await arg(
    "Parler, Truth Social, Substack, Rumble — alternatives exist and grow when people feel censored elsewhere. The market responds. That's not censorship, it's competition.",
    priya.id,
    "REPLY",
    { questionId: speechQ2.id }
  );

  await arg(
    "The legal distinction is correct, but the spirit of free speech as a value extends beyond the First Amendment. Mill's On Liberty argued for free discourse as a social good, not just a legal right.",
    omar.id,
    "COUNTER",
    { parentId: speech.id }
  );

  // ─── 10. Mental health days ────────────────────
  // Posts: 1 root + 1Q + 1 reply + 1S + 1C = 5
  const mental = await arg(
    "Employers should be legally required to provide mental health days separate from sick leave because treating burnout after the fact costs 3x more than prevention.",
    sarah.id,
    "ROOT",
    { tag: "NEWS" }
  );

  const mentalQ1 = await q(
    "How do you prevent abuse? Physical illness is verifiable. Mental health days could just become extra vacation.",
    marcus.id,
    mental.id
  );
  await arg(
    "You don't need to verify it — the cost of a few people taking an extra day off is far less than the cost of one burnout-related disability claim, which averages $30,000.",
    sarah.id,
    "REPLY",
    { questionId: mentalQ1.id, imageUrl: urls.boom }
  );

  await arg(
    "Japan introduced mandatory stress checks and mental health leave after a wave of karoshi (death from overwork) cases. Absenteeism actually decreased because people recovered before reaching the breaking point.",
    emma.id,
    "SUPPORT",
    { parentId: mental.id }
  );

  await arg(
    "Small businesses with thin margins can't absorb additional mandated leave. This would disproportionately hurt the businesses least able to afford it.",
    james.id,
    "COUNTER",
    { parentId: mental.id }
  );

  // ─── Deeper threads on AI replacing jobs ────────

  // Second question on root
  const aiQ2 = await q(
    "What about artists and writers? Generative AI is already replacing freelance illustration and copywriting gigs right now, not in some future transition.",
    emma.id,
    ai.id,
    urls.facepalm
  );
  await arg(
    "Replacing low-end commodity work, yes. But the demand for creative direction, brand voice, and editorial judgment has actually increased because now everyone can generate mediocre content and needs humans to make it good.",
    alice.id,
    "REPLY",
    { questionId: aiQ2.id }
  );
  await arg(
    "That's cold comfort to the illustrator who lost 60% of their income this year. 'Your job will come back different eventually' doesn't pay rent.",
    emma.id,
    "REPLY",
    { questionId: aiQ2.id }
  );

  // Deeper thread on the ATM support
  const atmSupport = await prisma.argument.findFirst({
    where: { content: { startsWith: "The ATM was predicted" } },
  });
  if (atmSupport) {
    const atmQ = await q(
      "This example is from the 1970s. Is a 50-year-old analogy really the best evidence for a technology that didn't exist 5 years ago?",
      james.id,
      atmSupport.id
    );
    await arg(
      "The point isn't that ATMs and AI are the same technology. The point is that the pattern of 'automation kills jobs' predictions being wrong is consistent across every wave.",
      david.id,
      "REPLY",
      { questionId: atmQ.id }
    );
    await arg(
      "Survivorship bias. You're only citing the automations that created new jobs. You're not mentioning the switchboard operators, elevator attendants, and typists who never came back.",
      marcus.id,
      "COUNTER",
      { parentId: atmSupport.id }
    );
  }

  // More depth on the AI counter about cognitive tasks
  await arg(
    "Radiology AI can now match or exceed human radiologists in detecting certain cancers. That's a $400k/year cognitive job being automated, not a factory line.",
    james.id,
    "SUPPORT",
    { parentId: aiC1.id }
  );
  const aiC1counter = await arg(
    "Radiologists said the same thing about CT scans in the 1970s. The number of radiologists has only gone up since then because the technology increased demand for imaging.",
    alice.id,
    "COUNTER",
    { parentId: aiC1.id, imageUrl: urls.exactlyCorrect }
  );
  const aiC1cQ = await q(
    "But CT scans are a tool radiologists use. AI reads the scan itself. Isn't that a fundamentally different kind of displacement?",
    sarah.id,
    aiC1counter.id
  );
  await arg(
    "Fair distinction. But in practice, hospitals are using AI to triage and flag, not to replace the final diagnosis. The liability alone keeps a human in the loop.",
    alice.id,
    "REPLY",
    { questionId: aiC1cQ.id }
  );

  // ─── Deeper threads on Universal Healthcare ────

  // More questions and counters on root
  const healthQ2 = await q(
    "Why do you assume a US single-payer system would be as efficient as Canada's? The US government isn't exactly known for running things cheaply — look at the VA.",
    david.id,
    health.id
  );
  await arg(
    "The VA's problems are about underfunding and political neglect, not the model. Medicare, which is single-payer for seniors, runs at 2% admin cost and has higher patient satisfaction than private insurance.",
    sarah.id,
    "REPLY",
    { questionId: healthQ2.id }
  );
  await arg(
    "Also, the VA system is government-run healthcare (like the UK's NHS), which is different from single-payer (like Canada). Single-payer means government insurance, private providers.",
    omar.id,
    "REPLY",
    { questionId: healthQ2.id, imageUrl: urls.exactlyRight }
  );

  // Deep thread on the wait times counter
  const waitTimesCounter = await prisma.argument.findFirst({
    where: { content: { startsWith: "Wait times in Canada" } },
  });
  if (waitTimesCounter) {
    const wtQ = await q(
      "Americans already wait. The average ER wait is 4+ hours, and many can't see specialists at all because they can't afford it. Is no access better than slow access?",
      sarah.id,
      waitTimesCounter.id
    );
    await arg(
      "No, but the argument isn't 'keep the current system.' It's that single-payer isn't the only solution. Multi-payer systems like Germany and Switzerland have universal coverage without Canada's wait times.",
      priya.id,
      "REPLY",
      { questionId: wtQ.id }
    );
    await arg(
      "Germany and Switzerland also spend significantly more than Canada while achieving similar outcomes. You're trading one problem for another.",
      sarah.id,
      "REPLY",
      { questionId: wtQ.id }
    );

    await arg(
      "46% of Americans have delayed or skipped medical care due to cost. That's an invisible wait time that doesn't show up in any statistic.",
      emma.id,
      "COUNTER",
      { parentId: waitTimesCounter.id, imageUrl: urls.thisIsFine }
    );

    await arg(
      "Canada's wait time data is misleading — it includes elective procedures. For urgent and emergency care, Canada performs comparably to the US.",
      omar.id,
      "COUNTER",
      { parentId: waitTimesCounter.id }
    );
  }

  // Deeper thread on Taiwan support
  const taiwanQ = await prisma.question.findFirst({
    where: { content: { startsWith: "Taiwan has a much younger" } },
  });
  if (taiwanQ) {
    await arg(
      "Age-adjusted comparisons still show Taiwan spending less per capita. The US doesn't just have an older population — it has a more expensive system at every age bracket.",
      alice.id,
      "REPLY",
      { questionId: taiwanQ.id }
    );
  }

  // ─── Deeper threads on Free Speech ─────────────

  // More counters and supports on root
  await arg(
    "The First Amendment argument is legally correct but morally lazy. When three companies control how 3 billion people communicate, 'just build your own platform' is not a serious answer.",
    marcus.id,
    "SUPPORT",
    { parentId: speech.id }
  );

  const speechC1 = await prisma.argument.findFirst({
    where: { content: { startsWith: "The legal distinction is correct" } },
  });
  if (speechC1) {
    await arg(
      "Mill also argued that the only speech worth suppressing is speech that directly incites harm. Most content moderation goes far beyond that standard.",
      david.id,
      "SUPPORT",
      { parentId: speechC1.id }
    );
    const millQ = await q(
      "What counts as 'directly incites harm'? Anti-vax content doesn't directly incite harm but arguably caused thousands of preventable deaths.",
      sarah.id,
      speechC1.id
    );
    await arg(
      "That's the crux of the debate. If we expand 'harm' to include second-order effects of misinformation, then virtually all controversial speech becomes regulatable. That's a dangerous road.",
      omar.id,
      "REPLY",
      { questionId: millQ.id }
    );
    await arg(
      "We already regulate second-order harm in other contexts — you can't falsely shout fire in a theater, you can't commit fraud. The question isn't whether to draw lines but where.",
      priya.id,
      "REPLY",
      { questionId: millQ.id, imageUrl: urls.mindBlown }
    );
  }

  // More on the "Parler" reply
  const parlerReply = await prisma.argument.findFirst({
    where: { content: { startsWith: "Parler, Truth Social" } },
  });
  if (parlerReply) {
    const parlerQ = await q(
      "Parler was literally removed from AWS and both app stores simultaneously. How is 'just build your own platform' a real option when the infrastructure layer can also deplatform you?",
      david.id,
      parlerReply.id
    );
    await arg(
      "This is the strongest version of the argument. When the deplatforming extends to hosting, DNS, and payment processors, it's no longer about any single company's editorial choice.",
      priya.id,
      "REPLY",
      { questionId: parlerQ.id }
    );
    await arg(
      "And yet Parler came back, Truth Social exists, Rumble is growing. The market route is slower and harder but it works. Government-mandated speech rules would be worse.",
      james.id,
      "REPLY",
      { questionId: parlerQ.id }
    );
  }

  // ─── Deeper threads on Nuclear Energy ──────────

  // More on the cost counter
  await arg(
    "South Korea built reactors at $2,000/kW — a fraction of US costs. The US cost problem is regulatory, not inherent to nuclear technology.",
    david.id,
    "COUNTER",
    { parentId: nucC1.id }
  );
  const nucC1Q = await q(
    "If the cost problem is regulatory, and the US political system can't streamline regulation, isn't that a practical argument against nuclear regardless of the theoretical potential?",
    emma.id,
    nucC1.id
  );
  await arg(
    "By that logic we should give up on any policy that requires regulatory reform. The NRC has been reforming since the 2020s — the ADVANCE Act passed with bipartisan support.",
    david.id,
    "REPLY",
    { questionId: nucC1Q.id }
  );

  // Second question on root
  const nucQ2 = await q(
    "What about nuclear proliferation risks? More nuclear energy means more enrichment capability worldwide, which means more potential weapons programs.",
    omar.id,
    nuclear.id
  );
  await arg(
    "Modern reactor designs like SMRs use low-enriched uranium that can't be weaponized without further enrichment facilities. The proliferation argument is valid for 1960s reactor designs, not modern ones.",
    david.id,
    "REPLY",
    { questionId: nucQ2.id }
  );
  await arg(
    "Also, the countries most likely to pursue nuclear weapons already have enrichment capability. Civilian nuclear power in stable democracies doesn't meaningfully change the proliferation landscape.",
    alice.id,
    "REPLY",
    { questionId: nucQ2.id }
  );

  // ─── 11. Pineapple on pizza (12+ counters to test Show more) ─────
  const pizza = await arg(
    "Pineapple on pizza is objectively good because the sweetness balances the saltiness of the cheese and meat, creating a more complex flavor profile.",
    emma.id,
    "ROOT",
    { tag: "ENTERTAINMENT" }
  );

  await arg("Hawaiian pizza was invented in Canada, not Hawaii. It's cultural appropriation of a tropical fruit for cheese-based propaganda.", marcus.id, "COUNTER", { parentId: pizza.id });
  await arg("The moisture from pineapple makes the crust soggy. Texture matters as much as flavor.", sarah.id, "COUNTER", { parentId: pizza.id });
  await arg("Italian chefs almost universally reject fruit on pizza. The people who invented pizza say no.", james.id, "COUNTER", { parentId: pizza.id });
  await arg("If you need to add sugar to make your food taste good, the food isn't good.", priya.id, "COUNTER", { parentId: pizza.id });
  await arg("Hot fruit is an abomination. Cooked pineapple has the texture of warm gummy bears.", david.id, "COUNTER", { parentId: pizza.id });
  await arg("The caramelization of pineapple under broiler heat actually develops deep umami flavors that complement tomato sauce.", alice.id, "SUPPORT", { parentId: pizza.id });
  await arg("Gordon Ramsay said pineapple doesn't belong on pizza. Case closed.", omar.id, "COUNTER", { parentId: pizza.id });
  await arg("Gordon Ramsay also puts truffle oil on everything. Appeal to authority isn't an argument.", emma.id, "COUNTER", { parentId: pizza.id, imageUrl: urls.micDrop });
  await arg("Sweet and savory is one of the most well-established flavor pairings in every cuisine. Think mango salsa, cranberry sauce, duck à l'orange.", alice.id, "SUPPORT", { parentId: pizza.id });
  await arg("Those are all side dishes or sauces. Nobody is putting cranberry sauce AS the main topping.", marcus.id, "COUNTER", { parentId: pizza.id });
  await arg("I tried it once to be open-minded. Never again.", david.id, "COUNTER", { parentId: pizza.id, imageUrl: urls.facepalm });
  await arg("That's not an argument, that's an anecdote.", emma.id, "COUNTER", { parentId: pizza.id });
  await arg("Domino's data shows Hawaiian is consistently in the top 5 most ordered pizzas globally. Millions of people vote with their wallets.", alice.id, "SUPPORT", { parentId: pizza.id });
  await arg("Millions of people also watch reality TV. Popularity doesn't equal quality.", priya.id, "COUNTER", { parentId: pizza.id, imageUrl: urls.mindBlown });

  // ─── 12. Tabs vs spaces (12+ questions to test Show more) ─────
  const tabs = await arg(
    "Tabs are objectively superior to spaces for indentation because they separate presentation from content — each developer can set their preferred width.",
    david.id,
    "ROOT",
    { tag: "TECH" }
  );

  await q("What about alignment? Tabs can't align code to arbitrary columns.", alice.id, tabs.id);
  await q("If everyone sees different widths, won't code reviews show inconsistent formatting?", marcus.id, tabs.id);
  await q("What does the data say? Are most open source projects using tabs or spaces?", sarah.id, tabs.id);
  await q("Doesn't this argument only matter for languages where indentation is significant, like Python?", james.id, tabs.id);
  await q("Has anyone actually measured productivity differences between tabs and spaces users?", priya.id, tabs.id);
  await q("What about mixed usage? Isn't the real problem when teams don't agree on one standard?", omar.id, tabs.id);
  await q("If tabs are better, why did Google, Facebook, and Airbnb style guides all choose spaces?", emma.id, tabs.id);
  await q("How do tabs work with languages that use indentation as syntax like Haskell?", alice.id, tabs.id);
  await q("What accessibility benefits do tabs provide for visually impaired developers?", marcus.id, tabs.id);
  await q("Aren't formatters like Prettier making this entire debate irrelevant?", sarah.id, tabs.id);
  await q("If you have a team of 50 engineers, how do you enforce tab consistency?", james.id, tabs.id);
  await q("What about the Stack Overflow study that showed spaces users earn more money?", priya.id, tabs.id, urls.exactlyCorrect);

  await arg("Accessibility. Screen readers and braille displays work better with tabs because they represent a single semantic unit.", david.id, "SUPPORT", { parentId: tabs.id });
  await arg("The Go programming language mandates tabs via gofmt. It's the most opinionated modern language and it chose tabs.", alice.id, "SUPPORT", { parentId: tabs.id });
  await arg("Tabs take 1 byte vs 2-4 bytes for spaces. In large codebases this adds up to meaningful file size differences.", omar.id, "SUPPORT", { parentId: tabs.id });

  // ─── 13. Gym culture (lots of supports to test Show more) ─────
  const gym = await arg(
    "Lifting heavy weights is the single most effective intervention for long-term health, surpassing cardio, diet changes, and sleep optimization when you can only pick one.",
    marcus.id,
    "ROOT",
    { tag: "SPORTS" }
  );

  await arg("Resistance training is the only exercise that directly combats sarcopenia (age-related muscle loss), which is the #1 predictor of all-cause mortality in people over 65.", sarah.id, "SUPPORT", { parentId: gym.id });
  await arg("Muscle is the largest glucose sink in the body. More muscle = better insulin sensitivity = lower diabetes risk. No amount of cardio compensates for lost muscle.", james.id, "SUPPORT", { parentId: gym.id });
  await arg("Weight-bearing exercise increases bone density more effectively than any other intervention, including calcium supplements.", alice.id, "SUPPORT", { parentId: gym.id });
  await arg("Dr. Peter Attia has said repeatedly that grip strength is the single strongest correlate with longevity. You get grip strength from lifting, not running.", david.id, "SUPPORT", { parentId: gym.id });
  await arg("Lifting heavy triggers hormonal responses (testosterone, growth hormone, IGF-1) that cardio doesn't match. These hormones are protective against aging.", omar.id, "SUPPORT", { parentId: gym.id });
  await arg("Meta-analyses show resistance training reduces anxiety and depression symptoms as effectively as SSRIs in mild-to-moderate cases.", emma.id, "SUPPORT", { parentId: gym.id });
  await arg("Resting metabolic rate is directly proportional to lean mass. Lifting is the only way to sustainably increase daily calorie burn.", priya.id, "SUPPORT", { parentId: gym.id });
  await arg("Fall prevention. Stronger legs and better balance from squats and deadlifts prevent the hip fractures that kill more elderly people than cancer.", sarah.id, "SUPPORT", { parentId: gym.id });
  await arg("Joint health improves with properly loaded resistance training. The 'lifting destroys joints' myth has been debunked by every major orthopedic study.", marcus.id, "SUPPORT", { parentId: gym.id });
  await arg("Cognitive benefits: resistance training increases BDNF (brain-derived neurotrophic factor) which is protective against Alzheimer's.", alice.id, "SUPPORT", { parentId: gym.id });
  await arg("Even 2 sessions per week of 30 minutes produces 80% of the benefits. It's the most time-efficient exercise modality.", james.id, "SUPPORT", { parentId: gym.id });
  await arg("Sleep quality improves more from resistance training than from cardio, according to a 2022 meta-analysis in Sleep Medicine Reviews.", david.id, "SUPPORT", { parentId: gym.id });

  const gymQ1 = await q("If you can only do bodyweight exercises (no gym access), does this argument still hold?", priya.id, gym.id);
  await arg("Progressive calisthenics (pistol squats, handstand pushups, front levers) can provide sufficient resistance for most health benefits, though maximal strength gains are limited.", marcus.id, "REPLY", { questionId: gymQ1.id });

  await arg("VO2 max is a stronger predictor of all-cause mortality than muscle mass. Cardio wins on the most important metric.", emma.id, "COUNTER", { parentId: gym.id });
  await arg("Injury risk from heavy lifting is non-trivial. A herniated disc or torn rotator cuff can set you back months. Cardio has a much better safety profile.", omar.id, "COUNTER", { parentId: gym.id });

  // ─── 14. Remote school (extra root for infinite scroll) ─────
  await arg(
    "Online-only K-12 education should remain a permanent option because some students learn better without the social pressure and sensory overload of a physical classroom.",
    sarah.id,
    "ROOT",
    { tag: "EDUCATION" }
  );

  // ─── 15. Microtransactions (extra root) ─────
  await arg(
    "Cosmetic-only microtransactions are ethically acceptable because they fund continued development without affecting gameplay fairness.",
    david.id,
    "ROOT",
    { tag: "GAMING" }
  );

  // ─── 16. News paywalls (extra root) ─────
  await arg(
    "News paywalls are ultimately good for democracy because quality journalism requires funding, and ad-supported models incentivize clickbait over truth.",
    emma.id,
    "ROOT",
    { tag: "NEWS" }
  );

  // ─── Votes (make it feel lived-in) ─────────────
  const allArgs = await prisma.argument.findMany({ select: { id: true } });
  const allQs = await prisma.question.findMany({ select: { id: true } });
  const userIds = users.map((u: { id: string }) => u.id);

  // Distribute some random votes
  let voteCount = 0;
  for (const a of allArgs) {
    // Each argument gets 2-5 random votes
    const voters = userIds.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 4));
    for (const uid of voters) {
      const value = Math.random() > 0.3 ? 1 : -1; // 70% upvotes
      await prisma.argumentVote.create({
        data: { argumentId: a.id, userId: uid, value },
      });
      voteCount++;
    }
  }

  for (const question of allQs) {
    const voters = userIds.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));
    for (const uid of voters) {
      const value = Math.random() > 0.25 ? 1 : -1; // 75% upvotes for questions
      await prisma.questionVote.create({
        data: { questionId: question.id, userId: uid, value },
      });
      voteCount++;
    }
  }

  const argCount = allArgs.length;
  const qCount = allQs.length;
  console.log(
    `\nSeed complete: ${argCount} arguments + ${qCount} questions = ${argCount + qCount} posts, ${voteCount} votes, ${users.length} users.\n`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
