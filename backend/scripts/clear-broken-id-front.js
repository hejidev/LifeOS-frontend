require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ids = [
  "88fe7ae2-5012-42a6-b778-edb2e588606c",
  "17f10204-61eb-4651-b12d-31161a317fc9",
];

async function main() {
  const result = await prisma.bizProfile.updateMany({
    where: {
      id: { in: ids },
      idFrontUrl: {
        in: [
          "https://res.cloudinary.com/tdtd6eqg/image/upload/v1786420659/lifeos/merchant-id-docs/alvzkmbepfejy7yvwnpn.png",
          "https://res.cloudinary.com/tdtd6eqg/image/upload/v1786395863/lifeos/merchant-id-docs/dlvovzzvj1divgz9ifvs.pdf",
        ],
      },
    },
    data: {
      idFrontUrl: null,
    },
  });

  console.log(`Cleared ${result.count} broken front ID references.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });