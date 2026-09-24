/**
 * Utility to generate realistic institutional candlestick chart images (SVG -> Base64 data URL)
 * for ICT 2024 Mentorship XAUUSD presets.
 */

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartAnnotation {
  type: 'fvg' | 'sweep' | 'mss' | 'level' | 'text' | 'box';
  y1?: number;
  y2?: number;
  x1?: number;
  x2?: number;
  label: string;
  color?: string;
  subtext?: string;
}

export function generateChartSvgDataUrl(
  title: string,
  timeframe: string,
  candles: Candle[],
  annotations: ChartAnnotation[] = [],
  currentPrice?: number
): string {
  const width = 800;
  const height = 480;
  const padding = { top: 60, right: 90, bottom: 40, left: 30 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Min and max prices
  let minPrice = Math.min(...candles.map((c) => c.low));
  let maxPrice = Math.max(...candles.map((c) => c.high));

  // Add margin to price
  const priceRange = maxPrice - minPrice || 10;
  minPrice -= priceRange * 0.08;
  maxPrice += priceRange * 0.08;

  const priceToY = (p: number) => {
    return padding.top + plotHeight - ((p - minPrice) / (maxPrice - minPrice)) * plotHeight;
  };

  const candleWidth = Math.max(4, Math.min(22, (plotWidth / candles.length) * 0.65));
  const candleGap = plotWidth / candles.length;

  let candlesSvg = '';
  candles.forEach((c, i) => {
    const x = padding.left + i * candleGap + candleGap / 2;
    const yOpen = priceToY(c.open);
    const yClose = priceToY(c.close);
    const yHigh = priceToY(c.high);
    const yLow = priceToY(c.low);
    const isBull = c.close >= c.open;
    const bodyColor = isBull ? '#10b981' : '#f43f5e';
    const wickColor = isBull ? '#059669' : '#e11d48';

    const bodyY = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));

    // Wick
    candlesSvg += `<line x1="${x}" y1="${yHigh}" x2="${x}" y2="${yLow}" stroke="${wickColor}" stroke-width="1.5" />`;
    // Body
    candlesSvg += `<rect x="${x - candleWidth / 2}" y="${bodyY}" width="${candleWidth}" height="${bodyHeight}" fill="${bodyColor}" stroke="${wickColor}" stroke-width="0.8" rx="1" />`;

    // Time label on x-axis periodically
    if (i % Math.ceil(candles.length / 7) === 0 || i === candles.length - 1) {
      candlesSvg += `<text x="${x}" y="${height - 15}" fill="#64748b" font-size="10" font-family="monospace" text-anchor="middle">${c.time}</text>`;
      candlesSvg += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="#1e293b" stroke-dasharray="2 3" stroke-width="0.7" />`;
    }
  });

  // Price scale grid
  let gridSvg = '';
  const priceSteps = 6;
  for (let i = 0; i <= priceSteps; i++) {
    const p = minPrice + (i / priceSteps) * (maxPrice - minPrice);
    const y = priceToY(p);
    gridSvg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" stroke="#1e293b" stroke-dasharray="3 3" stroke-width="0.8" />`;
    gridSvg += `<text x="${width - padding.right + 8}" y="${y + 3}" fill="#94a3b8" font-size="11" font-family="monospace">${p.toFixed(2)}</text>`;
  }

  // Annotations
  let annotSvg = '';
  annotations.forEach((a) => {
    if (a.type === 'level' && a.y1 !== undefined) {
      const y = priceToY(a.y1);
      const color = a.color || '#f59e0b';
      annotSvg += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 2" />
        <rect x="${width - padding.right + 2}" y="${y - 9}" width="82" height="18" fill="${color}" fill-opacity="0.2" rx="3" stroke="${color}" stroke-width="0.8"/>
        <text x="${width - padding.right + 6}" y="${y + 3}" fill="${color}" font-size="9.5" font-family="monospace" font-weight="bold">${a.label}: ${a.y1.toFixed(2)}</text>
      `;
    } else if (a.type === 'fvg' && a.y1 !== undefined && a.y2 !== undefined) {
      const topY = Math.min(priceToY(a.y1), priceToY(a.y2));
      const btmY = Math.max(priceToY(a.y1), priceToY(a.y2));
      const midY = (topY + btmY) / 2;
      const fvgColor = a.color || '#06b6d4';
      const xStart = a.x1 !== undefined ? padding.left + a.x1 * candleGap : padding.left + plotWidth * 0.45;
      const xEnd = width - padding.right;

      annotSvg += `
        <rect x="${xStart}" y="${topY}" width="${xEnd - xStart}" height="${btmY - topY}" fill="${fvgColor}" fill-opacity="0.16" stroke="${fvgColor}" stroke-width="1" stroke-dasharray="3 3" />
        <line x1="${xStart}" y1="${midY}" x2="${xEnd}" stroke="${fvgColor}" stroke-width="1" stroke-dasharray="2 2" />
        <rect x="${xStart + 6}" y="${topY + 3}" width="140" height="18" fill="#0f172a" fill-opacity="0.85" rx="3" stroke="${fvgColor}" stroke-width="0.8" />
        <text x="${xStart + 10}" y="${topY + 15}" fill="${fvgColor}" font-size="9.5" font-family="monospace" font-weight="bold">${a.label} [CE: ${((a.y1 + a.y2) / 2).toFixed(2)}]</text>
      `;
    } else if (a.type === 'sweep' && a.x1 !== undefined && a.y1 !== undefined) {
      const x = padding.left + a.x1 * candleGap + candleGap / 2;
      const y = priceToY(a.y1);
      const color = a.color || '#ec4899';
      annotSvg += `
        <circle cx="${x}" cy="${y}" r="5" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1.8" />
        <path d="M ${x - 12} ${y - 14} L ${x} ${y - 4} L ${x + 12} ${y - 14}" stroke="${color}" stroke-width="2" fill="none" />
        <rect x="${x - 45}" y="${y - 32}" width="90" height="16" fill="#0f172a" rx="2" stroke="${color}" stroke-width="0.8" />
        <text x="${x}" y="${y - 20}" fill="${color}" font-size="9" font-family="monospace" text-anchor="middle" font-weight="bold">${a.label}</text>
      `;
    } else if (a.type === 'mss' && a.x1 !== undefined && a.y1 !== undefined) {
      const x = padding.left + a.x1 * candleGap;
      const y = priceToY(a.y1);
      annotSvg += `
        <line x1="${x}" y1="${y}" x2="${x + 90}" y2="${y}" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="3 2" />
        <text x="${x + 45}" y="${y - 5}" fill="#38bdf8" font-size="9" font-family="monospace" text-anchor="middle" font-weight="bold">MSS + DISPLACEMENT</text>
      `;
    }
  });

  // Current price line
  let currPriceSvg = '';
  if (currentPrice) {
    const cpY = priceToY(currentPrice);
    currPriceSvg = `
      <line x1="${padding.left}" y1="${cpY}" x2="${width - padding.right}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="1 1" />
      <rect x="${width - padding.right + 2}" y="${cpY - 9}" width="80" height="18" fill="#3b82f6" rx="3" />
      <text x="${width - padding.right + 8}" y="${cpY + 3}" fill="#ffffff" font-size="10" font-family="monospace" font-weight="bold">${currentPrice.toFixed(2)}</text>
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#090d16;">
      <!-- Header -->
      <rect x="0" y="0" width="${width}" height="44" fill="#0b1120" />
      <line x1="0" y1="44" x2="${width}" y2="44" stroke="#1e293b" stroke-width="1" />
      <text x="16" y="27" fill="#fbbf24" font-size="14" font-family="sans-serif" font-weight="bold">XAUUSD</text>
      <text x="82" y="27" fill="#e2e8f0" font-size="13" font-family="sans-serif" font-weight="bold">${timeframe}</text>
      <text x="125" y="27" fill="#94a3b8" font-size="12" font-family="sans-serif">SPOT GOLD / U.S. DOLLAR</text>
      <rect x="${width - 240}" y="12" width="224" height="20" rx="3" fill="#1e293b" />
      <text x="${width - 128}" y="26" fill="#cbd5e1" font-size="10.5" font-family="monospace" text-anchor="middle">ICT 2024 Algorithmic Feed • NY AM</text>

      <!-- Plot Area Background -->
      <rect x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" fill="#050811" stroke="#1e293b" stroke-width="1" />

      <!-- Grids -->
      ${gridSvg}

      <!-- Candlesticks -->
      ${candlesSvg}

      <!-- Annotations -->
      ${annotSvg}

      <!-- Current Price -->
      ${currPriceSvg}

      <!-- Watermark -->
      <text x="${padding.left + 15}" y="${padding.top + 30}" fill="#334155" fill-opacity="0.4" font-size="18" font-family="monospace" font-weight="bold">${title}</text>
    </svg>
  `;

  // Encode to base64 data URL
  const base64 = typeof window !== 'undefined' 
    ? window.btoa(unescape(encodeURIComponent(svg))) 
    : Buffer.from(svg).toString('base64');

  return `data:image/svg+xml;base64,${base64}`;
}
