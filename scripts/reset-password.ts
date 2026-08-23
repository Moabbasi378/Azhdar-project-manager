import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: npm run user:reset-password -- <email> <new-password>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("رمز عبور باید حداقل ۸ کاراکتر باشد");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL missing");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

async function main() {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`کاربری با ایمیل «${email}» پیدا نشد`);
    process.exit(1);
  }
  if (!user.passwordHash) {
    console.error("این کاربر رمز عبور ندارد (احتمالاً با OAuth ساخته شده)");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  console.log(`✔ رمز عبور «${user.firstName} ${user.lastName}» <${user.email}> تغییر کرد`);
}
