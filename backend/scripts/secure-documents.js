const { prisma } = require("../dist/config/prisma");
const { cloudinary } = require("../dist/config/cloudinary");

const PUBLIC = /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\//;

function publicIdOf(url, resourceType) {
  const rest = url.split("/upload/")[1].replace(/^v\d+\//, "");
  return resourceType === "raw" ? rest : rest.replace(/\.[^/.]+$/, "");
}

async function main() {
  const docs = await prisma.document.findMany({
    where: { fileUrl: { contains: "/lifeos/documents/" } },
    select: { id: true, fileUrl: true },
  });

  let moved = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    const match = doc.fileUrl.match(PUBLIC);
    if (!match) {
      skipped += 1;
      continue;
    }
    const resourceType = match[1];
    try {
      const uploaded = await cloudinary.uploader.upload(doc.fileUrl, {
        type: "authenticated",
        resource_type: resourceType,
        folder: "lifeos/documents",
      });
      await prisma.document.update({ where: { id: doc.id }, data: { fileUrl: uploaded.secure_url } });
      await cloudinary.uploader.destroy(publicIdOf(doc.fileUrl, resourceType), {
        resource_type: resourceType,
        type: "upload",
        invalidate: true,
      });
      moved += 1;
    } catch (err) {
      failed += 1;
      console.error(`document ${doc.id} failed:`, err && err.message ? err.message : err);
    }
  }

  console.log(`moved ${moved}, skipped ${skipped}, failed ${failed}`);
  await prisma.$disconnect();
}

main();