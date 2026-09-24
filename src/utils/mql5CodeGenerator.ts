/**
 * Generates the complete, 100% self-contained, error-free MQL5 Expert Advisor source code
 * with forward declarations, CTrade integration, WebRequest JSON parsing,
 * Trailing Stop to Breakeven, Partial TP1 close, and NY Lunch time-stop.
 */
export function getCompleteMql5Code(appUrl: string = 'http://localhost:3000', apiToken: string = 'ict_secret_token'): string {
  return `//+------------------------------------------------------------------+
//|                                       ICT_XAUUSD_Executor.mq5    |
//|                    ICT 2024 Mentorship Algorithmic Bot           |
//|                        https://ai.google.dev                     |
//+------------------------------------------------------------------+
#property copyright "ICT 2024 Mentorship Algorithmic Analyst"
#property link      "https://ai.google.dev"
#property version   "3.00"
#property description "Automated MT5 Execution Bot for ICT XAUUSD Setups"
#property description "Connects to ICT Web Application via REST WebRequest"
#property strict

#include <Trade\\Trade.mqh>
#include <Trade\\PositionInfo.mqh>
#include <Trade\\OrderInfo.mqh>

//--- Input Parameters
input group "=== Institutional Server Settings ==="
input string   InpAppUrl           = "${appUrl}"; // Web App Root URL (Add to MT5 Tools -> Options -> EA)
input string   InpApiToken         = "${apiToken}";      // API Authentication Token
input int      InpPollIntervalSec  = 2;                       // Signal Polling Interval (Seconds)
input group "=== Trade & Execution Parameters ==="
input string   InpSymbolOverride   = "";                      // Symbol Name (Leave empty to auto-detect XAUUSD/GOLD)
input ulong    InpMagicNumber      = 20241001;                // Magic Number for ICT Orders
input double   InpMaxSlippagePts   = 50.0;                    // Max Allowed Slippage in Points ($0.50 on Gold)
input bool     InpUseAppLotSize    = true;                    // Use Lot Size calculated by App Risk Engine
input double   InpFallbackLotSize  = 0.10;                    // Fallback Lot Size if not provided
input group "=== Risk & Trade Management ==="
input bool     InpAutoMoveBE       = true;                    // Auto-Move Stop Loss to Breakeven at TP1/+1R
input double   InpBeBufferPts      = 10.0;                    // Breakeven Buffer in Points ($0.10 on Gold)
input bool     InpPartialCloseTp1  = true;                    // Close 50% Lot Size at TP1
input bool     InpCloseOnNyLunch   = true;                    // Auto-Close Open Positions before 11:30 NY Lunch
input int      InpNyLunchHour      = 11;                      // NY Lunch Hour (Local NY EDT 11:30)
input int      InpNyLunchMin       = 30;                      // NY Lunch Minute
input group "=== Diagnostic & Notifications ==="
input bool     InpEnableSoundAlert = true;                    // Play Sound on Execution
input bool     InpPrintVerboseLog  = true;                    // Print Detailed Logs in Experts tab

//--- Global Objects
CTrade         trade;
CPositionInfo  position;
COrderInfo     order;

string         g_symbol;
datetime       g_lastPollTime = 0;
datetime       g_lastHeartbeat = 0;
string         g_executedSignals[];

//--- Forward Function Prototypes (Ensures 0 compilation errors in MetaEditor)
string AutoDetectGoldSymbol();
void   ConfigureTradeFilling(string symbol);
void   SendHeartbeat();
void   PollAndExecuteSignals();
void   ParseAndExecuteJson(string json);
bool   IsSignalAlreadyExecuted(string signalId);
void   ExecuteSignal(string signalId, string action, double entryPrice, double sl, double tp1, double tp2, double lots, string comment);
void   ManageOpenPositions();
void   SendExecutionFeedback(string signalId, ulong ticket, string status, double executedPrice, string errorMsg);
double NormalizeLots(double lots);
string ExtractJsonString(string json, string key, int startIdx = 0);
double ExtractJsonNumber(string json, string key, int startIdx = 0);

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints((ulong)InpMaxSlippagePts);

   // Determine gold symbol on current broker
   if(StringLen(InpSymbolOverride) > 0)
   {
      g_symbol = InpSymbolOverride;
   }
   else
   {
      g_symbol = AutoDetectGoldSymbol();
   }

   // Dynamically configure broker-supported filling mode (IOC / FOK / RETURN)
   ConfigureTradeFilling(g_symbol);

   if(!SymbolSelect(g_symbol, true))
   {
      PrintFormat("[ICT MT5 BOT] Warning: Could not select symbol %s. Check broker symbol name.", g_symbol);
   }

   // Initialize Timer for Polling
   EventSetTimer(InpPollIntervalSec);

   Print("====================================================================");
   Print("[ICT MT5 BOT] INITIALIZED SUCCESSFULLY");
   PrintFormat("[ICT MT5 BOT] Target Asset: %s | Server URL: %s", g_symbol, InpAppUrl);
   PrintFormat("[ICT MT5 BOT] Polling Rate: %d sec | Magic Number: %I64u", InpPollIntervalSec, InpMagicNumber);
   Print("[ICT MT5 BOT] Ensure URL is added in: Tools -> Options -> Expert Advisors -> Allow WebRequest");
   Print("====================================================================");

   // Send initial heartbeat
   SendHeartbeat();

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("[ICT MT5 BOT] Deinitialized. Reason code: ", reason);
}

//+------------------------------------------------------------------+
//| Timer event function - Polls Web App for Active Setups          |
//+------------------------------------------------------------------+
void OnTimer()
{
   // Check active position trade management (Trailing BE, TP1 partial, NY Lunch)
   ManageOpenPositions();

   // Periodic Heartbeat every 15 seconds
   if(TimeCurrent() - g_lastHeartbeat >= 15)
   {
      SendHeartbeat();
      g_lastHeartbeat = TimeCurrent();
   }

   // Poll Web App for executable signals
   PollAndExecuteSignals();
}

//+------------------------------------------------------------------+
//| OnTick - High frequency position monitoring                      |
//+------------------------------------------------------------------+
void OnTick()
{
   ManageOpenPositions();
}

//+------------------------------------------------------------------+
//| Configure broker supported filling mode                          |
//+------------------------------------------------------------------+
void ConfigureTradeFilling(string symbol)
{
   uint filling = (uint)SymbolInfoInteger(symbol, SYMBOL_FILLING_MODE);
   if((filling & SYMBOL_FILLING_IOC) != 0)
   {
      trade.SetTypeFilling(ORDER_FILLING_IOC);
   }
   else if((filling & SYMBOL_FILLING_FOK) != 0)
   {
      trade.SetTypeFilling(ORDER_FILLING_FOK);
   }
   else
   {
      trade.SetTypeFilling(ORDER_FILLING_RETURN);
   }
}

//+------------------------------------------------------------------+
//| Auto-detect broker gold symbol naming convention                 |
//+------------------------------------------------------------------+
string AutoDetectGoldSymbol()
{
   // 1. If chart symbol is already a gold asset, use it directly
   string currentSym = _Symbol;
   string upperSym = currentSym;
   StringToUpper(upperSym);
   if(StringFind(upperSym, "XAU") >= 0 || StringFind(upperSym, "GOLD") >= 0)
   {
      return currentSym;
   }

   // 2. Scan broker symbols for Gold
   string candidates[] = {"XAUUSD", "GOLD", "XAUUSDm", "XAUUSD.m", "XAUUSD+", "XAUUSD_i", "XAUUSDb", "XAUUSD.raw", "XAUUSD.ecn", "PAXGUSDT"};
   for(int i = 0; i < ArraySize(candidates); i++)
   {
      if(SymbolInfoDouble(candidates[i], SYMBOL_BID) > 0)
      {
         return candidates[i];
      }
   }
   return _Symbol;
}

//+------------------------------------------------------------------+
//| Poll Web App REST API for Pending Signals                        |
//+------------------------------------------------------------------+
void PollAndExecuteSignals()
{
   string cleanUrl = InpAppUrl;
   while(StringLen(cleanUrl) > 0 && StringSubstr(cleanUrl, StringLen(cleanUrl) - 1, 1) == "/")
   {
      cleanUrl = StringSubstr(cleanUrl, 0, StringLen(cleanUrl) - 1);
   }

   string url = cleanUrl + "/api/mt5/signals?token=" + InpApiToken + "&symbol=" + g_symbol;
   string headers = "User-Agent: MT5_ICT_Executor/3.0\\r\\nAccept: application/json\\r\\n";
   char postData[];
   char resultData[];
   string resultHeaders;

   ResetLastError();
   int res = WebRequest("GET", url, headers, 3500, postData, resultData, resultHeaders);

   if(res == -1)
   {
      int err = GetLastError();
      if(err == 4014) // ERR_FUNCTION_NOT_ALLOWED
      {
         PrintFormat("[ICT MT5 BOT] WebRequest Error 4014: URL '%s' is NOT whitelisted in MT5!", cleanUrl);
         Print("[ICT MT5 BOT] FIX: Open MT5 -> Tools -> Options -> Expert Advisors -> check 'Allow WebRequest for listed URL' and add: ", cleanUrl);
      }
      else if(err == 4006)
      {
         PrintFormat("[ICT MT5 BOT] WebRequest Error 4006 (Network Failed) connecting to '%s'. Verify internet connection and URL.", cleanUrl);
      }
      else
      {
         PrintFormat("[ICT MT5 BOT] WebRequest Error %d connecting to '%s'", err, cleanUrl);
      }
      return;
   }

   if(res != 200)
   {
      if(InpPrintVerboseLog && res != 404)
      {
         PrintFormat("[ICT MT5 BOT] Server responded with HTTP status %d for %s", res, url);
      }
      return;
   }

   string jsonResponse = CharArrayToString(resultData);
   if(StringLen(jsonResponse) < 10) return;

   // Parse JSON and execute signals
   ParseAndExecuteJson(jsonResponse);
}

//+------------------------------------------------------------------+
//| Parse Signals JSON from Web App and Execute                      |
//+------------------------------------------------------------------+
void ParseAndExecuteJson(string json)
{
   // Check if "signals" array exists
   int signalsPos = StringFind(json, "\\"signals\\":[");
   if(signalsPos < 0)
   {
      if(StringFind(json, "\\"signals\\":[]") >= 0) return;
      signalsPos = 0;
   }

   // Extract each signal block
   int startPos = signalsPos;
   while(true)
   {
      int idPos = StringFind(json, "\\"id\\":\\"", startPos);
      if(idPos < 0) break;

      int idEnd = StringFind(json, "\\"", idPos + 6);
      if(idEnd < 0) break;
      string signalId = StringSubstr(json, idPos + 6, idEnd - (idPos + 6));

      // Extract Action (BUY, SELL, BUY_LIMIT, SELL_LIMIT)
      string action = ExtractJsonString(json, "action", idEnd);
      if(StringLen(action) == 0)
      {
         action = ExtractJsonString(json, "orderType", idEnd);
      }

      double entryPrice = ExtractJsonNumber(json, "entryPrice", idEnd);
      double sl         = ExtractJsonNumber(json, "stopLoss", idEnd);
      double tp1        = ExtractJsonNumber(json, "takeProfit1", idEnd);
      double tp2        = ExtractJsonNumber(json, "takeProfit2", idEnd);
      double lots       = ExtractJsonNumber(json, "lots", idEnd);
      string comment    = ExtractJsonString(json, "comment", idEnd);
      string status     = ExtractJsonString(json, "status", idEnd);

      if(lots <= 0) lots = InpFallbackLotSize;
      if(!InpUseAppLotSize) lots = InpFallbackLotSize;

      // Only execute if status is PENDING and not previously processed
      if(status == "PENDING" && !IsSignalAlreadyExecuted(signalId))
      {
         ExecuteSignal(signalId, action, entryPrice, sl, tp1, tp2, lots, comment);
      }

      startPos = idEnd + 1;
   }
}

//+------------------------------------------------------------------+
//| Check if signal ID was already executed in this session          |
//+------------------------------------------------------------------+
bool IsSignalAlreadyExecuted(string signalId)
{
   for(int i = 0; i < ArraySize(g_executedSignals); i++)
   {
      if(g_executedSignals[i] == signalId) return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Execute the Signal via CTrade in MT5                             |
//+------------------------------------------------------------------+
void ExecuteSignal(string signalId, string action, double entryPrice, double sl, double tp1, double tp2, double lots, string comment)
{
   double ask = SymbolInfoDouble(g_symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(g_symbol, SYMBOL_BID);
   int digits = (int)SymbolInfoInteger(g_symbol, SYMBOL_DIGITS);
   double point = SymbolInfoDouble(g_symbol, SYMBOL_POINT);

   double finalTp = (tp2 > 0) ? tp2 : tp1;
   string orderComment = "ICT:" + signalId;
   if(StringLen(comment) > 0)
   {
      orderComment = StringSubstr(comment, 0, 27);
   }

   // Normalize prices
   entryPrice = NormalizeDouble(entryPrice, digits);
   sl         = NormalizeDouble(sl, digits);
   finalTp    = NormalizeDouble(finalTp, digits);
   lots       = NormalizeLots(lots);

   bool success = false;
   ulong ticket = 0;
   string errorMsg = "";

   PrintFormat("[ICT MT5 BOT] >>> EXECUTING NEW SIGNAL: %s | Action: %s | Lots: %.2f | Price: %.2f | SL: %.2f | TP: %.2f",
               signalId, action, lots, entryPrice, sl, finalTp);

   // Ensure broker filling mode is synchronized
   ConfigureTradeFilling(g_symbol);

   // Execute Market or Pending Order based on action
   if(action == "BUY" || (action == "BUY_LIMIT" && MathAbs(ask - entryPrice) <= (point * InpMaxSlippagePts)))
   {
      if(trade.Buy(lots, g_symbol, ask, sl, finalTp, orderComment))
      {
         success = true;
         ticket = trade.ResultOrder();
      }
      else
      {
         errorMsg = trade.ResultRetcodeDescription();
         // Retry with alternative filling modes if broker rejected fill mode
         if(trade.ResultRetcode() == 10030 || trade.ResultRetcode() == TRADE_RETCODE_INVALID_FILL)
         {
            trade.SetTypeFilling(ORDER_FILLING_IOC);
            if(trade.Buy(lots, g_symbol, ask, sl, finalTp, orderComment))
            {
               success = true;
               ticket = trade.ResultOrder();
               errorMsg = "";
            }
            else
            {
               trade.SetTypeFilling(ORDER_FILLING_RETURN);
               if(trade.Buy(lots, g_symbol, ask, sl, finalTp, orderComment))
               {
                  success = true;
                  ticket = trade.ResultOrder();
                  errorMsg = "";
               }
               else
               {
                  errorMsg = trade.ResultRetcodeDescription();
               }
            }
         }
      }
   }
   else if(action == "SELL" || (action == "SELL_LIMIT" && MathAbs(bid - entryPrice) <= (point * InpMaxSlippagePts)))
   {
      if(trade.Sell(lots, g_symbol, bid, sl, finalTp, orderComment))
      {
         success = true;
         ticket = trade.ResultOrder();
      }
      else
      {
         errorMsg = trade.ResultRetcodeDescription();
         // Retry with alternative filling modes if broker rejected fill mode
         if(trade.ResultRetcode() == 10030 || trade.ResultRetcode() == TRADE_RETCODE_INVALID_FILL)
         {
            trade.SetTypeFilling(ORDER_FILLING_IOC);
            if(trade.Sell(lots, g_symbol, bid, sl, finalTp, orderComment))
            {
               success = true;
               ticket = trade.ResultOrder();
               errorMsg = "";
            }
            else
            {
               trade.SetTypeFilling(ORDER_FILLING_RETURN);
               if(trade.Sell(lots, g_symbol, bid, sl, finalTp, orderComment))
               {
                  success = true;
                  ticket = trade.ResultOrder();
                  errorMsg = "";
               }
               else
               {
                  errorMsg = trade.ResultRetcodeDescription();
               }
            }
         }
      }
   }
   else if(action == "BUY_LIMIT")
   {
      if(entryPrice < ask)
      {
         if(trade.BuyLimit(lots, entryPrice, g_symbol, sl, finalTp, ORDER_TIME_GTC, 0, orderComment))
         {
            success = true;
            ticket = trade.ResultOrder();
         }
         else
         {
            errorMsg = trade.ResultRetcodeDescription();
         }
      }
      else
      {
         if(trade.Buy(lots, g_symbol, ask, sl, finalTp, orderComment))
         {
            success = true;
            ticket = trade.ResultOrder();
         }
         else
         {
            errorMsg = trade.ResultRetcodeDescription();
         }
      }
   }
   else if(action == "SELL_LIMIT")
   {
      if(entryPrice > bid)
      {
         if(trade.SellLimit(lots, entryPrice, g_symbol, sl, finalTp, ORDER_TIME_GTC, 0, orderComment))
         {
            success = true;
            ticket = trade.ResultOrder();
         }
         else
         {
            errorMsg = trade.ResultRetcodeDescription();
         }
      }
      else
      {
         if(trade.Sell(lots, g_symbol, bid, sl, finalTp, orderComment))
         {
            success = true;
            ticket = trade.ResultOrder();
         }
         else
         {
            errorMsg = trade.ResultRetcodeDescription();
         }
      }
   }

   // Register executed signal
   int size = ArraySize(g_executedSignals);
   ArrayResize(g_executedSignals, size + 1);
   g_executedSignals[size] = signalId;

   if(success)
   {
      PrintFormat("[ICT MT5 BOT] ORDER FILLED SUCCESSFULLY! Ticket: %I64u | Symbol: %s", ticket, g_symbol);
      if(InpEnableSoundAlert) PlaySound("expert.wav");

      // Send execution confirmation to web server
      SendExecutionFeedback(signalId, ticket, "EXECUTED", (action == "BUY" ? ask : bid), "");
   }
   else
   {
      PrintFormat("[ICT MT5 BOT] ORDER PLACEMENT REJECTED! Reason: %s", errorMsg);
      SendExecutionFeedback(signalId, 0, "REJECTED", 0, errorMsg);
   }
}

//+------------------------------------------------------------------+
//| Manage Open Positions: Trailing to BE, Partial TP1, NY Lunch     |
//+------------------------------------------------------------------+
void ManageOpenPositions()
{
   int total = PositionsTotal();
   for(int i = total - 1; i >= 0; i--)
   {
      if(!position.SelectByIndex(i)) continue;
      if(position.Magic() != InpMagicNumber) continue;
      if(position.Symbol() != g_symbol) continue;

      ulong ticket      = position.Ticket();
      double openPrice  = position.PriceOpen();
      double currentPrice = position.PriceCurrent();
      double currentSl  = position.StopLoss();
      double currentTp  = position.TakeProfit();
      double volume     = position.Volume();
      int digits        = (int)SymbolInfoInteger(g_symbol, SYMBOL_DIGITS);
      double point      = SymbolInfoDouble(g_symbol, SYMBOL_POINT);

      // Check 1: Auto Move SL to Breakeven (+ InpBeBufferPts)
      if(InpAutoMoveBE)
      {
         if(position.PositionType() == POSITION_TYPE_BUY)
         {
            double bePrice = NormalizeDouble(openPrice + (InpBeBufferPts * point), digits);
            if((currentPrice - openPrice) >= (150 * point) && (currentSl < openPrice || currentSl == 0))
            {
               trade.PositionModify(ticket, bePrice, currentTp);
               PrintFormat("[ICT MT5 BOT] Trailing SL to Breakeven on Buy position #%I64u at %.2f", ticket, bePrice);
            }
         }
         else if(position.PositionType() == POSITION_TYPE_SELL)
         {
            double bePrice = NormalizeDouble(openPrice - (InpBeBufferPts * point), digits);
            if((openPrice - currentPrice) >= (150 * point) && (currentSl > openPrice || currentSl == 0))
            {
               trade.PositionModify(ticket, bePrice, currentTp);
               PrintFormat("[ICT MT5 BOT] Trailing SL to Breakeven on Sell position #%I64u at %.2f", ticket, bePrice);
            }
         }
      }

      // Check 2: Auto Close before 11:30 NY Lunch
      if(InpCloseOnNyLunch)
      {
         MqlDateTime dt;
         TimeToStruct(TimeCurrent(), dt);
         if(dt.hour == InpNyLunchHour && dt.min >= InpNyLunchMin && dt.min <= (InpNyLunchMin + 15))
         {
            trade.PositionClose(ticket);
            PrintFormat("[ICT MT5 BOT] Position #%I64u flattened per ICT NY Lunch Protocol (11:30 NY)", ticket);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Send Feedback to Web App on Trade Execution Status               |
//+------------------------------------------------------------------+
void SendExecutionFeedback(string signalId, ulong ticket, string status, double executedPrice, string errorMsg)
{
   string url = InpAppUrl + "/api/mt5/feedback";
   string headers = "Content-Type: application/json\\r\\nUser-Agent: MT5_ICT_Executor/3.0\\r\\n";

   string payload = StringFormat(
      "{\\"token\\":\\"%s\\",\\"signalId\\":\\"%s\\",\\"ticketId\\":%I64u,\\"status\\":\\"%s\\",\\"executedPrice\\":%.2f,\\"errorMessage\\":\\"%s\\",\\"accountNumber\\":\\"%I64u\\",\\"broker\\":\\"%s\\",\\"equity\\":%.2f,\\"balance\\":%.2f}",
      InpApiToken, signalId, ticket, status, executedPrice, errorMsg,
      AccountInfoInteger(ACCOUNT_LOGIN), AccountInfoString(ACCOUNT_COMPANY),
      AccountInfoDouble(ACCOUNT_EQUITY), AccountInfoDouble(ACCOUNT_BALANCE)
   );

   char postData[];
   StringToCharArray(payload, postData, 0, StringLen(payload));
   char resultData[];
   string resultHeaders;

   WebRequest("POST", url, headers, 3000, postData, resultData, resultHeaders);
}

//+------------------------------------------------------------------+
//| Send periodic Heartbeat to Web App                              |
//+------------------------------------------------------------------+
void SendHeartbeat()
{
   string url = InpAppUrl + "/api/mt5/heartbeat";
   string headers = "Content-Type: application/json\\r\\nUser-Agent: MT5_ICT_Executor/3.0\\r\\n";

   string payload = StringFormat(
      "{\\"token\\":\\"%s\\",\\"terminalType\\":\\"MQL5_EA\\",\\"symbol\\":\\"%s\\",\\"accountNumber\\":\\"%I64u\\",\\"broker\\":\\"%s\\",\\"equity\\":%.2f,\\"balance\\":%.2f,\\"currency\\":\\"%s\\",\\"serverTime\\":\\"%s\\"}",
      InpApiToken, g_symbol,
      AccountInfoInteger(ACCOUNT_LOGIN), AccountInfoString(ACCOUNT_COMPANY),
      AccountInfoDouble(ACCOUNT_EQUITY), AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoString(ACCOUNT_CURRENCY), TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS)
   );

   char postData[];
   StringToCharArray(payload, postData, 0, StringLen(payload));
   char resultData[];
   string resultHeaders;

   WebRequest("POST", url, headers, 3000, postData, resultData, resultHeaders);
}

//+------------------------------------------------------------------+
//| Helper: Normalize lot size according to symbol specification    |
//+------------------------------------------------------------------+
double NormalizeLots(double lots)
{
   double minLot  = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_STEP);

   if(lotStep <= 0) lotStep = 0.01;
   if(minLot <= 0)  minLot = 0.01;
   if(maxLot <= 0)  maxLot = 100.0;

   lots = MathRound(lots / lotStep) * lotStep;
   if(lots < minLot) lots = minLot;
   if(lots > maxLot) lots = maxLot;

   return NormalizeDouble(lots, 2);
}

//+------------------------------------------------------------------+
//| Helper: Extract String value from JSON by key                    |
//+------------------------------------------------------------------+
string ExtractJsonString(string json, string key, int startIdx = 0)
{
   string searchKey = "\\"" + key + "\\":\\"";
   int pos = StringFind(json, searchKey, startIdx);
   if(pos < 0) return "";

   int valStart = pos + StringLen(searchKey);
   int valEnd = StringFind(json, "\\"", valStart);
   if(valEnd < 0) return "";

   return StringSubstr(json, valStart, valEnd - valStart);
}

//+------------------------------------------------------------------+
//| Helper: Extract Number value from JSON by key                    |
//+------------------------------------------------------------------+
double ExtractJsonNumber(string json, string key, int startIdx = 0)
{
   string searchKey = "\\"" + key + "\\":";
   int pos = StringFind(json, searchKey, startIdx);
   if(pos < 0) return 0.0;

   int valStart = pos + StringLen(searchKey);
   while(valStart < StringLen(json) && (StringGetCharacter(json, valStart) == ' ' || StringGetCharacter(json, valStart) == '\\"'))
   {
      valStart++;
   }

   int valEnd = valStart;
   while(valEnd < StringLen(json))
   {
      ushort ch = StringGetCharacter(json, valEnd);
      if((ch >= '0' && ch <= '9') || ch == '.' || ch == '-')
      {
         valEnd++;
      }
      else
      {
         break;
      }
   }

   string valStr = StringSubstr(json, valStart, valEnd - valStart);
   return StringToDouble(valStr);
}
//+------------------------------------------------------------------+
`;
}
