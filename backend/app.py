from flask import Flask, request, jsonify
from flask_cors import CORS

from quant_engine import run_model

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return {"message": "Quant Signaller backend is running"}

@app.route("/api/recommend")
def recommend():
    try:
        ticker = request.args.get("ticker", "SPY")
        start = request.args.get("start", "2020-01-01")
        buy_threshold = float(request.args.get("buy_threshold", 0.55))
        sell_threshold = float(request.args.get("sell_threshold", 0.45))

        result = run_model(
            ticker=ticker,
            start=start,
            buy_threshold=buy_threshold,
            sell_threshold=sell_threshold
        )

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True, port=5001)
