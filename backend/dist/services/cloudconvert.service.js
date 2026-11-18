"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertBuffer = convertBuffer;
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
const API = "https://api.cloudconvert.com/v2";
const POLL_LIMIT_MS = 45000;
async function cc(path, init = {}) {
    if (!env_1.env.CLOUDCONVERT_API_KEY)
        throw new errors_1.AppError("File conversion isn't available right now.", 503);
    const res = await fetch(`${API}${path}`, {
        ...init,
        signal: AbortSignal.timeout(20000),
        headers: { Authorization: `Bearer ${env_1.env.CLOUDCONVERT_API_KEY}`, "Content-Type": "application/json", ...init.headers },
    });
    if (!res.ok) {
        console.error("[cloudconvert]", res.status, (await res.text().catch(() => "")).slice(0, 300));
        if (res.status === 402 || res.status === 429)
            throw new errors_1.AppError("File conversion is busy or unavailable right now. Try again later.", 503);
        if (res.status === 422)
            throw new errors_1.AppError("That file can't be converted to the chosen format.", 422);
        throw new errors_1.AppError("File conversion failed. Please try again.", 502);
    }
    return (await res.json());
}
const discard = (id) => cc(`/jobs/${id}`, { method: "DELETE" }).catch(() => undefined);
async function convertBuffer(buffer, fileName, targetFormat) {
    const job = await cc("/jobs", {
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
        throw new errors_1.AppError("File conversion failed. Please try again.", 502);
    }
    const form = new FormData();
    Object.entries(target.parameters).forEach(([key, value]) => form.append(key, value));
    form.append("file", new Blob([new Uint8Array(buffer)]), fileName.replace(/[^\w.\- ]+/g, "_").slice(0, 100) || "file");
    const upload = await fetch(target.url, { method: "POST", body: form, signal: AbortSignal.timeout(60000) }).catch(() => null);
    if (!upload?.ok) {
        void discard(jobId);
        throw new errors_1.AppError("The file couldn't be uploaded for conversion. Please try again.", 502);
    }
    const deadline = Date.now() + POLL_LIMIT_MS;
    let wait = 1000;
    while (Date.now() < deadline) {
        const current = await cc(`/jobs/${jobId}`);
        if (current.data.status === "finished") {
            const file = current.data.tasks.find((task) => task.operation === "export/url")?.result?.files?.[0];
            if (!file)
                throw new errors_1.AppError("File conversion failed. Please try again.", 502);
            return { url: file.url, filename: file.filename };
        }
        if (current.data.status === "error") {
            const failed = current.data.tasks.find((task) => task.status === "error");
            console.error("[cloudconvert] job failed:", failed?.message);
            throw new errors_1.AppError("That file can't be converted to the chosen format.", 422);
        }
        await new Promise((resolve) => setTimeout(resolve, wait));
        wait = Math.min(wait * 1.3, 3000);
    }
    void discard(jobId);
    throw new errors_1.AppError("The conversion is taking too long. Try a smaller file.", 504);
}
