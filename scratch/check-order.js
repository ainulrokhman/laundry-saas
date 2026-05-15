
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { id: '32e1a114-f3d4-47d0-9c9e-1090552423ce' },
    select: {
      trackingCode: true,
      totalAmount: true,
      dpAmount: true,
      cashReceived: true,
      paymentStatus: true
    }
  });
  console.log(JSON.stringify(order, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
