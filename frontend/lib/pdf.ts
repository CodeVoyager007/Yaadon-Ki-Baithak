/**
 * Turns the laid-out paper pages into a real PDF file in the browser and downloads it, with no
 * print window. Each page is drawn as a picture, so the Nastaliq keeps its shaping (PDF text
 * fonts can't join Urdu letters). The libraries load only when someone asks for a PDF.
 */
const A4 = { w: 210, h: 297 };

export function pdfName(...parts: (string | undefined)[]) {
  const name = parts
    .filter(Boolean)
    .join(" - ")
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${name || "Family book"}.pdf`;
}

export async function downloadPdf(pages: HTMLElement[], filename: string, onProgress?: (done: number, total: number) => void) {
  const [{ toJpeg, getFontEmbedCSS }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  if (!pages.length) throw new Error("nothing to print");
  // Embedding the web fonts is the slow part; do it once and reuse it for every page.
  const fontEmbedCSS = await getFontEmbedCSS(pages[0]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  for (const [i, page] of pages.entries()) {
    onProgress?.(i, pages.length);
    const jpeg = await toJpeg(page, { quality: 0.88, pixelRatio: 2, backgroundColor: "#fbf3e4", fontEmbedCSS, cacheBust: false });
    const { width, height } = page.getBoundingClientRect();
    // Fit the page's width, top aligned; a page taller than A4 shrinks to fit, centred.
    let w = A4.w;
    let h = (A4.w * height) / width;
    if (h > A4.h) {
      w = (A4.h * width) / height;
      h = A4.h;
    }
    if (i > 0) pdf.addPage();
    pdf.setFillColor("#fbf3e4");
    pdf.rect(0, 0, A4.w, A4.h, "F");
    pdf.addImage(jpeg, "JPEG", (A4.w - w) / 2, 0, w, h, undefined, "FAST");
  }
  onProgress?.(pages.length, pages.length);
  pdf.save(filename);
}
