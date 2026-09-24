#!/usr/bin/env python3
"""
=============================================================================
ICT XAUUSD METATRADER 5 BRIDGE BOT
Author: ICT 2024 Mentorship Algorithmic Analyst
Website: https://ai.google.dev
Requirements: pip install MetaTrader5 requests
=============================================================================
This bot connects directly to your MetaTrader 5 terminal via the official
MetaTrader5 Python API, polls the ICT Web App for active trade setups,
and executes trades automatically with institutional precision.
"""

import sys
import time
import json
import argparse
from datetime import datetime
import requests

try:
    import MetaTrader5 as mt5
except ImportError:
    print("[ERROR] MetaTrader5 package is not installed.")
    print("Please install it using: pip install MetaTrader5 requests")
    sys.exit(1)

# Default Configurations
DEFAULT_APP_URL = "http://localhost:3000"
DEFAULT_API_TOKEN = "ict_secret_token"
MAGIC_NUMBER = 20241001
MAX_SLIPPAGE = 50  # 50 points = $0.50 on Gold


def find_gold_symbol():
    """Auto-detects broker's gold symbol name."""
    candidates = ["XAUUSD", "GOLD", "XAUUSDm", "XAUUSD.m", "XAUUSD+", "XAUUSD_i", "PAXGUSDT"]
    for sym in candidates:
        info = mt5.symbol_info(sym)
        if info is not None:
            if not info.visible:
                mt5.symbol_select(sym, True)
            return sym
    return "XAUUSD"


def send_heartbeat(app_url, token, symbol):
    """Sends terminal connection status and account metrics to the app."""
    try:
        acc_info = mt5.account_info()
        if acc_info is None:
            return

        payload = {
            "token": token,
            "terminalType": "PYTHON_BRIDGE",
            "symbol": symbol,
            "accountNumber": str(acc_info.login),
            "broker": acc_info.company,
            "equity": acc_info.equity,
            "balance": acc_info.balance,
            "currency": acc_info.currency,
            "serverTime": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        }
        requests.post(f"{app_url}/api/mt5/heartbeat", json=payload, timeout=3)
    except Exception as e:
        pass


def execute_order(app_url, token, symbol, signal):
    """Executes market or pending order via MetaTrader 5 Python API."""
    signal_id = signal.get("id")
    action = signal.get("action", "").upper()
    entry_price = float(signal.get("entryPrice", 0.0))
    sl = float(signal.get("stopLoss", 0.0))
    tp1 = float(signal.get("takeProfit1", 0.0))
    tp2 = float(signal.get("takeProfit2", 0.0))
    lots = float(signal.get("lots", 0.10))
    comment = signal.get("comment", f"ICT:{signal_id}")[:31]

    tp = tp2 if tp2 > 0 else tp1

    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        print(f"[ERROR] Symbol {symbol} not found on broker.")
        return

    # Check spread and point
    point = symbol_info.point
    digits = symbol_info.digits
    ask = mt5.symbol_info_tick(symbol).ask
    bid = mt5.symbol_info_tick(symbol).bid

    # Normalize values
    entry_price = round(entry_price, digits)
    sl = round(sl, digits)
    tp = round(tp, digits)
    lots = max(symbol_info.volume_min, min(symbol_info.volume_max, round(lots, 2)))

    # Determine order type
    order_type = None
    price = 0.0

    if action == "BUY":
        order_type = mt5.ORDER_TYPE_BUY
        price = ask
    elif action == "SELL":
        order_type = mt5.ORDER_TYPE_SELL
        price = bid
    elif action == "BUY_LIMIT":
        if abs(ask - entry_price) <= (point * MAX_SLIPPAGE):
            order_type = mt5.ORDER_TYPE_BUY
            price = ask
        elif entry_price < ask:
            order_type = mt5.ORDER_TYPE_BUY_LIMIT
            price = entry_price
        else:
            order_type = mt5.ORDER_TYPE_BUY
            price = ask
    elif action == "SELL_LIMIT":
        if abs(bid - entry_price) <= (point * MAX_SLIPPAGE):
            order_type = mt5.ORDER_TYPE_SELL
            price = bid
        elif entry_price > bid:
            order_type = mt5.ORDER_TYPE_SELL_LIMIT
            price = entry_price
        else:
            order_type = mt5.ORDER_TYPE_SELL
            price = bid
    else:
        print(f"[WARN] Unknown order action: {action}")
        return

    request = {
        "action": mt5.TRADE_ACTION_PENDING if "LIMIT" in action and abs(price - entry_price) > 0.01 else mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": lots,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": MAX_SLIPPAGE,
        "magic": MAGIC_NUMBER,
        "comment": comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    print(f"\n[ICT MT5 BOT] >>> SENDING ORDER: {action} {lots} lots on {symbol} @ {price} | SL: {sl} | TP: {tp}")
    result = mt5.order_send(request)

    if result is None:
        error_code = mt5.last_error()
        print(f"[ERROR] Order send failed. Code: {error_code}")
        send_feedback(app_url, token, signal_id, 0, "REJECTED", 0, str(error_code))
        return

    if result.retcode != mt5.TRADE_RETCODE_DONE:
        print(f"[REJECTED] MT5 Retcode: {result.retcode} ({result.comment})")
        send_feedback(app_url, token, signal_id, 0, "REJECTED", 0, result.comment)
    else:
        ticket = result.order
        executed_price = result.price if result.price > 0 else price
        print(f"[SUCCESS] >>> ORDER EXECUTED! Ticket: #{ticket} @ {executed_price}")
        send_feedback(app_url, token, signal_id, ticket, "EXECUTED", executed_price, "")


def send_feedback(app_url, token, signal_id, ticket, status, executed_price, error_msg):
    """Sends execution results back to the web application."""
    try:
        acc_info = mt5.account_info()
        payload = {
            "token": token,
            "signalId": signal_id,
            "ticketId": ticket,
            "status": status,
            "executedPrice": executed_price,
            "errorMessage": error_msg,
            "accountNumber": str(acc_info.login) if acc_info else "",
            "broker": acc_info.company if acc_info else "",
            "equity": acc_info.equity if acc_info else 0,
            "balance": acc_info.balance if acc_info else 0,
        }
        requests.post(f"{app_url}/api/mt5/feedback", json=payload, timeout=3)
    except Exception as e:
        print(f"[WARN] Failed to send feedback to app: {e}")


def main():
    parser = argparse.ArgumentParser(description="ICT XAUUSD MetaTrader 5 Bridge Bot")
    parser.add_argument("--url", default=DEFAULT_APP_URL, help="App Server URL (default: http://localhost:3000)")
    parser.add_argument("--token", default=DEFAULT_API_TOKEN, help="Auth Token")
    parser.add_argument("--symbol", default="", help="Override Symbol Name")
    parser.add_argument("--poll", type=int, default=2, help="Poll interval in seconds")
    args = parser.parse_args()

    print("=" * 70)
    print("ICT XAUUSD METATRADER 5 BRIDGE BOT")
    print("=" * 70)

    # Initialize MT5
    if not mt5.initialize():
        print(f"[FATAL] Failed to connect to MetaTrader 5 terminal. Error: {mt5.last_error()}")
        print("Please ensure your MetaTrader 5 desktop client is running and logged into your broker.")
        sys.exit(1)

    terminal_info = mt5.terminal_info()
    account_info = mt5.account_info()

    target_symbol = args.symbol if args.symbol else find_gold_symbol()

    print(f"Connected to MT5 Terminal: {terminal_info.name} v{terminal_info.version}")
    print(f"Broker: {account_info.company} | Account: {account_info.login} | Currency: {account_info.currency}")
    print(f"Balance: ${account_info.balance:,.2f} | Equity: ${account_info.equity:,.2f}")
    print(f"Target Gold Symbol: {target_symbol}")
    print(f"Polling App URL: {args.url}/api/mt5/signals every {args.poll}s")
    print("=" * 70)
    print("[RUNNING] Listening for Institutional Setups from Web App. Press Ctrl+C to stop.\n")

    executed_ids = set()
    last_heartbeat_time = 0

    try:
        while True:
            now = time.time()

            # Heartbeat every 15s
            if now - last_heartbeat_time >= 15:
                send_heartbeat(args.url, args.token, target_symbol)
                last_heartbeat_time = now

            # Poll API for signals
            try:
                res = requests.get(f"{args.url}/api/mt5/signals?token={args.token}&symbol={target_symbol}", timeout=3)
                if res.status_code == 200:
                    data = res.json()
                    signals = data.get("signals", [])
                    for sig in signals:
                        sig_id = sig.get("id")
                        sig_status = sig.get("status")
                        if sig_status == "PENDING" and sig_id not in executed_ids:
                            executed_ids.add(sig_id)
                            execute_order(args.url, args.token, target_symbol, sig)
            except requests.exceptions.RequestException:
                pass

            time.sleep(args.poll)

    except KeyboardInterrupt:
        print("\n[STOPPED] Bot terminated by user.")
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    main()
