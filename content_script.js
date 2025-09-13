// content-script.js

const MIN_SPEED = 0.1;
const MAX_SPEED = 16;
let currentSpeed = 1.0;

// Basic typing-element guard
function isTypingElement(el) {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    el.isContentEditable
  );
}

// clamp utility
function clamp(n, min = MIN_SPEED, max = MAX_SPEED) {
  return Math.max(min, Math.min(max, n));
}

// find a sensible video element on the page
function findVideo() {
  // YouTube uses video tags; pick the first visible one
  const videos = Array.from(document.querySelectorAll('video'));
  return videos.find(v => v && v.readyState > 0) || videos[0] || null;
}

// apply speed to the first video found
function applySpeedToVideo(speed) {
  const v = findVideo();
  if (!v) return false;
  v.playbackRate = speed;
  return true;
}

// example setSpeed that returns a Promise
async function setSpeed(value) {
  const n = clamp(Number(value));
  // update state immediately so UI + subsequent calls use new value
  currentSpeed = n;
  const ok = applySpeedToVideo(currentSpeed);
  return ok ? Promise.resolve(currentSpeed) : Promise.reject(new Error('No video found'));
}

// simple persistence using chrome.storage (optional)
function loadSavedSpeed() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['speed'], (res) => {
      resolve(typeof res.speed === 'number' ? res.speed : null);
    });
  });
}





function onKeyDown(e) {
  if (isTypingElement(document.activeElement)) return;

  const key = e.key;
  const code = e.code;
  let handled = false;

  // detect keypress
  if (code === 'NumpadAdd' || (key === '+' || (key === '=' && e.shiftKey))) {
    setSpeed(currentSpeed + 0.25).catch(()=>{});
    handled = true;
  } else if (code === 'NumpadSubtract' || key === '-') {
    setSpeed(currentSpeed - 0.25).catch(()=>{});
    handled = true;
  } else if (code === 'NumpadMultiply' || key === '*') {
    setSpeed(1.00).catch(()=>{});
    handled = true;
  }

  if (handled) {
    e.preventDefault();
    e.stopPropagation();
  }
}



// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;

  if (msg.action === 'getSpeed') {
    sendResponse({ speed: currentSpeed });
  } else if (msg.action === 'changeSpeed') {
    // accept either msg.delta or msg.value for compatibility
    const delta = (typeof msg.delta === 'number') ? msg.delta : msg.value || 0;
    setSpeed(currentSpeed + delta)
      .then(s => sendResponse({ success: true, speed: s }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  } else if (msg.action === 'setSpeed') {
    // accept either msg.delta or msg.value for compatibility
    const delta = (typeof msg.delta === 'number') ? msg.delta : msg.value || 0;
    setSpeed(delta)
      .then(s => sendResponse({ success: true, speed: s }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});


 
// Mutation observer to detect new video elements (YouTube SPA navigation)
const vidObserver = new MutationObserver(() => {
// If the stored speed has been loaded and video exists, re-apply
const v = findVideo();
if (v) {
v.playbackRate = currentSpeed;
}
});


// Initialize: load saved speed, apply to video, add listeners
(async function init() {
const saved = await loadSavedSpeed();
if (typeof saved === 'number') currentSpeed = clamp(saved, MIN_SPEED, MAX_SPEED);
// apply to existing video
applySpeedToVideo(currentSpeed);


// Listen for key presses on the page
window.addEventListener('keydown', onKeyDown, true);


// Observe DOM for video changes
vidObserver.observe(document.documentElement || document.body, { childList: true, subtree: true });
})();