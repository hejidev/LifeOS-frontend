import { env } from "../config/env";
import { AppError } from "../lib/errors";

const API = "https://api.cloudconvert.com/v2";
const POLL_LIMIT_MS = 45_000;

interface Task {
  name: string;
  operation: string;
  status: string;
  message?: string | null;
  result?: { form?: { url: string; parameters: Record<string, string> }; files?: { url: string; filename: string }[] };
}

interface Job {
  data: { id: string; status: string; tasks: Task[] };
}

async function cc<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!env.CLOUDCONVERT_API_KEY) throw new AppError("File conversion isn't available right now.", 503);

  const res = await fetch(`${API}${path}`, {
    ...init,
    signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${env.CLOUDCONVERT_API_KEY}`, "Content-Type": "application/json", ...init.headers },
  });

  if (!res.ok) {
    console.error("[cloudconvert]", res.status, (await res.text().catch(() => "")).slice(0, 300));
    if (res.status === 402 || res.status === 429) throw new AppError("File conversion is busy or unavailable right now. Try again later.", 503);
    if (res.status === 422) throw new AppError("That file can't be converted to the chosen format.", 422);
    throw new AppError("File conversion failed. Please try again.", 502);
  }

  return (await res.json()) as T;
}

const discard = (id: string) => cc(`/jobs/${id}`, { method: "DELETE" }).catch(() => undefined);

export async function convertBuffer(buffer: Buffer, fileName: string, targetFormat: string) {
  const job = await cc<Job>("/jobs", {
    method: "POST",
    body: JSON.stringify({
      tag: "lifeos",
      tasks: {
        "import-file": { operation: "import/upload" },
        "convert-file": { operation: "convert", input: "import-file", output_format: targetFormat },
        "export-file": { operation: "export/url", input: "convert-file" },
      },
    }),
  });

  const jobId = job.data.id;
  const target = job.data.tasks.find((task) => task.name === "import-file")?.result?.form;
  if (!target) {
    void discard(jobId);
    throw new AppError("File conversion failed. Please try again.", 502);
  }

  const form = new FormData();
  Object.entries(target.parameters).forEach(([key, value]) => form.append(key, value));
  form.append("file", new Blob([new Uint8Array(buffer)]), fileName.replace(/[^\w.\- ]+/g, "_").slice(0, 100) || "file");

  const upload = await fetch(target.url, { method: "POST", body: form, signal: AbortSignal.timeout(60_000) }).catch(() => null);
  if (!upload?.ok) {
    void discard(jobId);
    throw new AppError("The file couldn't be uploaded for conversion. Please try again.", 502);
  }

  const deadline = Date.now() + POLL_LIMIT_MS;
  let wait = 1000;

  while (Date.now() < deadline) {
    const current = await cc<Job>(`/jobs/${jobId}`);

    if (current.data.status === "finished") {
      const file = current.data.tasks.find((task) => task.operation === "export/url")?.result?.files?.[0];
      if (!file) throw new AppError("File conversion failed. Please try again.", 502);
      return { url: file.url, filename: file.filename };
    }

    if (current.data.status === "error") {
      const failed = current.data.tasks.find((task) => task.status === "error");
      console.error("[cloudconvert] job failed:", failed?.message);
      throw new AppError("That file can't be converted to the chosen format.", 422);
    }

    await new Promise((resolve) => setTimeout(resolve, wait));
    wait = Math.min(wait * 1.3, 3000);
  }

  void discard(jobId);
  throw new AppError("The conversion is taking too long. Try a smaller file.", 504);
}