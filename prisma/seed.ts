import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const email = "demo@podium.local";
  const password = "demopass123";

  await prisma.user.deleteMany({ where: { email } });

  const isPlatformAdmin =
    !!process.env.PLATFORM_ADMIN_EMAIL &&
    email === process.env.PLATFORM_ADMIN_EMAIL.trim().toLowerCase();

  const user = await prisma.user.create({
    data: { email, name: "Demo", passwordHash: hashPassword(password), isPlatformAdmin: isPlatformAdmin || true },
  });

  const board = await prisma.board.create({
    data: {
      ownerId: user.id,
      slug: "chuckybtz",
      title: "ChuckyBTZ Leaderboard",
      subtitle: "Stake.com / Stake.us",
      description:
        'Use the code "BTZ" when signing up on stake.com or stake.us and place your first bet. ' +
        "Every $ you wager automatically contributes to our monthly leaderboard!",
      rules:
        "Games with RTP of 98% or lower -> 100% of wagered amount counts\n" +
        "Games with RTP above 98% -> 50% of wagered amount counts\n" +
        "Games with RTP of 99% or higher -> 10% of wagered amount counts\n" +
        "Suspended and/or self-excluded accounts are not eligible for prizes.",
      promoCode: "BTZ",
      ctaText: "Sign up on Stake",
      ctaUrl: "https://stake.com",
      accentColor: "#f5b301",
      prizePool: "$3,500 Monthly",
      currency: "$",
      maskNames: true,
      socials: JSON.stringify({
        kick: "https://kick.com",
        youtube: "https://youtube.com",
        twitch: "https://twitch.tv",
        discord: "https://discord.gg",
        telegram: "https://telegram.org",
      }),
      entries: {
        create: [
          { username: "moonshines", score: 140207.74, prize: "$1350" },
          { username: "queenchess", score: 78730.72, prize: "$750" },
          { username: "monkeykey", score: 67357.35, prize: "$500" },
          { username: "sara90", score: 47364.03, prize: "$300" },
          { username: "bighom", score: 39286.05, prize: "$200" },
          { username: "max14x", score: 30224.98, prize: "$100" },
          { username: "coolguy", score: 24599.37, prize: "$50" },
          { username: "kingNG0", score: 18654.3, prize: "$50" },
          { username: "vkci", score: 17577.46, prize: "$30" },
          { username: "rex44", score: 13195.79, prize: "$30" },
          { username: "user039", score: 10778.45, prize: "$20" },
          { username: "greg01", score: 10670.28, prize: "$20" },
        ],
      },
    },
  });

  console.log("Seeded demo account + board.");
  console.log(`  Login:  ${email} / ${password}`);
  console.log(`  Board:  /${board.slug}`);
  console.log(`  Editor: /edit/${board.editorToken}`);
  console.log(`  ApiKey: ${board.apiKey}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
