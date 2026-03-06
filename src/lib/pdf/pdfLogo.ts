/**
 * LensOnWealth Logo for PDF Reports
 *
 * Fetches the logo and adds it to the top-right corner of PDF documents.
 * Used across all download/export PDFs.
 */

import type { jsPDF } from 'jspdf';

const LOGO_WIDTH_MM = 22;
const LOGO_HEIGHT_MM = 22;

/** Cache logo base64 to avoid refetching on multi-page PDFs */
let logoBase64Cache: string | null = null;

/**
 * Fetch LensOnWealth logo as base64 data URL.
 * Tries app origin first, then fallback to lensonwealth.com.
 */
export async function getLogoBase64(): Promise<string | null> {
  if (logoBase64Cache) return logoBase64Cache;

  const urls = [
    typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '',
    'https://lensonwealth.com/logo.png',
  ].filter(Boolean);

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      logoBase64Cache = dataUrl;
      return dataUrl;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Add LensOnWealth logo to the top-right corner of a PDF page.
 * Call this after creating the doc, typically right after the header section.
 *
 * @param doc - jsPDF document instance
 * @param pageWidth - Page width in mm
 * @param margin - Page margin in mm (default 15)
 */
export async function addLogoToPDF(
  doc: jsPDF,
  pageWidth: number,
  margin: number = 15
): Promise<void> {
  const logoData = await getLogoBase64();
  if (!logoData) return;

  const logoX = pageWidth - margin - LOGO_WIDTH_MM;
  const logoY = margin;

  try {
    doc.addImage(logoData, 'PNG', logoX, logoY, LOGO_WIDTH_MM, LOGO_HEIGHT_MM);
  } catch {
    // Ignore if addImage fails (e.g. unsupported format)
  }
}

/** Alias for addLogoToPDF - accepts (doc, pageWidth, pageHeight?, margin) for compatibility */
export async function addLensOnWealthLogo(
  doc: jsPDF,
  pageWidth: number,
  _pageHeight?: number,
  margin: number = 15
): Promise<void> {
  return addLogoToPDF(doc, pageWidth, margin);
}
