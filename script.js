const chatFeed = document.getElementById('chatFeed');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const apiKeyCard = document.getElementById('apiKeyCard');
const engineStatus = document.getElementById('engineStatus');
const liveIndicator = document.getElementById('liveIndicator');

// --- LOCAL STORAGE DATA ---
let apiKey = localStorage.getItem('JARVIS_API_KEY') || '';
let contacts = JSON.parse(localStorage.getItem('JARVIS_CONTACTS') || '{}');
let torchStream = null;

function updateEngineStatus() {
  if (apiKey) {
    if (engineStatus) {
      engineStatus.textContent = 'GEMINI 3.6 FLASH (ONLINE)';
      engineStatus.style.color = '#00f0ff';
    }
  } else {
    if (engineStatus) {
      engineStatus.textContent = 'SET API KEY (TAP HERE)';
      engineStatus.style.color = '#ffaa00';
    }
  }
}
updateEngineStatus();

// API Key Setup
if (apiKeyCard) {
  apiKeyCard.addEventListener('click', () => {
    const userKey = prompt("Enter your Google Gemini API Key (starts with AIzaSy...):", apiKey);
    if (userKey !== null) {
      apiKey = userKey.trim();
      localStorage.setItem('JARVIS_API_KEY', apiKey);
      updateEngineStatus();
      if (apiKey) {
        addMessage("J.A.R.V.I.S", "Neural link established with Gemini. Device bridge active, Boss.", "jarvis-msg");
        speakText("Neural link established with Gemini. Device bridge active, Boss.");
      }
    }
  });
}

// --- HARDWARE & DEVICE CONTROLLER ---

// 1. Phone Call Handler
function triggerCall(target) {
  let number = target.replace(/[^0-9+]/g, '');
  
  // Check saved contacts if no raw number provided
  if (!number) {
    const nameKey = target.toLowerCase().trim();
    if (contacts[nameKey]) {
      number = contacts[nameKey];
    } else {
      const askNumber = prompt(`I don't have a phone number saved for "${target}". Enter number to save:`);
      if (askNumber) {
        contacts[nameKey] = askNumber.trim();
        localStorage.setItem('JARVIS_CONTACTS', JSON.stringify(contacts));
        number = askNumber.trim();
      }
    }
  }

  if (number) {
    window.location.href = `tel:${number}`;
    return `Initiating cellular call to ${target} (${number}), Boss.`;
  }
  return `Cellular link aborted. No valid phone number provided for ${target}.`;
}

// 2. Battery Status
async function getBatteryStatus() {
  if ('getBattery' in navigator) {
    const battery = await navigator.getBattery();
    const level = Math.round(battery.level * 100);
    const charging = battery.charging ? "currently charging" : "discharging";
    return `Main power cell is at ${level}% capacity and ${charging}, Sir.`;
  }
  return "Battery diagnostic telemetry is unavailable on this browser.";
}

// 3. Flashlight / Torch
async function toggleTorch(turnOn) {
  try {
    if (turnOn) {
      torchStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const track = torchStream.getVideoTracks()[0];
      await track.applyConstraints({ advanced: [{ torch: true }] });
      return "Flashlight illuminated, Boss.";
    } else {
      if (torchStream) {
        torchStream.getTracks().forEach(track => track.stop());
        torchStream = null;
      }
      return "Flashlight extinguished, Boss.";
    }
  } catch (err) {
    return `Flashlight control error: ${err.message}. Camera permissions required.`;
  }
}

// 4. Device Vibration Haptic
function triggerVibration() {
  if (navigator.vibrate) {
    navigator.vibrate([150, 80, 150]);
  }
}

// 5. System Intercept Engine
async function executeDeviceActions(text) {
  const q = text.toLowerCase().trim();

  // Call Command: "call my wife", "call 9876543210", "call mom"
  if (q.startsWith("call ") || q.includes("make a call to ")) {
    const target = q.replace("make a call to ", "").replace("call to ", "").replace("call ", "").trim();
    triggerVibration();
    return triggerCall(target);
  }

  // Save Contact: "save contact wife 9876543210"
  if (q.startsWith("save contact ") || q.startsWith("save number ")) {
    const parts = q.replace("save contact ", "").replace("save number ", "").split(" ");
    if (parts.length >= 2) {
      const name = parts[0].toLowerCase();
      const num = parts[1];
      contacts[name] = num;
      localStorage.setItem('JARVIS_CONTACTS', JSON.stringify(contacts));
      return `Contact stored: ${name.toUpperCase()} -> ${num}.`;
    }
    return "Usage format: 'Save contact [name] [phone_number]'";
  }

  // WhatsApp: "open whatsapp", "send whatsapp to ..."
  if (q.includes("whatsapp")) {
    triggerVibration();
    window.open("https://api.whatsapp.com/send", "_blank");
    return "Opening WhatsApp messaging terminal, Boss.";
  }

  // Battery Diagnostic
  if (q.includes("battery") || q.includes("power level") || q.includes("charge")) {
    return await getBatteryStatus();
  }

  // Flashlight Commands
  if (q.includes("turn on flashlight") || q.includes("torch on") || q.includes("light on")) {
    return await toggleTorch(true);
  }
  if (q.includes("turn off flashlight") || q.includes("torch off") || q.includes("light off")) {
    return await toggleTorch(false);
  }

  // Navigation / Maps: "navigate to bangalore", "open maps"
  if (q.startsWith("navigate to ") || q.startsWith("directions to ")) {
    const destination = q.replace("navigate to ", "").replace("directions to ", "");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, "_blank");
    return `Plotting navigation trajectory to ${destination}, Boss.`;
  }

  // Native App Openers
  if (q.includes("open youtube")) {
    window.open("https://www.youtube.com", "_blank");
    return "Accessing YouTube systems, Boss.";
  }
  if (q.includes("open google")) {
    window.open("https://www.google.com", "_blank");
    return "Launching Google search protocols, Boss.";
  }

  return null; // Pass through to Gemini AI
}

// --- GEMINI AI ENGINE (For assignments, coding, chat) ---
async function fetchAIResponse(userPrompt) {
  if (!apiKey) {
    return "Sir, please configure your Gemini API Key first by tapping the **AI ENGINE** card above.";
  }

  const systemInstruction = "You are J.A.R.V.I.S, Tony Stark's personal AI assistant. Address the user as 'Boss' or 'Sir'. Be concise, highly accurate, and proficient at solving school/college assignments, math calculations, coding, and general directives. Format math formulas and code clearly using clean Markdown.";

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nUser: ${userPrompt}` }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || response.statusText);

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    return `Diagnostic Alert: ${error.message}`;
  }
}

// --- VOICE OUTPUT (TTS) ---
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_]/g, '').replace(/J\.A\.R\.V\.I\.S:/g, '').substring(0, 260);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

// --- VOICE INPUT (Speech Recognition) ---
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
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    handleSend();
  };

  recognition.onerror = () => stopMic();
  recognition.onend = () => stopMic();
}

function stopMic() {
  isListening = false;
  if (micBtn) {
    micBtn.style.background = 'linear-gradient(135deg, #00f0ff, #0099aa)';
    micBtn.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.4)';
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

// --- CHAT PROCESSOR ---
function addMessage(sender, text, type) {
  const bubble = document.createElement('div');
  bubble.classList.add('chat-bubble', type);
  
  if (type === 'jarvis-msg' && typeof marked !== 'undefined') {
    bubble.innerHTML = `<strong>${sender}:</strong> ` + marked.parse(text);
  } else {
    bubble.textContent = `${sender}: ${text}`;
  }

  chatFeed.appendChild(bubble);
  chatFeed.scrollTop = chatFeed.scrollHeight;
  return bubble;
}

async function handleSend() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("YOU", text, "user-msg");
  userInput.value = "";

  if (liveIndicator) liveIndicator.textContent = "PROCESSING...";
  const loadingBubble = addMessage("J.A.R.V.I.S", "Executing directive...", "jarvis-msg");

  // Step 1: Check if it's a device hardware command
  const deviceResult = await executeDeviceActions(text);

  let finalReply = "";
  if (deviceResult !== null) {
    finalReply = deviceResult;
  } else {
    // Step 2: Fall back to Gemini AI for general knowledge/assignments
    finalReply = await fetchAIResponse(text);
  }

  loadingBubble.innerHTML = `<strong>J.A.R.V.I.S:</strong> ` + (typeof marked !== 'undefined' ? marked.parse(finalReply) : finalReply);
  if (liveIndicator) liveIndicator.textContent = "LIVE";
  chatFeed.scrollTop = chatFeed.scrollHeight;
  
  speakText(finalReply);
}

if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (userInput) {
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });
}
