const form = document.getElementById("recommendationForm");
const tickerInput = document.getElementById("tickerInput");
const statusMessage = document.getElementById("statusMessage");
const resultPanel = document.getElementById("resultPanel");
const submitButton = document.getElementById("submitButton");
const recommendationBadge = document.getElementById("recommendationBadge");
const signalContainer = document.getElementById("recentSignals");

const API_BASE_URL = "http://localhost:5001";

const fields = {
  resultTicker: document.getElementById("resultTicker"),
  resultClose: document.getElementById("resultClose"),
  resultProbability: document.getElementById("resultProbability"),
  resultAccuracy: document.getElementById("resultAccuracy"),
  resultStrategy: document.getElementById("resultStrategy"),
  resultBuyHold: document.getElementById("resultBuyHold"),
  resultSharpe: document.getElementById("resultSharpe"),
  resultDrawdown: document.getElementById("resultDrawdown"),
};

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.dataset.type = type || "info";
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Loading..." : "Get recommendation";

  if (isLoading) {
    setStatus("Requesting model recommendation...", "info");
  }
}

function formatNumber(value, digits) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return number.toFixed(digits);
}

function renderSignals(signals) {
  signalContainer.innerHTML = "";

  if (!signals || signals.length === 0) {
    signalContainer.innerHTML = '<div class="empty-state">No recent signals available.</div>';
    return;
  }

  signals.forEach(function (signal) {
    const block = document.createElement("div");

    block.className = "signal-item";
    block.innerHTML = `
      <div class="signal-date">${signal.date}</div>
      <div class="signal-details">
        <div><strong>${signal.decision}</strong> - $${formatNumber(signal.close, 2)}</div>
        <div>Prob up: ${formatNumber(signal.probabilityUp, 3)}</div>
      </div>
      <div class="signal-role">${signal.position === 1 ? "Long" : "Flat"}</div>
    `;

    signalContainer.appendChild(block);
  });
}

function renderResult(data) {
  resultPanel.hidden = false;
  const latestClose = formatNumber(data.latestClose, 2);

  recommendationBadge.textContent = data.recommendation;
  recommendationBadge.dataset.recommendation = data.recommendation;

  fields.resultTicker.textContent = data.ticker || "-";
  fields.resultClose.textContent = latestClose === "-" ? "-" : "$" + latestClose;
  fields.resultProbability.textContent = formatNumber(data.probabilityUp, 3);
  fields.resultAccuracy.textContent = formatNumber(data.accuracy, 3);
  fields.resultStrategy.textContent = formatNumber(data.strategyFinal, 3);
  fields.resultBuyHold.textContent = formatNumber(data.buyHoldFinal, 3);
  fields.resultSharpe.textContent = formatNumber(data.sharpe, 3);
  fields.resultDrawdown.textContent = formatNumber(data.maxDrawdown, 3);

  renderSignals(data.recentSignals);
}

async function fetchRecommendation(params) {
  const query = new URLSearchParams(params).toString();

  try {
    setLoading(true);

    const response = await fetch(API_BASE_URL + "/api/recommend?" + query);
    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(result.error || "Backend error");
    }

    setStatus("Recommendation loaded successfully.", "success");
    renderResult(result);
  } catch (error) {
    setStatus(error.message || "Unable to load recommendation.", "error");
    resultPanel.hidden = true;
  } finally {
    setLoading(false);
  }
}

tickerInput.addEventListener("input", function () {
  tickerInput.value = tickerInput.value.toUpperCase();
});

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const formData = new FormData(form);
  const ticker = formData.get("ticker").trim().toUpperCase();

  if (!ticker || !formData.get("start")) {
    setStatus("Please enter a ticker and start date.", "error");
    return;
  }

  fetchRecommendation({
    ticker: ticker,
    start: formData.get("start"),
    buy_threshold: formData.get("buy_threshold"),
    sell_threshold: formData.get("sell_threshold"),
  });
});
