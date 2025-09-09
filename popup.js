// popup.js — communicates with the content script in the active tab

// code that initializes functions
function queryActiveTab() {
return new Promise((resolve) => {
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
resolve(tabs[0]);
});
});
}


async function sendMessageToActiveTab(message) {
  const tab = await queryActiveTab();
  if (!tab || !tab.id) return null;

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, message, (response) => {
      if (chrome.runtime.lastError) {
        // no listener in tab or other error
        console.warn('sendMessage error:', chrome.runtime.lastError.message);
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}



async function updateDisplay() {
  const resp = await sendMessageToActiveTab({ action: 'getSpeed' });
  let speed = 1.0;
  if (resp && resp.speed != null) {
    const n = Number(resp.speed);
    if (Number.isFinite(n)) speed = n;
  }
  // optional clamp
  speed = Math.max(0.1, Math.min(16, speed));
  document.getElementById('speed-display').textContent = speed.toFixed(2) + '×';
}



async function changeSpeed(delta) {
await sendMessageToActiveTab({ action: 'changeSpeed', value : delta });
await updateDisplay();
}

async function setSpeed(delta) {
await sendMessageToActiveTab({ action: 'setSpeed', value : delta });
await updateDisplay();
}

// Code that gets executed
document.addEventListener('DOMContentLoaded', () => {
document.getElementById('increase').addEventListener('click', () => changeSpeed(0.25));
document.getElementById('decrease').addEventListener('click', () => changeSpeed(-0.25));
document.getElementById('speed-display').addEventListener('click', () => setSpeed(1.00));
updateDisplay();
});