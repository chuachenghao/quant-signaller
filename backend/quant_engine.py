import yfinance as yf
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

FEATURES = [
    "return_1d",
    "return_5d",
    "return_10d",
    "ma_ratio",
    "volatility_10d",
    "volatility_20d",
    "volume_change",
    "rsi",
]

def download_data(ticker, start):
    data = yf.download(ticker, start=start, progress=False)

    if data.empty:
        raise ValueError("No data found for ticker")
    
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    data = data[["Open", "High", "Low", "Close", "Volume"]]
    data = data.dropna()

    return data

def add_features(data):
    df = data.copy()

    df["return_1d"] = df["Close"].pct_change()
    df["return_5d"] = df["Close"].pct_change(5)
    df["return_10d"] = df["Close"].pct_change(10)

    df["ma_10"] = df["Close"].rolling(10).mean()
    df["ma_50"] = df["Close"].rolling(50).mean()
    df["ma_ratio"] = df["ma_10"] / df["ma_50"]

    df["volatility_10d"] = df["return_1d"].rolling(10).std()
    df["volatility_20d"] = df["return_1d"].rolling(20).std()

    df["volume_change"] = df["Volume"].pct_change()

    delta = df["Close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()

    rs = avg_gain / avg_loss
    df["rsi"] = 100 - (100 / (1 + rs))

    df["future_return"] = df["Close"].pct_change().shift(-1)
    df["target"] = (df["future_return"] > 0).astype(float)

    df = df.dropna(subset=FEATURES)

    return df

def get_decision(probability_up, buy_threshold, sell_threshold):
    if probability_up >= buy_threshold:
        return "BUY"
    elif probability_up <= sell_threshold:
        return "SELL"
    else:
        return "HOLD"

def backtest(test_df, buy_threshold, sell_threshold):
    df = test_df.copy()

    df["decision"] = df["probability_up"].apply(
        lambda p: get_decision(p, buy_threshold, sell_threshold)
    )

    position = 0
    positions = []

    for decision in df["decision"]:
        if decision == "BUY":
            position = 1
        elif decision == "SELL":
            position = 0

        positions.append(position)

    df["position"] = positions

    transaction_cost = 0.001
    df["trade"] = df["position"].diff().abs().fillna(0)

    df["strategy_return"] = (
        df["position"] * df["future_return"]
        - df["trade"] * transaction_cost
    )

    df["buy_hold_return"] = df["future_return"]

    df["strategy_cumulative"] = (1 + df["strategy_return"]).cumprod()
    df["buy_hold_cumulative"] = (1 + df["buy_hold_return"]).cumprod()

    return df

def sharpe_ratio(returns):
    if returns.std() == 0:
        return 0

    return np.sqrt(252) * returns.mean() / returns.std()


def max_drawdown(cumulative_returns):
    running_max = cumulative_returns.cummax()
    drawdown = cumulative_returns / running_max - 1

    return drawdown.min()

def run_model(
    ticker="SPY",
    start="2020-01-01",
    buy_threshold=0.55,
    sell_threshold=0.45
):
    data = download_data(ticker, start)
    df = add_features(data)

    labelled_df = df.dropna(subset=["future_return", "target"])

    if len(labelled_df) < 200:
        raise ValueError("Not enough data")

    split_index = int(len(labelled_df) * 0.7)

    train_df = labelled_df.iloc[:split_index]
    test_df = labelled_df.iloc[split_index:].copy()

    X_train = train_df[FEATURES]
    y_train = train_df["target"].astype(int)

    X_test = test_df[FEATURES]
    y_test = test_df["target"].astype(int)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=5,
        random_state=42
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    probabilities = model.predict_proba(X_test)[:, 1]

    test_df["prediction"] = predictions
    test_df["probability_up"] = probabilities

    accuracy = accuracy_score(y_test, predictions)

    backtest_df = backtest(
        test_df,
        buy_threshold,
        sell_threshold
    )

    latest_row = df.iloc[-1]
    latest_features = latest_row[FEATURES].to_frame().T

    latest_probability = model.predict_proba(latest_features)[0][1]

    latest_decision = get_decision(
        latest_probability,
        buy_threshold,
        sell_threshold
    )

    recent_signals = []

    for date, row in backtest_df.tail(10).iterrows():
        recent_signals.append({
            "date": str(date.date()),
            "close": round(float(row["Close"]), 2),
            "probabilityUp": round(float(row["probability_up"]), 4),
            "decision": row["decision"],
            "position": int(row["position"]),
        })

    equity_curve = []

    for date, row in backtest_df.tail(250).iterrows():
        equity_curve.append({
            "date": str(date.date()),
            "strategy": round(float(row["strategy_cumulative"]), 4),
            "buyHold": round(float(row["buy_hold_cumulative"]), 4),
        })

    result = {
        "ticker": ticker.upper(),
        "latestDate": str(df.index[-1].date()),
        "latestClose": round(float(df["Close"].iloc[-1]), 2),
        "recommendation": latest_decision,
        "probabilityUp": round(float(latest_probability), 4),
        "accuracy": round(float(accuracy), 4),
        "strategyFinal": round(float(backtest_df["strategy_cumulative"].iloc[-1]), 4),
        "buyHoldFinal": round(float(backtest_df["buy_hold_cumulative"].iloc[-1]), 4),
        "sharpe": round(float(sharpe_ratio(backtest_df["strategy_return"])), 4),
        "maxDrawdown": round(float(max_drawdown(backtest_df["strategy_cumulative"])), 4),
        "recentSignals": recent_signals,
        "equityCurve": equity_curve,
    }

    return result