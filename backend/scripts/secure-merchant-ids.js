const { prisma } = require("../dist/config/prisma");
const { cloudinary } = require("../dist/config/cloudinary");

const PUBLIC = /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\//;

function publicIdOf(url, resourceType) {
  const rest = url.split("/upload/")[1].replace(/^v\d+\//, "");
  return resourceType === "raw" ? rest : rest.replace(/\.[^/.]+$/, "");
}

async function secure(url) {
  const match = url && url.match(PUBLIC);
  if (!match) return null;
  const resourceType = match[1];
  const uploaded = await cloudinary.uploader.upload(url, {
    type: "authenticated",
    resource_type: resourceType,
    folder: "lifeos/merchant-id-docs",
  });
  return { url: uploaded.secure_url, oldId: publicIdOf(url, resourceType), resourceType };
}

async function main() {
  const profiles = await prisma.bizProfile.findMany({
    where: { OR: [{ idFrontUrl: { contains: "/merchant-id-docs/" } }, { idBackUrl: { contains: "/merchant-id-docs/" } }] },
    select: { id: true, idFrontUrl: true, idBackUrl: true },
  });

  let moved = 0;
  let failed = 0;

  for (const profile of profiles) {
    try {
      const front = await secure(profile.idFrontUrl);
      const back = await secure(profile.idBackUrl);
      const data = {};
      if (front) data.idFrontUrl = front.url;
      if (back) data.idBackUrl = back.url;
      if (Object.keys(data).length === 0) continue;

      await prisma.bizProfile.update({ where: { id: profile.id }, data });
      for (const old of [front, back]) {
        if (old) await cloudinary.uploader.destroy(old.oldId, { resource_type: old.resourceType, type: "upload", invalidate: true });
      }
      moved += 1;
    } catch (err) {
      failed += 1;
      console.error(`profile ${profile.id} failed:`, err && err.message ? err.message : err);
    }
  }

  console.log(`updated ${moved}, failed ${failed}`);
  await prisma.$disconnect();
}

main();