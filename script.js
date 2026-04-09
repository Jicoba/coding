const display = document.getElementById("display");
const history = document.getElementById("history");
const keys = document.querySelector(".keys");

let current = "0";
let expression = "";
let justEvaluated = false;

function updateScreen() {
  display.value = current;
  history.textContent = expression;
}

function appendValue(value) {
  if (justEvaluated && /[0-9.]/.test(value)) {
    expression = "";
    current = "0";
    justEvaluated = false;
  }

  if (/[+\-*/%]/.test(value)) {
    if (expression === "" && current !== "0") {
      expression = current + value;
      current = "0";
    } else if (expression !== "") {
      if (/[+\-*/%]$/.test(expression)) {
        expression = expression.slice(0, -1) + value;
      } else {
        expression += current + value;
        current = "0";
      }
    }
    justEvaluated = false;
    updateScreen();
    return;
  }

  if (value === "." && current.includes(".")) {
    return;
  }

  current = current === "0" && value !== "." ? value : current + value;
  updateScreen();
}

function clearAll() {
  current = "0";
  expression = "";
  justEvaluated = false;
  updateScreen();
}

function deleteOne() {
  if (justEvaluated) {
    clearAll();
    return;
  }
  current = current.length <= 1 ? "0" : current.slice(0, -1);
  updateScreen();
}

function evaluateExpression() {
  try {
    const full = expression + current;
    if (!full || /[+\-*/%]$/.test(full)) return;

    const result = Function(`"use strict"; return (${full})`)();
    history.textContent = `${full} =`;
    current = Number.isFinite(result) ? String(result) : "Error";
    expression = "";
    justEvaluated = true;
    display.value = current;
  } catch {
    current = "Error";
    expression = "";
    justEvaluated = true;
    updateScreen();
  }
}

keys.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const value = button.dataset.value;

  if (action === "clear") return clearAll();
  if (action === "delete") return deleteOne();
  if (action === "equals") return evaluateExpression();
  if (value) appendValue(value);
});

window.addEventListener("keydown", (event) => {
  const key = event.key;
  if (/^[0-9]$/.test(key) || ["+", "-", "*", "/", "%", "."].includes(key)) {
    appendValue(key);
  } else if (key === "Enter" || key === "=") {
    event.preventDefault();
    evaluateExpression();
  } else if (key === "Backspace") {
    deleteOne();
  } else if (key === "Escape") {
    clearAll();
  }
});

updateScreen();
