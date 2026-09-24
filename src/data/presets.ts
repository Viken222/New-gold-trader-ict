import { PresetScenario } from '../types';
import { generateChartSvgDataUrl } from './chartGenerator';

export function getPresetScenarios(): PresetScenario[] {
  // Preset 1: Silver Bullet Bullish BISI (10:15 ET)
  const p1_4h = generateChartSvgDataUrl(
    'HTF BULLISH ORDER FLOW',
    '4H',
    [
      { time: 'Sep 18', open: 2625, high: 2636, low: 2622, close: 2634 },
      { time: 'Sep 19', open: 2634, high: 2648, low: 2631, close: 2645 },
      { time: 'Sep 20', open: 2645, high: 2655, low: 2640, close: 2652 },
      { time: 'Sep 21', open: 2652, high: 2662, low: 2647, close: 2658 },
      { time: 'Sep 22 (Today)', open: 2654, high: 2660, low: 2643, close: 2652 },
    ],
    [
      { type: 'level', y1: 2664.5, label: 'PDH (ERL Primary DOL)', color: '#10b981' },
      { type: 'level', y1: 2638.0, label: 'PDL', color: '#f43f5e' },
      { type: 'level', y1: 2651.0, label: 'Daily Open (PO5)', color: '#38bdf8' },
    ],
    2652.20
  );

  const p1_1h = generateChartSvgDataUrl(
    'LONDON LOW MANIPULATION SWEPT',
    '1H',
    [
      { time: '02:00 London', open: 2655, high: 2658, low: 2650, close: 2652 },
      { time: '04:00', open: 2652, high: 2654, low: 2642.8, close: 2646 }, // London Low sweep
      { time: '06:00', open: 2646, high: 2650, low: 2645, close: 2649 },
      { time: '07:30 NY Pre', open: 2649, high: 2653, low: 2647, close: 2651 },
      { time: '08:30 Macro', open: 2651, high: 2655, low: 2648, close: 2653 },
      { time: '09:30 Equities', open: 2653, high: 2656, low: 2647, close: 2650 },
      { time: '10:00 SB Window', open: 2650, high: 2654, low: 2649, close: 2652.2 },
    ],
    [
      { type: 'level', y1: 2664.5, label: 'PDH Primary DOL', color: '#10b981' },
      { type: 'level', y1: 2642.8, label: 'London Low (Swept)', color: '#ec4899' },
      { type: 'fvg', y1: 2644.0, y2: 2647.5, label: '1H Discount BISI', color: '#06b6d4', x1: 2 },
    ],
    2652.20
  );

  const p1_15m = generateChartSvgDataUrl(
    'DEALING RANGE & QUADRANTS',
    '15M',
    [
      { time: '08:30', open: 2651, high: 2657, low: 2648, close: 2655 },
      { time: '08:45', open: 2655, high: 2659.5, low: 2653, close: 2658 }, // Dealing Range High
      { time: '09:00', open: 2658, high: 2658.5, low: 2652, close: 2653 },
      { time: '09:15', open: 2653, high: 2655, low: 2649, close: 2650 },
      { time: '09:30', open: 2650, high: 2652, low: 2647.2, close: 2648 }, // Dealing Range Low / SSL
      { time: '09:45', open: 2648, high: 2650, low: 2647.0, close: 2649 },
      { time: '10:00', open: 2649, high: 2654, low: 2648.5, close: 2652.2 },
    ],
    [
      { type: 'level', y1: 2659.5, label: 'Range High (100%)', color: '#94a3b8' },
      { type: 'level', y1: 2656.4, label: 'Premium 75%', color: '#f43f5e' },
      { type: 'level', y1: 2653.3, label: 'Equilibrium 50%', color: '#e2e8f0' },
      { type: 'level', y1: 2650.2, label: 'Discount 25%', color: '#10b981' },
      { type: 'level', y1: 2647.0, label: 'Range Low (0%)', color: '#94a3b8' },
    ],
    2652.20
  );

  const p1_5m = generateChartSvgDataUrl(
    '09:50 SPOOLING SWEEP + DISPLACEMENT MSS',
    '5M',
    [
      { time: '09:40', open: 2650.5, high: 2651.5, low: 2648.8, close: 2649.0 },
      { time: '09:45', open: 2649.0, high: 2649.8, low: 2647.5, close: 2648.0 },
      { time: '09:50 Macro', open: 2648.0, high: 2648.5, low: 2646.8, close: 2647.6 }, // Sweep of 2647.2 SSL
      { time: '09:55 Spool', open: 2647.6, high: 2653.2, low: 2647.5, close: 2652.8 }, // Massive Displacement Candle!
      { time: '10:00 Fix', open: 2652.8, high: 2654.5, low: 2651.8, close: 2653.5 },
      { time: '10:05 Retrace', open: 2653.5, high: 2653.8, low: 2650.6, close: 2651.2 }, // Tapping FVG
      { time: '10:10 Expansion', open: 2651.2, high: 2653.0, low: 2650.8, close: 2652.2 },
    ],
    [
      { type: 'sweep', x1: 2, y1: 2646.8, label: 'SSL Sweep (2646.80)' },
      { type: 'mss', x1: 3, y1: 2651.5, label: 'MSS Break' },
      { type: 'fvg', y1: 2649.8, y2: 2651.8, label: '5M BISI FVG (Width $2.00)', color: '#10b981', x1: 3 },
    ],
    2652.20
  );

  const p1_1m = generateChartSvgDataUrl(
    'SILVER BULLET 1M BISI EXECUTION ARRAY',
    '1M',
    [
      { time: '10:00', open: 2652.8, high: 2654.0, low: 2652.5, close: 2653.8 },
      { time: '10:01', open: 2653.8, high: 2654.5, low: 2653.0, close: 2653.2 },
      { time: '10:02', open: 2653.2, high: 2653.4, low: 2651.5, close: 2651.8 },
      { time: '10:03', open: 2651.8, high: 2652.0, low: 2649.6, close: 2649.8 }, // Candle 1
      { time: '10:04', open: 2649.8, high: 2653.0, low: 2649.6, close: 2652.8 }, // Candle 2 Displacement
      { time: '10:05', open: 2652.8, high: 2654.2, low: 2651.4, close: 2653.5 }, // Candle 3 (Gap: 2649.80 - 2651.40)
      { time: '10:06', open: 2653.5, high: 2653.6, low: 2650.6, close: 2650.8 }, // Retraces directly to CE 2650.60
      { time: '10:07', open: 2650.8, high: 2652.6, low: 2650.5, close: 2652.2 }, // Bounces!
    ],
    [
      { type: 'fvg', y1: 2649.8, y2: 2651.4, label: '1M BISI Entry [CE: 2650.60]', color: '#10b981', x1: 4 },
      { type: 'level', y1: 2646.3, label: 'Protective SL (2646.30)', color: '#f43f5e' },
      { type: 'level', y1: 2659.5, label: 'TP1 (2659.50 Range High)', color: '#38bdf8' },
      { type: 'level', y1: 2664.5, label: 'TP2 (2664.50 PDH)', color: '#10b981' },
    ],
    2652.20
  );

  // Preset 2: 08:30 Judas News-Sweep Reversal Bearish SIBI
  const p2_4h = generateChartSvgDataUrl(
    'HTF BEARISH RESISTANCE AT 4H OB',
    '4H',
    [
      { time: 'Sep 18', open: 2680, high: 2685, low: 2668, close: 2672 },
      { time: 'Sep 19', open: 2672, high: 2676, low: 2655, close: 2660 },
      { time: 'Sep 20', open: 2660, high: 2668, low: 2648, close: 2652 },
      { time: 'Sep 21', open: 2652, high: 2666, low: 2650, close: 2664 },
      { time: 'Sep 22 (Today)', open: 2664, high: 2672.5, low: 2655, close: 2661 },
    ],
    [
      { type: 'level', y1: 2671.0, label: 'PDH Swept (2671.00)', color: '#ec4899' },
      { type: 'level', y1: 2645.0, label: 'PDL Primary DOL (2645.00)', color: '#10b981' },
      { type: 'level', y1: 2665.0, label: 'Daily Open (Run Above = Manipulation)', color: '#38bdf8' },
    ],
    2661.00
  );

  const p2_15m = generateChartSvgDataUrl(
    '08:30 CPI/NEWS JUDAS SWEEP OF PDH',
    '15M',
    [
      { time: '08:00', open: 2664, high: 2666, low: 2662, close: 2665 },
      { time: '08:15', open: 2665, high: 2667, low: 2664, close: 2666 },
      { time: '08:30 News Spike', open: 2666, high: 2671.8, low: 2663, close: 2664.5 }, // Massive wick above PDH, body closes back inside!
      { time: '08:45 Rejection', open: 2664.5, high: 2665.0, low: 2658.0, close: 2659.2 }, // Heavy displacement MSS
      { time: '09:00', open: 2659.2, high: 2662.5, low: 2657.8, close: 2661.0 },
    ],
    [
      { type: 'sweep', x1: 2, y1: 2671.8, label: '08:30 Judas Sweep of PDH' },
      { type: 'level', y1: 2671.0, label: 'PDH (2671.00)', color: '#f59e0b' },
      { type: 'fvg', y1: 2666.0, y2: 2663.0, label: '15M Bearish SIBI', color: '#f43f5e', x1: 2 },
    ],
    2661.00
  );

  const p2_5m = generateChartSvgDataUrl(
    '5M DISPLACEMENT SIBI & OTE RETRACE',
    '5M',
    [
      { time: '08:30 Spike', open: 2666, high: 2671.8, low: 2665, close: 2667 },
      { time: '08:35 Rejection', open: 2667, high: 2667.5, low: 2661, close: 2662 },
      { time: '08:40 Displacement', open: 2662, high: 2662.2, low: 2656.8, close: 2657.2 }, // SIBI between 2665.0 and 2662.2
      { time: '08:45 Consolidation', open: 2657.2, high: 2659.5, low: 2656.5, close: 2658.0 },
      { time: '08:50 Retrace into SIBI', open: 2658.0, high: 2663.8, low: 2657.8, close: 2663.2 }, // Retrace to CE 2663.60
      { time: '08:55 Rejection Wick', open: 2663.2, high: 2664.0, low: 2660.5, close: 2661.0 },
    ],
    [
      { type: 'mss', x1: 2, y1: 2664.5, label: '5M MSS Shift' },
      { type: 'fvg', y1: 2665.0, y2: 2662.2, label: '5M SIBI Entry Zone [CE: 2663.60]', color: '#f43f5e', x1: 2 },
      { type: 'level', y1: 2672.3, label: 'SL past Sweep (2672.30)', color: '#94a3b8' },
      { type: 'level', y1: 2653.0, label: 'TP1 (2653.00 London Low)', color: '#38bdf8' },
      { type: 'level', y1: 2645.0, label: 'TP2 (2645.00 PDL)', color: '#10b981' },
    ],
    2661.00
  );

  // Preset 3: Consolidation Mid-Range (Clean Stand-Aside Example)
  const p3_1h = generateChartSvgDataUrl(
    'CONSOLIDATION CHOP — BOTH EXTREMES SWEPT',
    '1H',
    [
      { time: '00:00 Asia', open: 2651, high: 2657, low: 2648, close: 2653 },
      { time: '03:00 London', open: 2653, high: 2658.5, low: 2646.5, close: 2652 }, // Both Asia High & Low swept
      { time: '06:00 Pre-NY', open: 2652, high: 2654, low: 2650, close: 2652.5 },
      { time: '08:30 NY Open', open: 2652.5, high: 2654.2, low: 2651.0, close: 2652.8 },
      { time: '10:00 Mid-Range', open: 2652.8, high: 2653.5, low: 2651.8, close: 2652.4 },
    ],
    [
      { type: 'level', y1: 2658.5, label: 'London High (Swept)', color: '#f59e0b' },
      { type: 'level', y1: 2646.5, label: 'London Low (Swept)', color: '#f59e0b' },
      { type: 'level', y1: 2652.5, label: 'Equilibrium Chop 50%', color: '#94a3b8' },
    ],
    2652.40
  );

  const p3_15m = generateChartSvgDataUrl(
    'NO-MANS LAND EQUILIBRIUM CHOP (45%-55%)',
    '15M',
    [
      { time: '09:00', open: 2652.0, high: 2653.4, low: 2651.2, close: 2652.8 },
      { time: '09:15', open: 2652.8, high: 2653.8, low: 2652.0, close: 2652.5 },
      { time: '09:30', open: 2652.5, high: 2653.2, low: 2651.5, close: 2652.0 },
      { time: '09:45', open: 2652.0, high: 2653.0, low: 2651.8, close: 2652.6 },
      { time: '10:00', open: 2652.6, high: 2653.5, low: 2652.1, close: 2652.4 },
    ],
    [
      { type: 'level', y1: 2654.0, label: 'Compressed Ceiling', color: '#94a3b8' },
      { type: 'level', y1: 2651.0, label: 'Compressed Floor', color: '#94a3b8' },
    ],
    2652.40
  );

  return [
    {
      id: 'preset-silver-bullet-bullish',
      title: 'P2: NY AM Silver Bullet (Bullish BISI)',
      subtitle: '10:00–11:00 ET Window • SSL Swept • 1M BISI Entry',
      archetypeTag: 'P2 — SILVER BULLET CONTINUATION',
      timeContext: '17:15 EAT (10:15 EDT)',
      mode: 'FULL-MTF',
      description: 'Classic textbook 2024 mentorship execution. 09:50 macro sweeps sell-side liquidity, displacement generates fresh BISI inside 10:00–11:00 window, targeting PDH at 2664.50.',
      charts: [
        { timeframe: '4H', label: '4H HTF Narrative & PDH Target', url: p1_4h },
        { timeframe: '1H', label: '1H London Sweep & Order Flow', url: p1_1h },
        { timeframe: '15M', label: '15M Dealing Range & Quadrants', url: p1_15m },
        { timeframe: '5M', label: '5M 09:50 Macro Sweep & MSS', url: p1_5m },
        { timeframe: '1M', label: '1M Silver Bullet BISI Execution Array', url: p1_1m },
      ],
      defaultContext: {
        captureTimeEAT: '17:15',
        seasonOffset: 'EDT',
        dayOfWeek: 'Tuesday',
        dailyOpenPrice: '2651.00',
        accountEquity: 50000,
        riskPercent: 1.0,
      },
    },
    {
      id: 'preset-judas-news-reversal',
      title: 'P1: 08:30 Judas News-Sweep Reversal (Bearish)',
      subtitle: '08:30 CPI/News Release • PDH Swept into 4H OB • SIBI Short',
      archetypeTag: 'P1 — NEWS-SWEEP REVERSAL (08:30 Judas)',
      timeContext: '16:00 EAT (09:00 EDT)',
      mode: 'FULL-MTF',
      description: 'High-impact 08:30 Judas swing runs through Previous Day High into 4H Bearish OB, bodies close back inside within 2 candles, followed by violent 5M displacement MSS down, targeting London Low and PDL.',
      charts: [
        { timeframe: '4H', label: '4H Bearish OB & PDL Target', url: p2_4h },
        { timeframe: '15M', label: '15M 08:30 News Judas Sweep', url: p2_15m },
        { timeframe: '5M', label: '5M Displacement SIBI Entry Zone', url: p2_5m },
      ],
      defaultContext: {
        captureTimeEAT: '16:00',
        seasonOffset: 'EDT',
        dayOfWeek: 'Wednesday',
        dailyOpenPrice: '2665.00',
        accountEquity: 100000,
        riskPercent: 0.75,
      },
    },
    {
      id: 'preset-consolidation-stand-aside',
      title: 'Equilibrium Chop — Strict STAND ASIDE',
      subtitle: 'Mid-Range 45%–55% • Both Extremes Swept • No Displacement',
      archetypeTag: 'STAND ASIDE (Consolidation Hard Disqualifier)',
      timeContext: '17:05 EAT (10:05 EDT)',
      mode: 'FULL-MTF',
      description: 'Institutional discipline showcase: Both Asia and London extremes already swept, price oscillating in 45%–55% no-mans land equilibrium, no quantified displacement. Strict ICT rule: DO NOT FORCE TRADES → STAND ASIDE.',
      charts: [
        { timeframe: '1H', label: '1H Both Extremes Swept Range', url: p3_1h },
        { timeframe: '15M', label: '15M Equilibrium Chop & Compressed Bodies', url: p3_15m },
      ],
      defaultContext: {
        captureTimeEAT: '17:05',
        seasonOffset: 'EDT',
        dayOfWeek: 'Monday',
        dailyOpenPrice: '2652.50',
        accountEquity: 50000,
        riskPercent: 1.0,
      },
    },
  ];
}

export const PRESET_SCENARIOS: PresetScenario[] = getPresetScenarios();
