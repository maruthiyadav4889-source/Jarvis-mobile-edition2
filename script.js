const chatFeed = document.getElementById('chatFeed');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const apiKeyCard = document.getElementById('apiKeyCard');
const engineStatus = document.getElementById('engineStatus');
const batteryDisplay = document.getElementById('batteryDisplay');
const liveIndicator = document.getElementById('liveIndicator');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imageName = document.getElementById('imageName');
const removeImageBtn = document.getElementById('removeImageBtn');

// Storage items
let apiKey = localStorage.getItem('JARVIS_API_KEY') || '';
let contacts = JSON.parse(localStorage.getItem('JARVIS_CONTACTS') || '{}');
let base64ImageAttachment = null;
let torchStream = null;

// Initialize Live Battery Status
async function initBattery() {
  if ('getBattery' in navigator) {
    try {
      const b = await navigator.getBattery();
      const update = () => {
        const level = Math.round(b.level * 100);
        if (batteryDisplay) {
          batteryDisplay.textContent = `${level}% ${b.charging ? '(CHARGING)' : '(ONLINE)'}`;
        }
      };
      update();
      b.addEventListener('levelchange', update);
      b.addEventListener('chargingchange', update);
    } catch (e) {}
  }
}
initBattery();

function updateEngineStatus() {
  if (!engineStatus) return;
  if (apiKey && apiKey.startsWith('AIza')) {
    engineStatus.textContent = 'GEMINI 3.6 FLASH (ONLINE)';
    engineStatus.style.color = '#00f0ff';
  } else {
    engineStatus.textContent = 'TAP TO CONFIGURE';
    engineStatus.style.color = '#ffaa00';
  }
}
updateEngineStatus();

// API Key Setup
if (apiKeyCard) {
  apiKeyCard.addEventListener('click', () => {
    const key = prompt("Enter your Google Gemini API Key (starts with AIzaSy...):", apiKey);
    if (key !== null) {
      apiKey = key.trim();
      localStorage.setItem('JARVIS_API_KEY', apiKey);
      updateEngineStatus();
      if (apiKey) {
        addMessage("J.A.R.V.I.S", "Neural link established with Gemini. Ready for your directives, Boss.", "jarvis-msg");
        speakText("Neural link established with Gemini. Ready for your directives, Boss.");
      }
    }
  });
}

function setPreset(prefix) {
  if (userInput) {
    userInput.value = prefix;
    userInput.focus();
  }
}

// File Attachment Handler
if (attachBtn && fileInput) {
  attachBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      base64ImageAttachment = {
        inlineData: {
          data: reader.result.split(',')[1],
          mimeType: file.type
        }
      };
      if (imageName) imageName.textContent = `Attached: ${file.name.substring(0, 20)}...`;
      if (imagePreviewContainer) imagePreviewContainer.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  });
}

if (removeImageBtn) {
  removeImageBtn.addEventListener('click', () => {
    base64ImageAttachment = null;
    if (fileInput) fileInput.value = '';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
  });
}

// --- 1. INSTANT LOCAL MATH & CALCULATOR (100% Offline) ---
function solveMathExpression(text) {
  let clean = text.toLowerCase()
    .replace(/tell|what is|calculate|solve|evaluate|find|value of/gi, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '')
    .trim();

  // Convert patterns like "21 x 342" to "21 * 342"
  clean = clean.replace(/(\d+)\s*[xX]\s*(\d+)/g, '$1 * $2');

  // Validate math-only characters
  if (/^[\d+\-*/().\s^%]+$/.test(clean) && /\d/.test(clean)) {
    try {
      const sanitized = clean.replace(/\^/g, '**');
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return `Calculation complete, Sir: **${clean.replace(/\*/g, '×')} = ${result.toLocaleString()}**`;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

// --- 2. HARDWARE & DEVICE PROTOCOLS ---
function triggerCall(target) {
  let num = target.replace(/[^0-9+]/g, '');
  const key = target.toLowerCase().trim();

  if (!num && contacts[key]) {
    num = contacts[key];
  } else if (!num) {
    const ask = prompt(`No phone number saved for "${target}". Enter phone number:`);
    if (ask) {
      contacts[key] = ask.trim();
      localStorage.setItem('JARVIS_CONTACTS', JSON.stringify(contacts));
      num = ask.trim();
    }
  }

  if (num) {
    window.location.href = `tel:${num}`;
    return `Initiating call to ${target} (${num}), Boss.`;
  }
  return `Cellular link aborted. Valid number required for ${target}.`;
}

async function toggleTorch(enable) {
  try {
    if (enable) {
      torchStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const track = torchStream.getVideoTracks()[0];
      await track.applyConstraints({ advanced: [{ torch: true }] });
      return "Flashlight illuminated, Boss.";
    } else {
      if (torchStream) {
        torchStream.getTracks().forEach(t => t.stop());
        torchStream = null;
      }
      return "Flashlight extinguished, Boss.";
    }
  } catch (err) {
    return `Hardware error: ${err.message}. Camera permission required.`;
  }
}

function getLiveLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve("Geolocation telemetry is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
        resolve(`Coordinates locked: Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}. Launching maps.`);
      },
      (err) => resolve(`GPS lock failed: ${err.message}`)
    );
  });
}

async function handleDeviceActions(text) {
  const q = text.toLowerCase().trim();

  // Instant local math check first
  const mathOutput = solveMathExpression(text);
  if (mathOutput !== null) return mathOutput;

  // Phone Calling
  if (q.startsWith("call ") || q.startsWith("dial ")) {
    const target = q.replace("call ", "").replace("dial ", "").replace("to ", "").trim();
    return triggerCall(target);
  }

  // Save Contact
  if (q.startsWith("save contact ") || q.startsWith("save number ")) {
    const parts = q.replace("save contact ", "").replace("save number ", "").split(" ");
    if (parts.length >= 2) {
      contacts[parts[0].toLowerCase()] = parts[1];
      localStorage.setItem('JARVIS_CONTACTS', JSON.stringify(contacts));
      return `Contact saved: ${parts[0].toUpperCase()} (${parts[1]}).`;
    }
  }

  // SMS
  if (q.startsWith("send sms to ") || q.startsWith("sms ")) {
    const parts = q.replace("send sms to ", "").replace("sms ", "").split(" ");
    const num = parts[0];
    const msg = parts.slice(1).join(" ");
    window.location.href = `sms:${num}?body=${encodeURIComponent(msg)}`;
    return `Opening SMS interface for ${num}.`;
  }

  // Common Apps & Hardware
  if (q.includes("whatsapp")) {
    window.open("https://api.whatsapp.com/send", "_blank");
    return "Launching WhatsApp messaging protocol.";
  }
  if (q.includes("flashlight on") || q.includes("torch on")) return await toggleTorch(true);
  if (q.includes("flashlight off") || q.includes("torch off")) return await toggleTorch(false);
  if (q.includes("where am i") || q.includes("my location")) return await getLiveLocation();

  if (q.startsWith("navigate to ") || q.startsWith("directions to ")) {
    const dest = q.replace("navigate to ", "").replace("directions to ", "");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, "_blank");
    return `Plotting navigation route to ${dest}, Boss.`;
  }

  return null;
}

// --- 3. GEMINI 3.6 FLASH API ENGINE ---
async function fetchGeminiAI(userPrompt, imagePart) {
  if (!apiKey || !apiKey.startsWith('AIza')) {
    return "Sir, your **AI ENGINE** is not configured yet. Please tap the **AI ENGINE** card above and paste your Gemini API key (starts with `AIzaSy...`) to enable full AI responses.";
  }

  const systemInstruction = "You are J.A.R.V.I.S, Tony Stark's personal AI assistant. Address the user as 'Boss' or 'Sir'. Be concise, highly accurate, and proficient at solving school/college assignments, coding, math, and science. Use clean Markdown.";

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const parts = [{ text: `${systemInstruction}\n\nQuestion: ${userPrompt}` }];
  if (imagePart) parts.push(imagePart);

  const requestBody = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.status === 429) {
      return "⚠️ **Neural Processor Cooldown**: Rate limit reached. Please wait 15 seconds before sending your next request, Boss.";
    }

    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    return "Neural response empty, Sir.";
  } catch (error) {
    if (error.name === 'AbortError') {
      return "Diagnostic Alert: Connection timed out. Please check your mobile data / Wi-Fi network.";
    }
    return `Diagnostic Alert: ${error.message}`;
  }
}

// --- 4. VOICE ENGINE ---
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#`_⚠️]/g, '').replace(/J\.A\.R\.V\.I\.S:/g, '').substring(0, 260);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    if (micBtn) {
      micBtn.style.background = '#ff0055';
      micBtn.style.boxShadow = '0 0 15px #ff0055';
    }
  };

  recognition.onresult = (event) => {
    if (userInput) userInput.value = event.results[0][0].transcript;
    handleSend();
  };

  recognition.onerror = () => stopMic();
  recognition.onend = () => stopMic();
}

function stopMic() {
  isListening = false;
  if (micBtn) {
    micBtn.style.background = 'linear-gradient(135deg, #00f0ff, #0099aa)';
    micBtn.style.boxShadow = '0 0 8px rgba(0, 240, 255, 0.4)';
  }
}

if (micBtn) {
  micBtn.addEventListener('click', () => {
    if (!recognition) {
      alert("Microphone recognition requires Google Chrome on Android.");
      return;
    }
    if (!isListening) recognition.start();
    else recognition.stop();
  });
}

// --- 5. CHAT MESSAGING ---
function addMessage(sender, text, type) {
  const bubble = document.createElement('div');
  bubble.classList.add('chat-bubble', type);
  
  if (type === 'jarvis-msg' && typeof marked !== 'undefined') {
    bubble.innerHTML = `<strong>${sender}:</strong> ` + marked.parse(text);
  } else {
    bubble.textContent = `${sender}: ${text}`;
  }

  if (chatFeed) {
    chatFeed.appendChild(bubble);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }
  return bubble;
}

async function handleSend() {
  const text = userInput ? userInput.value.trim() : "";
  const currentImage = base64ImageAttachment;

  if (!text && !currentImage) return;

  addMessage("YOU", text + (currentImage ? " [Attachment sent]" : ""), "user-msg");
  if (userInput) userInput.value = "";
  
  base64ImageAttachment = null;
  if (fileInput) fileInput.value = '';
  if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';

  if (liveIndicator) liveIndicator.textContent = "PROCESSING...";
  const loadingBubble = addMessage("J.A.R.V.I.S", "Executing directive...", "jarvis-msg");

  let reply = null;

  try {
    // Check local device commands / offline math first
    reply = await handleDeviceActions(text);

    // Fall back to Gemini API only if it's not a local device command or simple math
    if (reply === null) {
      reply = await fetchGeminiAI(text, currentImage);
    }
  } catch (err) {
    reply = `System Error: ${err.message}`;
  } finally {
    if (liveIndicator) liveIndicator.textContent = "LIVE";
  }

  loadingBubble.innerHTML = `<strong>J.A.R.V.I.S:</strong> ` + (typeof marked !== 'undefined' ? marked.parse(reply) : reply);
  if (chatFeed) chatFeed.scrollTop = chatFeed.scrollHeight;
  
  speakText(reply);
}

if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (userInput) {
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });
    }
    
