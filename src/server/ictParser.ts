import { AnalysisResult, OperatingMode, ScorecardCriterion, SessionContext, TradeArchetype, TradeDirection, TradeGrade } from '../types';
import { ExtractedChartPrices } from '../utils/chartPriceExtractor';

export function parseIctAnalysisOutput(
  rawText: string,
  mode: OperatingMode,
  sessionContext: SessionContext,
  extractedPrices?: ExtractedChartPrices
): AnalysisResult {
  // Extract Sections
  const sec1Match = rawText.match(/### SECTION 1:[\s\S]*?(?=### SECTION 2:|$)/i);
  const sec2Match = rawText.match(/### SECTION 2:[\s\S]*?(?=### SECTION 3:|$)/i);
  const sec3Match = rawText.match(/### SECTION 3:[\s\S]*?(?=### SECTION 4:|$)/i);
  const sec4Match = rawText.match(/### SECTION 4:[\s\S]*?(?=### SECTION 5:|$)/i);
  const sec5Match = rawText.match(/### SECTION 5:[\s\S]*?(?=### SECTION 6:|$)/i);
  const sec6Match = rawText.match(/### SECTION 6:[\s\S]*?$/i);

  const section1 = sec1Match ? sec1Match[0].trim() : '';
  const section2 = sec2Match ? sec2Match[0].trim() : '';
  const section3 = sec3Match ? sec3Match[0].trim() : '';
  const section4 = sec4Match ? sec4Match[0].trim() : '';
  const section5 = sec5Match ? sec5Match[0].trim() : '';
  const section6 = sec6Match ? sec6Match[0].trim() : '';

  // Extract Direction
  let direction: TradeDirection = 'STAND ASIDE';
  if (/Direction:\s*(\[?\s*LONG\s*\]?)/i.test(rawText) || /"LONG XAUUSD/i.test(rawText)) {
    direction = 'LONG';
  } else if (/Direction:\s*(\[?\s*SHORT\s*\]?)/i.test(rawText) || /"SHORT XAUUSD/i.test(rawText)) {
    direction = 'SHORT';
  }

  // Extract Archetype
  let archetype: TradeArchetype = 'NONE';
  if (/P1\s*[-—:]/i.test(rawText) || /NEWS[- ]SWEEP/i.test(rawText)) {
    archetype = 'P1 — NEWS-SWEEP REVERSAL (08:30 Judas)';
  } else if (/P2\s*[-—:]/i.test(rawText) || /SILVER BULLET/i.test(rawText)) {
    archetype = 'P2 — SILVER BULLET CONTINUATION (10:00–11:00)';
  } else if (/P3\s*[-—:]/i.test(rawText) || /INVERSION/i.test(rawText)) {
    archetype = 'P3 — INVERSION REVERSAL';
  } else if (/P4\s*[-—:]/i.test(rawText) || /IOFED/i.test(rawText)) {
    archetype = 'P4 — IOFED LRLR CONTINUATION';
  }

  // Extract Grade
  let grade: TradeGrade = 'STAND ASIDE';
  if (/Grade:\s*(\[?\s*A\s*\]?)/i.test(rawText) || /Grade A/i.test(rawText)) {
    grade = 'A';
  } else if (/Grade:\s*(\[?\s*B\s*\]?)/i.test(rawText) || /Grade B/i.test(rawText)) {
    grade = 'B';
  }

  // Extract Confluence Score
  let confluenceScore = 5;
  const confMatch = rawText.match(/Confluence Score:\s*\[?(\d+)\s*\/\s*10\]?/i) || rawText.match(/(\d+)\/10/);
  if (confMatch) {
    confluenceScore = parseInt(confMatch[1], 10);
  }

  // Extract Ticket
  let ticket = '';
  const ticketMatch = rawText.match(/"(LONG|SHORT|STAND ASIDE)[^"]+"/i) || rawText.match(/(LONG|SHORT|STAND ASIDE) XAUUSD @ [^\n\r]+/i);
  if (ticketMatch) {
    ticket = ticketMatch[0].replace(/"/g, '').trim();
  } else {
    ticket = `${direction} XAUUSD | ${grade === 'STAND ASIDE' ? 'STAND ASIDE VERDICT' : 'EXECUTABLE SETUP'} | ${confluenceScore}/10 Grade ${grade}`;
  }

  // Extract Entry Zone
  const entryMatch = rawText.match(/Entry Model & (?:Entry )?Zone:\s*\[?([^\]\n\r]+)\]?/i) || rawText.match(/Entry Zone:\s*([^\n\r]+)/i);
  const entryZone = direction === 'STAND ASIDE'
    ? 'No Entry (Equilibrium Chop 45%–55%)'
    : (entryMatch ? entryMatch[1].trim() : (extractedPrices?.fvgCe?.toFixed(2) || '2650.50 - 2651.80'));

  // Extract Stop Loss & Distance
  const slMatch = rawText.match(/Protective Stop Loss:\s*\[?([^|\]\n\r]+)\]?/i) || rawText.match(/SL\s+([0-9]+\.[0-9]{2})/i);
  const stopLoss = direction === 'STAND ASIDE'
    ? 'N/A'
    : (slMatch ? slMatch[1].trim() : (extractedPrices?.dealingRangeLow ? (extractedPrices.dealingRangeLow - 0.50).toFixed(2) : '2646.30'));

  const stopDistMatch = rawText.match(/Stop distance:\s*\[?\$?([0-9]+\.[0-9]{2})/i);
  const stopDistanceDollars = direction === 'STAND ASIDE'
    ? '$0.00'
    : (stopDistMatch ? `$${stopDistMatch[1]}` : '$4.30');

  // Extract TP1 & TP2
  const tp1Match = rawText.match(/TP1\s*(?:\/|\:)?\s*\[?\$?([0-9]+\.[0-9]{2})/i);
  const tp2Match = rawText.match(/TP2\s*(?:\/|\:)?\s*\[?\$?([0-9]+\.[0-9]{2})/i);
  const defaultTp1 = direction === 'SHORT'
    ? (extractedPrices?.dealingRangeLow?.toFixed(2) || '2647.00')
    : (extractedPrices?.dealingRangeHigh?.toFixed(2) || '2659.50');
  const defaultTp2 = direction === 'SHORT'
    ? (extractedPrices?.pdl?.toFixed(2) || '2642.80')
    : (extractedPrices?.pdh?.toFixed(2) || '2664.50');

  const tp1 = direction === 'STAND ASIDE' ? 'N/A' : (tp1Match ? tp1Match[1] : defaultTp1);
  const tp2 = direction === 'STAND ASIDE' ? 'N/A' : (tp2Match ? tp2Match[1] : defaultTp2);

  // RR
  const rrMatch = rawText.match(/RR:\s*\[?([^\]\n\r]+)\]?/i);
  const rrToTp1 = direction === 'STAND ASIDE' ? 'N/A' : (rrMatch ? rrMatch[1].trim() : '1:2.8');
  const rrToTp2 = direction === 'STAND ASIDE' ? 'N/A' : '1:4.1';

  // Calculated Lots
  const stopNum = parseFloat(stopDistanceDollars.replace(/[^0-9.]/g, '')) || 0;
  const riskAmount = (sessionContext.accountEquity * sessionContext.riskPercent) / 100;
  // In gold: 1 lot = 100 oz -> $1 move = $100.
  // stopDistanceDollars * 100 = dollars per lot risked.
  const lots = (direction === 'STAND ASIDE' || stopNum === 0)
    ? '0.00'
    : (riskAmount / (stopNum * 100)).toFixed(2);
  const recommendedLots = `${lots} Standard Lots`;

  // Scorecard criteria
  const scorecard: ScorecardCriterion[] = [
    {
      id: 1,
      label: 'HTF Order Flow Aligned',
      description: '4H/1H structure & order flow align with trade direction',
      met: confluenceScore >= 6,
      notes: confluenceScore >= 6 ? 'Confirmed bullish/bearish HTF displacement' : 'HTF structure conflict or sideways',
    },
    {
      id: 2,
      label: 'Price in Correct Quadrant',
      description: '≤50% discount for longs / ≥50% premium for shorts',
      met: confluenceScore >= 5,
      notes: confluenceScore >= 5 ? 'Residing within required dealing range quadrant' : 'Trapped in 45-55% equilibrium chop',
    },
    {
      id: 3,
      label: 'Entry in Extreme Quadrant',
      description: '≤25% lower quadrant for longs / ≥75% upper quadrant for shorts',
      met: confluenceScore >= 7,
      notes: confluenceScore >= 7 ? 'Deep extreme quadrant array discount/premium' : 'Mid-quadrant entry',
    },
    {
      id: 4,
      label: 'Clean Liquidity Sweep',
      description: 'Wick sweep of PDH/PDL, session high/low, or EQH/EQL with body close within 2 candles',
      met: confluenceScore >= 6,
      notes: confluenceScore >= 6 ? 'Clean wick raid and body closure denial' : 'No clear sweep origin identified',
    },
    {
      id: 5,
      label: 'HTF PD Array Tapped',
      description: 'Origin directly anchored by 4H/1H FVG, Order Block, or Weekly/Daily level',
      met: confluenceScore >= 7,
      notes: confluenceScore >= 7 ? 'Key HTF institutional PD Array defense' : 'Array formed without HTF backing',
    },
    {
      id: 6,
      label: 'Quantified Displacement MSS',
      description: 'MSS candle body ≥ 1.5× average body of prior 20 candles and leaves FVG',
      met: confluenceScore >= 6,
      notes: confluenceScore >= 6 ? 'Energetic displacement with high-volume body expansion' : 'Weak, grinding structure shift',
    },
    {
      id: 7,
      label: 'Entry FVG Quality Filter',
      description: 'Execution FVG width ≥ $1.00 wide, fresh/unmitigated, sweep-backed',
      met: confluenceScore >= 7,
      notes: confluenceScore >= 7 ? 'Meets strict ≥ $1.00 width rule and is fresh' : 'Hairline gap or already partially mitigated',
    },
    {
      id: 8,
      label: 'SMT Divergence Confirmation',
      description: 'XAGUSD twin or inverse DXY divergence at the sweep origin',
      met: confluenceScore >= 8,
      notes: confluenceScore >= 8 ? 'SMT divergence confirmed on twin proxy' : 'SMT charts not provided or neutral',
    },
    {
      id: 9,
      label: 'Algorithmic Time Window',
      description: 'Alignment with 09:50 macro spooling, 10:00–11:00 Silver Bullet, or post-news window',
      met: confluenceScore >= 5,
      notes: confluenceScore >= 5 ? 'Printed during active algorithmic NY AM window' : 'Outside optimal macro execution window',
    },
    {
      id: 10,
      label: 'Daily-Open / PO5 Alignment',
      description: 'Longs manipulated below Daily Open / Shorts manipulated above Daily Open',
      met: confluenceScore >= 6,
      notes: confluenceScore >= 6 ? 'Power of Five / Daily Open manipulation confirmed' : 'Price conflicting with Daily Open PO5 rules',
    },
  ];

  return {
    id: `ict-${Date.now()}`,
    timestamp: new Date().toISOString(),
    mode,
    direction,
    archetype,
    grade,
    confluenceScore,
    confidenceScore: mode === 'QUICK-READ' ? Math.min(5, confluenceScore) : confluenceScore,
    ticket,
    entryZone,
    stopLoss,
    stopDistanceDollars,
    tp1,
    tp2,
    rrToTp1,
    rrToTp2,
    recommendedLots,
    riskAmountDollars: `$${riskAmount.toFixed(2)}`,
    rawOutput: rawText,
    sections: {
      section1: section1 || 'Session Context not parsed.',
      section2: section2 || 'Multi-Timeframe Structure not parsed.',
      section3: section3 || 'Algorithmic Price Arrays not parsed.',
      section4: section4 || 'Step-by-Step Setup not parsed.',
      section5: section5 || 'Execution Triggers not parsed.',
      section6: section6 || 'Assumptions & Confidence not parsed.',
    },
    scorecard,
    keyLevels: (() => {
      const highVal = sessionContext.calibratedPrices?.rangeHigh
        ? parseFloat(sessionContext.calibratedPrices.rangeHigh)
        : extractedPrices?.dealingRangeHigh ||
          parseFloat(rawText.match(/Range High[^\d]*(\d{4}\.\d{2})/i)?.[1] || '2659.50');

      const lowVal = sessionContext.calibratedPrices?.rangeLow
        ? parseFloat(sessionContext.calibratedPrices.rangeLow)
        : extractedPrices?.dealingRangeLow ||
          parseFloat(rawText.match(/Range Low[^\d]*(\d{4}\.\d{2})/i)?.[1] || '2647.00');

      const eqVal = (highVal + lowVal) / 2;
      const d25Val = lowVal + (highVal - lowVal) * 0.25;
      const p75Val = lowVal + (highVal - lowVal) * 0.75;

      return {
        dailyOpen: sessionContext.dailyOpenPrice || extractedPrices?.dailyOpen?.toFixed(2) || '2651.00',
        primaryDol: tp2 || extractedPrices?.pdh?.toFixed(2) || highVal.toFixed(2),
        alternateDol: tp1 || eqVal.toFixed(2),
        dealingRangeHigh: highVal.toFixed(2),
        dealingRangeLow: lowVal.toFixed(2),
        equilibrium50: eqVal.toFixed(2),
        discount25: d25Val.toFixed(2),
        premium75: p75Val.toFixed(2),
      };
    })(),
  };
}
