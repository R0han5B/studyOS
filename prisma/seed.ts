import { prisma } from '../src/lib/db';
import { seedDemoUser } from '../src/lib/demo-seed';

export async function main() {
  const user = await seedDemoUser();
  console.log(`Seeded demo user: ${user.email}`);
}

if (import.meta.main) {
  main().catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }).finally(async () => {
    await prisma.$disconnect();
  });
}
