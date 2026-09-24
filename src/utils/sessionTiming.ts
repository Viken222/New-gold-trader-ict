/**
 * Comprehensive ICT Institutional Session Timing & Macro Engine
 * Accurately tracks real-time UTC, East Africa Time (EAT = UTC+3),
 * and New York Local Time (accounting for EDT UTC-4 / EST UTC-5 daylight savings).
 */

export interface LiveSessionInfo {
  sessionName: string;
  sessionCategory: 'ASIA' | 'LONDON' | 'NY_AM' | 'NY_LUNCH' | 'NY_PM' | 'CBDR';
  isSilverBulletActive: boolean;
  isLondonKillzoneActive: boolean;
  isJudasSwingActive: boolean;
  isAsianSessionActive: boolean;
  isLunchPauseActive: boolean;
  utcTimeFormatted: string;
  eatTimeFormatted: string;
  nyTimeFormatted: string;
  dayOfWeek: string;
  seasonOffset: 'EDT' | 'EST';
  sessionDescription: string;
}

export function isDaylightSavings(date: Date = new Date()): boolean {
  // US Daylight Savings Time starts 2nd Sunday in March and ends 1st Sunday in November
  const year = date.getUTCFullYear();
  
  // 2nd Sunday of March
  const marchFirst = new Date(Date.UTC(year, 2, 1));
  const marchFirstDay = marchFirst.getUTCDay();
  const secondSundayMarch = 1 + (7 - marchFirstDay) % 7 + 7;
  const dstStart = new Date(Date.UTC(year, 2, secondSundayMarch, 7, 0, 0)); // 2:00 AM EST = 7:00 UTC

  // 1st Sunday of November
  const novFirst = new Date(Date.UTC(year, 10, 1));
  const novFirstDay = novFirst.getUTCDay();
  const firstSundayNov = 1 + (7 - novFirstDay) % 7;
  const dstEnd = new Date(Date.UTC(year, 10, firstSundayNov, 6, 0, 0)); // 2:00 AM EDT = 6:00 UTC

  return date.getTime() >= dstStart.getTime() && date.getTime() < dstEnd.getTime();
}

export function getAccurateLiveSession(date: Date = new Date()): LiveSessionInfo {
  const isEDT = isDaylightSavings(date);
  const seasonOffset: 'EDT' | 'EST' = isEDT ? 'EDT' : 'EST';
  const nyOffset = isEDT ? -4 : -5;

  // UTC calculations
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const utcSeconds = date.getUTCSeconds();
  const utcDecimal = utcHours + utcMinutes / 60 + utcSeconds / 3600;
  const utcTimeFormatted = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} UTC`;

  // EAT is UTC + 3
  const eatDate = new Date(date.getTime() + 3 * 3600 * 1000);
  const eatHours = String(eatDate.getUTCHours()).padStart(2, '0');
  const eatMinutes = String(eatDate.getUTCMinutes()).padStart(2, '0');
  const eatTimeFormatted = `${eatHours}:${eatMinutes}`;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = days[eatDate.getUTCDay()];

  // NY Local calculations
  const nyDate = new Date(date.getTime() + nyOffset * 3600 * 1000);
  const nyH = nyDate.getUTCHours();
  const nyM = nyDate.getUTCMinutes();
  const nyTimeDecimal = nyH + nyM / 60;
  const nyTimeFormatted = `${String(nyH).padStart(2, '0')}:${String(nyM).padStart(2, '0')} ${seasonOffset}`;

  // ICT Algorithmic Macro Windows (based on NY Local Time)
  const isSilverBulletActive = (nyTimeDecimal >= 10.0 && nyTimeDecimal <= 11.0) || (nyTimeDecimal >= 14.0 && nyTimeDecimal <= 15.0);
  const isLondonKillzoneActive = nyTimeDecimal >= 2.0 && nyTimeDecimal < 5.0;
  const isJudasSwingActive = nyTimeDecimal >= 8.5 && nyTimeDecimal < 9.5;
  const isAsianSessionActive = nyTimeDecimal >= 18.0 || nyTimeDecimal < 2.0; // 22:00 - 06:00 UTC
  const isLunchPauseActive = nyTimeDecimal >= 11.5 && nyTimeDecimal < 13.0;

  let sessionName = 'Asian Session Accumulation';
  let sessionCategory: LiveSessionInfo['sessionCategory'] = 'ASIA';
  let sessionDescription = 'Marek Majeer Range Formation (22:00–06:00 UTC). Institutional liquidity pooling at session highs/lows.';

  if (nyTimeDecimal >= 2.0 && nyTimeDecimal < 5.0) {
    sessionName = 'London Open Killzone (02:00–05:00 NY)';
    sessionCategory = 'LONDON';
    sessionDescription = 'Active European market open. Primary algorithmic objective: Hunt & sweep Asian session liquidity pool.';
  } else if (nyTimeDecimal >= 5.0 && nyTimeDecimal < 7.0) {
    sessionName = 'London Midday Consolidation';
    sessionCategory = 'LONDON';
    sessionDescription = 'European lunch pause. Pre-New York rebalancing between dealing range boundaries.';
  } else if (nyTimeDecimal >= 7.0 && nyTimeDecimal < 8.3) {
    sessionName = 'NY Pre-Market / News Macro (07:00–08:15 NY)';
    sessionCategory = 'NY_AM';
    sessionDescription = 'Institutional positioning prior to US high-impact economic releases (CPI, PPI, NFP).';
  } else if (nyTimeDecimal >= 8.3 && nyTimeDecimal < 9.5) {
    sessionName = 'NY Open Judas Swing (08:30–09:30 NY)';
    sessionCategory = 'NY_AM';
    sessionDescription = 'Algorithmic manipulation run engineered against Daily Open price to trap breakout retail traders.';
  } else if (nyTimeDecimal >= 9.5 && nyTimeDecimal < 10.0) {
    sessionName = 'NY Equities Open Macro (09:30–10:00 NY)';
    sessionCategory = 'NY_AM';
    sessionDescription = 'Cash open injection (09:50 Macro). Volatility expansion into algorithmic key levels.';
  } else if (nyTimeDecimal >= 10.0 && nyTimeDecimal <= 11.0) {
    sessionName = '🔥 NY AM Silver Bullet Window (10:00–11:00 NY)';
    sessionCategory = 'NY_AM';
    sessionDescription = 'Premier ICT algorithmic execution window. 15M/5M/1M BISI or SIBI displacement delivery toward DOL.';
  } else if (nyTimeDecimal > 11.0 && nyTimeDecimal < 11.5) {
    sessionName = 'London Fix / Institutional Rebalancing (11:00–11:30 NY)';
    sessionCategory = 'NY_AM';
    sessionDescription = 'London market close rebalancing and benchmark currency fixings.';
  } else if (nyTimeDecimal >= 11.5 && nyTimeDecimal < 13.0) {
    sessionName = 'NY Lunch Algorithmic Pause (11:30–13:00 NY)';
    sessionCategory = 'NY_LUNCH';
    sessionDescription = 'Institutional algorithm paused. Spreads widen, volume drops. High risk of choppy double-sided stop runs.';
  } else if (nyTimeDecimal >= 13.0 && nyTimeDecimal < 14.0) {
    sessionName = 'NY PM Session / London Close Macro (13:00–14:00 NY)';
    sessionCategory = 'NY_PM';
    sessionDescription = 'Post-lunch resumption. London traders exiting; algorithmic delivery into daily extremes.';
  } else if (nyTimeDecimal >= 14.0 && nyTimeDecimal <= 15.0) {
    sessionName = '🔥 NY PM Silver Bullet Window (14:00–15:00 NY)';
    sessionCategory = 'NY_PM';
    sessionDescription = 'Secondary afternoon Silver Bullet model. Final daily expansion into remaining buy-side or sell-side liquidity.';
  } else if (nyTimeDecimal > 15.0 && nyTimeDecimal < 16.0) {
    sessionName = 'NY Market Close & Settlement (15:00–16:00 NY)';
    sessionCategory = 'NY_PM';
    sessionDescription = 'Futures settlement and day-end position squaring.';
  } else if (nyTimeDecimal >= 16.0 && nyTimeDecimal < 18.0) {
    sessionName = 'CBDR - Central Bank Dealers Range (16:00–18:00 NY)';
    sessionCategory = 'CBDR';
    sessionDescription = 'Daily rollover and spread clearing window before Asian session opens.';
  }

  return {
    sessionName,
    sessionCategory,
    isSilverBulletActive,
    isLondonKillzoneActive,
    isJudasSwingActive,
    isAsianSessionActive,
    isLunchPauseActive,
    utcTimeFormatted,
    eatTimeFormatted,
    nyTimeFormatted,
    dayOfWeek,
    seasonOffset,
    sessionDescription,
  };
}
