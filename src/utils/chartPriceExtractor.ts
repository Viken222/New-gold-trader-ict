/**
 * Utility to extract and cross-verify price levels from uploaded charts
 * (SVG text elements, annotations, and numeric price coordinates)
 */

export interface ExtractedChartPrices {
  currentPrice?: number;
  dealingRangeHigh?: number;
  dealingRangeLow?: number;
  dailyOpen?: number;
  pdh?: number;
  pdl?: number;
  fvgTop?: number;
  fvgBottom?: number;
  fvgCe?: number;
  sweepPrice?: number;
  allDetectedPrices: number[];
}

export function extractPricesFromSvgString(svgText: string): ExtractedChartPrices {
  const result: ExtractedChartPrices = {
    allDetectedPrices: [],
  };

  // Find all gold price patterns like 2650.50, 4284.50, 4310.00
  const priceRegex = /\b([1-9][0-9]{3,4}\.[0-9]{1,2})\b/g;
  const matches = svgText.match(priceRegex);
  if (matches) {
    const unique = Array.from(new Set(matches.map((m) => parseFloat(m)))).sort((a, b) => b - a);
    result.allDetectedPrices = unique;
  }

  // Look for specific labeled levels
  const pdhMatch = svgText.match(/PDH[^\d]*(\d{4,5}\.\d{2})/i);
  if (pdhMatch) result.pdh = parseFloat(pdhMatch[1]);

  const pdlMatch = svgText.match(/PDL[^\d]*(\d{4,5}\.\d{2})/i);
  if (pdlMatch) result.pdl = parseFloat(pdlMatch[1]);

  const doMatch = svgText.match(/Daily Open[^\d]*(\d{4,5}\.\d{2})/i) || svgText.match(/PO5[^\d]*(\d{4,5}\.\d{2})/i);
  if (doMatch) result.dailyOpen = parseFloat(doMatch[1]);

  const ceMatch = svgText.match(/CE:\s*(\d{4,5}\.\d{2})/i) || svgText.match(/Consequent Encroachment[^\d]*(\d{4,5}\.\d{2})/i);
  if (ceMatch) result.fvgCe = parseFloat(ceMatch[1]);

  const rangeHighMatch = svgText.match(/Range High[^\d]*(\d{4,5}\.\d{2})/i) || svgText.match(/100%[^\d]*(\d{4,5}\.\d{2})/i);
  if (rangeHighMatch) result.dealingRangeHigh = parseFloat(rangeHighMatch[1]);

  const rangeLowMatch = svgText.match(/Range Low[^\d]*(\d{4,5}\.\d{2})/i) || svgText.match(/0%[^\d]*(\d{4,5}\.\d{2})/i);
  if (rangeLowMatch) result.dealingRangeLow = parseFloat(rangeLowMatch[1]);

  const sweepMatch = svgText.match(/Sweep[^\d]*(\d{4,5}\.\d{2})/i) || svgText.match(/SSL[^\d]*(\d{4,5}\.\d{2})/i) || svgText.match(/BSL[^\d]*(\d{4,5}\.\d{2})/i);
  if (sweepMatch) result.sweepPrice = parseFloat(sweepMatch[1]);

  // Current price detection
  const currPriceMatch = svgText.match(/fill="#3b82f6"[^>]*>[\s\S]*?<text[^>]*>(\d{4,5}\.\d{2})<\/text>/i) ||
                         svgText.match(/Current Price[^\d]*(\d{4,5}\.\d{2})/i);
  if (currPriceMatch) {
    result.currentPrice = parseFloat(currPriceMatch[1]);
  } else if (result.allDetectedPrices.length > 0) {
    // Median or middle detected price
    const midIdx = Math.floor(result.allDetectedPrices.length / 2);
    result.currentPrice = result.allDetectedPrices[midIdx];
  }

  // If dealing range high/low not explicitly tagged, derive from price extremes
  if (!result.dealingRangeHigh && result.allDetectedPrices.length >= 2) {
    result.dealingRangeHigh = result.allDetectedPrices[0];
  }
  if (!result.dealingRangeLow && result.allDetectedPrices.length >= 2) {
    result.dealingRangeLow = result.allDetectedPrices[result.allDetectedPrices.length - 1];
  }

  return result;
}

export function extractPricesFromDataUrl(dataUrl: string): ExtractedChartPrices {
  if (dataUrl.startsWith('data:image/svg+xml;base64,')) {
    try {
      const base64 = dataUrl.replace('data:image/svg+xml;base64,', '');
      const decoded = typeof atob !== 'undefined'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('utf-8');
      return extractPricesFromSvgString(decoded);
    } catch {
      return { allDetectedPrices: [] };
    }
  }

  if (dataUrl.startsWith('data:image/svg+xml;utf8,') || dataUrl.startsWith('data:image/svg+xml,')) {
    try {
      const raw = decodeURIComponent(dataUrl.split(',')[1]);
      return extractPricesFromSvgString(raw);
    } catch {
      return { allDetectedPrices: [] };
    }
  }

  return { allDetectedPrices: [] };
}
