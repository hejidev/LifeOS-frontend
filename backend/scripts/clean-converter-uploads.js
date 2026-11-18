const { cloudinary } = require("../dist/config/cloudinary");

async function main() {
  let total = 0;
  let partial = true;

  while (partial) {
    const result = await cloudinary.api.delete_resources_by_prefix("lifeos/converter-uploads/", { resource_type: "raw", invalidate: true });
    total += Object.keys(result.deleted ?? {}).length;
    partial = !!result.partial;
  }

  console.log(`deleted ${total} files`);
}

main();