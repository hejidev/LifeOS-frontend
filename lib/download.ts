function trigger(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  
  export function saveTextAs(text: string, filename: string, type = "text/plain") {
    trigger(filename, new Blob([text], { type: `${type};charset=utf-8` }));
  }
  
  export async function saveUrlAs(url: string, baseName: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("download failed");
      const blob = await response.blob();
      const subtype = blob.type.split("/")[1]?.split("+")[0] ?? "png";
      trigger(`${baseName}.${subtype === "jpeg" ? "jpg" : subtype}`, blob);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }