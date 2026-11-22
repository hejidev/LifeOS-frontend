const { prisma } = require("../dist/config/prisma");
const { cloudinary } = require("../dist/config/cloudinary");

const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const value = (name) => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const apply = has("yes");
const sweep = has("delete-orphans");
const cloud = cloudinary.config().cloud_name;
const PUBLIC_PATH = new RegExp(`^/${cloud}/(image|raw|video)/upload/`);

function parsePublic(url, folder) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(PUBLIC_PATH);
    if (parsed.hostname !== "res.cloudinary.com" || !match || !parsed.pathname.includes(`/${folder}/`)) return null;
    const resourceType = match[1];
    const rest = decodeURIComponent(parsed.pathname.slice(match[0].length)).replace(/^v\d+\//, "");
    return { resourceType, publicId: resourceType === "raw" ? rest : rest.replace(/\.[^/.]+$/, "") };
  } catch {
    return null;
  }
}

const TARGETS = [
  {
    name: "documents",
    folder: "lifeos/documents",
    fields: ["fileUrl"],
    find: () => prisma.document.findMany({ where: { fileUrl: { contains: "/lifeos/documents/" } }, select: { id: true, fileUrl: true } }),
    save: (id, data) => prisma.document.update({ where: { id }, data }),
  },
  {
    name: "merchant ID documents",
    folder: "lifeos/merchant-id-docs",
    fields: ["idFrontUrl", "idBackUrl"],
    find: () =>
      prisma.bizProfile.findMany({
        where: { OR: [{ idFrontUrl: { contains: "/lifeos/merchant-id-docs/" } }, { idBackUrl: { contains: "/lifeos/merchant-id-docs/" } }] },
        select: { id: true, idFrontUrl: true, idBackUrl: true },
      }),
    save: (id, data) => prisma.bizProfile.update({ where: { id }, data }),
  },
  {
    name: "study materials",
    folder: "lifeos/study-materials",
    fields: ["url"],
    find: () => prisma.studyMaterial.findMany({ where: { url: { contains: "/lifeos/study-materials/" } }, select: { id: true, url: true } }),
    save: (id, data) => prisma.studyMaterial.update({ where: { id }, data }),
  },
  { name: "converter uploads (never referenced)", folder: "lifeos/converter-uploads", fields: [], find: async () => [], save: async () => undefined },
];

async function listPublic(folder) {
  const found = [];
  for (const resourceType of ["image", "raw", "video"]) {
    let cursor;
    do {
      const page = await cloudinary.api.resources({ type: "upload", resource_type: resourceType, prefix: `${folder}/`, max_results: 500, next_cursor: cursor });
      page.resources.forEach((item) => found.push({ publicId: item.public_id, resourceType, bytes: item.bytes }));
      cursor = page.next_cursor;
    } while (cursor);
  }
  return found;
}

async function referencedIds(target) {
  const ids = new Set();
  for (const row of await target.find()) {
    for (const field of target.fields) {
      const parsed = parsePublic(row[field], target.folder);
      if (parsed) ids.add(`${parsed.resourceType}:${parsed.publicId}`);
    }
  }
  return ids;
}

async function move(url, folder, parsed) {
  const uploaded = await cloudinary.uploader.upload(url, { type: "authenticated", resource_type: parsed.resourceType, folder });
  return uploaded.secure_url;
}

async function main() {
  const dbHost = new URL(process.env.DATABASE_URL).host;
  const expected = value("host");

  console.log(`database : ${dbHost}`);
  console.log(`cloud    : ${cloud}`);
  console.log(`mode     : ${apply ? "WRITE" : "DRY RUN (nothing is changed)"}${sweep ? " + delete orphans" : ""}`);

  if (!expected || !dbHost.includes(expected)) {
    console.error("\nStopped. Pass --host=<part of your PRODUCTION database host> and make sure it matches the database line above.");
    process.exit(1);
  }

  let failures = 0;

  for (const target of TARGETS) {
    console.log(`\n== ${target.name}`);
    const rows = await target.find();
    let pending = 0;
    let moved = 0;

    for (const row of rows) {
      const work = target.fields.map((field) => ({ field, parsed: parsePublic(row[field], target.folder), url: row[field] })).filter((item) => item.parsed);
      if (work.length === 0) continue;
      pending += work.length;
      if (!apply) continue;

      try {
        const data = {};
        for (const item of work) data[item.field] = await move(item.url, target.folder, item.parsed);
        await target.save(row.id, data);
        for (const item of work) {
          await cloudinary.uploader.destroy(item.parsed.publicId, { resource_type: item.parsed.resourceType, type: "upload", invalidate: true });
        }
        moved += work.length;
      } catch (err) {
        failures += 1;
        console.error(`  row ${row.id} failed: ${err && err.message ? err.message : JSON.stringify(err)}`);
      }
    }

    console.log(apply ? `  moved to private: ${moved} of ${pending}` : `  public files that would be moved: ${pending}`);

    const referenced = await referencedIds(target);
    const orphans = (await listPublic(target.folder)).filter((item) => !referenced.has(`${item.resourceType}:${item.publicId}`));
    const orphanBytes = orphans.reduce((sum, item) => sum + (item.bytes || 0), 0);
    console.log(`  public files not used by any record (orphans): ${orphans.length} (${(orphanBytes / 1_048_576).toFixed(1)} MB)`);

    if (apply && sweep && orphans.length > 0) {
      for (const resourceType of ["image", "raw", "video"]) {
        const ids = orphans.filter((item) => item.resourceType === resourceType).map((item) => item.publicId);
        for (let index = 0; index < ids.length; index += 100) {
          await cloudinary.api.delete_resources(ids.slice(index, index + 100), { resource_type: resourceType, type: "upload", invalidate: true });
        }
      }
      console.log(`  orphans deleted: ${orphans.length}`);
    }
  }

  console.log(failures > 0 ? `\nFinished with ${failures} failed rows. Send me the messages above.` : "\nFinished with no failures.");
  process.exitCode = failures > 0 ? 1 : 0;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());