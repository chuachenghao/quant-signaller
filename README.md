# Quant Signaller

A machine learning-based trading signal recommendation system that analyzes historical stock data and provides buy/sell/hold recommendations.

## Features

- Machine learning model using Random Forest classifier
- Technical analysis features (RSI, moving averages, volatility)
- Backtesting with transaction costs
- Sharpe ratio and max drawdown calculations
- Web interface for easy interaction
- Real-time stock data from Yahoo Finance

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

### Frontend Setup

No build step required. The frontend is plain HTML, CSS, and JavaScript.

## Running the Application

### Start the Backend

From the backend directory:
```bash
python app.py
```

The server will run on `http://localhost:5001`

### Open the Frontend

Open `frontend/index.html` in your web browser or serve it with a simple HTTP server:

```bash
cd frontend
python -m http.server 8000
```

Then visit `http://localhost:8000`

## Usage

1. Enter a stock ticker symbol (e.g., SPY, AAPL, TSLA)
2. Select a start date for historical analysis
3. Adjust buy/sell thresholds if desired
4. Click "Get recommendation"
5. View the trading recommendation and performance metrics

## How It Works

### Data Collection
- Downloads historical price data using Yahoo Finance
- Extracts OHLCV (Open, High, Low, Close, Volume) data

### Feature Engineering
- **Returns**: 1-day, 5-day, 10-day percentage changes
- **Moving Averages**: 10-day and 50-day ratios
- **Volatility**: 10-day and 20-day rolling standard deviation
- **Volume Change**: Day-to-day volume percentage change
- **RSI**: 14-day Relative Strength Index

### Model Training
- Splits data into 70% training and 30% test sets
- Trains Random Forest classifier with 200 estimators
- Generates probability predictions for upward movements

### Backtesting
- Simulates trades based on probability thresholds
- Accounts for transaction costs (0.1%)
- Calculates strategy cumulative returns vs buy-and-hold

### Performance Metrics
- **Accuracy**: Model correctness on test data
- **Sharpe Ratio**: Risk-adjusted returns (252 trading days)
- **Max Drawdown**: Largest peak-to-trough decline
- **Probability Up**: Likelihood of next day's price increase
