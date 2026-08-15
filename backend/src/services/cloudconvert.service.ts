import { env } from "../config/env";

const API = "https://api.cloudconvert.com/v2";

async function cc(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${env.CLOUDCONVERT_API_KEY}`, "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) throw new Error(`CloudConvert error: ${res.status}`);
  return res.json();
}

export async function convertFile(fileUrl: string, fileName: string, targetFormat: string) {
  const job = await cc("/jobs", {
    method: "POST",
    body: JSON.stringify({
      tasks: {
        "import-file": { operation: "import/url", url: fileUrl, filename: fileName },
        "convert-file": { operation: "convert", input: "import-file", output_format: targetFormat },
        "export-file": { operation: "export/url", input: "convert-file" },
      },
    }),
  }) as { data: { id: string; status: string; tasks: any[] } };

  const jobId = job.data.id;
  const deadline = Date.now() + 45000;

  while (Date.now() < deadline) {
    const status = await cc(`/jobs/${jobId}`) as { data: { status: string; tasks: any[] } };
    if (status.data.status === "finished") {
      const exportTask = status.data.tasks.find((t: any) => t.operation === "export/url");
      return { url: exportTask.result.files[0].url, filename: exportTask.result.files[0].filename };
    }
    if (status.data.status === "error") throw new Error("Conversion failed");
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Conversion timed out — try a smaller file");
}
