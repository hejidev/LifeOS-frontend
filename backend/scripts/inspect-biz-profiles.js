require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ids = [
  "88fe7ae2-5012-42a6-b778-edb2e588606c",
  "17f10204-61eb-4651-b12d-31161a317fc9",
];

async function main() {
  const profiles = await prisma.bizProfile.findMany({
    where: {
      id: { in: ids },
    },
    select: {
      id: true,
      userId: true,
      idFrontUrl: true,
      idBackUrl: true,
    },
  });

  console.log(JSON.stringify(profiles, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });