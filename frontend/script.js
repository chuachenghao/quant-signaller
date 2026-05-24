const form = document.getElementById("recommendationForm");
const statusMessage = document.getElementById("statusMessage");
const resultPanel = document.getElementById("resultPanel");
const submitButton = document.getElementById("submitButton");
const recommendationBadge = document.getElementById("recommendationBadge");

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

const signalContainer = document.getElementById("recentSignals");

function setStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.dataset.type = type;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Loading..." : "Get recommendation";
  if (isLoading) {
    setStatus("Requesting model recommendation…", "info");
  }
}

function formatNumber(value, digits = 4) {
  return value === null || value === undefined ? "—" : Number(value).toFixed(digits);
}

function renderSignals(signals) {
  signalContainer.innerHTML = "";

  if (!signals || signals.length === 0) {
    signalContainer.innerHTML = "<div class=\"empty-state\">No recent signals available.</div>";
    return;
  }

  signals.forEach((signal) => {
    const block = document.createElement("div");
    block.className = "signal-item";
    block.innerHTML = `
      <div class="signal-date">${signal.date}</div>
      <div class="signal-details">
        <div><strong>${signal.decision}</strong> · ${signal.close}</div>
        <div>Prob up: ${formatNumber(signal.probabilityUp, 3)}</div>
      </div>
      <div class="signal-role">${signal.position === 1 ? "Long" : "Flat"}</div>
    `;
    signalContainer.appendChild(block);
  });
}

function renderResult(data) {
  resultPanel.hidden = false;
  recommendationBadge.textContent = data.recommendation;
  recommendationBadge.dataset.recommendation = data.recommendation;

  fields.resultTicker.textContent = data.ticker || "—";
  fields.resultClose.textContent = data.latestClose ? `$${formatNumber(data.latestClose, 2)}` : "—";
  fields.resultProbability.textContent = data.probabilityUp ? `${formatNumber(data.probabilityUp, 3)}` : "—";
  fields.resultAccuracy.textContent = data.accuracy ? `${formatNumber(data.accuracy, 3)}` : "—";
  fields.resultStrategy.textContent = data.strategyFinal ? `${formatNumber(data.strategyFinal, 3)}` : "—";
  fields.resultBuyHold.textContent = data.buyHoldFinal ? `${formatNumber(data.buyHoldFinal, 3)}` : "—";
  fields.resultSharpe.textContent = data.sharpe ? `${formatNumber(data.sharpe, 3)}` : "—";
  fields.resultDrawdown.textContent = data.maxDrawdown ? `${formatNumber(data.maxDrawdown, 3)}` : "—";

  renderSignals(data.recentSignals);
}

async function fetchRecommendation(params) {
  const query = new URLSearchParams(params).toString();

  try {
    setLoading(true);
    const response = await fetch(`/api/recommend?${query}`);
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

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const params = {
    ticker: formData.get("ticker").trim().toUpperCase(),
    start: formData.get("start"),
    buy_threshold: formData.get("buy_threshold"),
    sell_threshold: formData.get("sell_threshold"),
  };

  if (!params.ticker || !params.start) {
    setStatus("Please enter a valid ticker and start date.", "error");
    return;
  }

  fetchRecommendation(params);
});
