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
  }
}
initBattery();

// API Key Setup
if (apiKeyCard) {
  apiKeyCard.addEventListener('click', () => {
    const key = prompt("Enter your Google Gemini API Key (starts with AIzaSy...):", apiKey);
    if (key !== null) {
      apiKey = key.trim();
      localStorage.setItem('JARVIS_API_KEY', apiKey);
      alert(apiKey ? "Neural link configured." : "API Key cleared.");
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

// --- HARDWARE & DEVICE PROTOCOLS ---
function triggerCall(target) {
  let num = target.replace(/[^0-9+]/g, '');
  const key = target.toLowerCase().trim();

  if (!num && contacts[key]) {
    num = contacts[key];
  } else if (!num) {
    const ask = prompt(`No phone number saved for "${target}". Enter number:`);
    if (ask) {
      contacts[key] = ask.trim();
      localStorage.setItem('JARVIS_CONTACTS', JSON.stringify(contacts));
      num = ask.trim();
    }
  }

  if (num) {
    window.location.href = `tel:${num}`;
    return `Initiating cellular link to ${target} (${num}), Boss.`;
  }
  return `Aborted. Valid number required for ${target}.`;
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
    return `Hardware error: ${err.message}. Camera permissions required.`;
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

  if (q.startsWith("call ") || q.startsWith("dial ")) {
    const target = q.replace("call ", "").replace("dial ", "").replace("to ", "").trim();
    return triggerCall(target);
  }

  if (q.startsWith("save contact ") || q.startsWith("save number ")) {
    const parts = q.replace("save contact ", "").replace("save number ", "").split(" ");
    if (parts.length >= 2) {
      contacts[parts[0].toLowerCase()] = parts[1];
      localStorage.setItem('JARVIS_CONTACTS', JSON.stringify(contacts));
      return `Contact saved: ${parts[0].toUpperCase()} (${parts[1]}).`;
    }
  }

  if (q.startsWith("send sms to ") || q.startsWith("sms ")) {
    const parts = q.replace("send sms to ", "").replace("sms ", "").split(" ");
    const num = parts[0];
    const msg = parts.slice(1).join(" ");
    window.location.href = `sms:${num}?body=${encodeURIComponent(msg)}`;
    return `Opening SMS interface for ${num}.`;
  }

  if (q.includes("whatsapp")) {
    window.open("https://api.whatsapp.com/send", "_blank");
    return "Launching WhatsApp messaging protocol.";
  }

  if (q.includes("flashlight on") || q.includes("torch on")) return await toggleTorch(true);
  if (q.includes("flashlight off") || q.includes("torch off")) return await toggleTorch(false);

  if (q.includes("where am i") || q.includes("my location") || q.includes("current location")) {
    return await getLiveLocation();
  }

  if (q.startsWith("navigate to ") || q.startsWith("directions to ")) {
    const dest = q.replace("navigate to ", "").replace("directions to ", "");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, "_blank");
    return `Plotting navigation route to ${dest}, Boss.`;
  }

  return null;
}

// --- GEMINI AI WITH RATE-LIMIT HANDLING ---
async function fetchGeminiAI(userPrompt, imagePart) {
  if (!apiKey) {
    return "Sir, please configure your Gemini API Key by tapping the **AI ENGINE** card above.";
  }

  const systemInstruction = "You are J.A.R.V.I.S, Tony Stark's AI assistant. Address the user as 'Boss' or 'Sir'. Provide clear, accurate answers for assignments, math, code, and science using clean Markdown.";

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const parts = [{ text: `${systemInstruction}\n\nQuestion / Directive: ${userPrompt}` }];
  if (imagePart) parts.push(imagePart);

  const requestBody = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (response.status === 429) {
      return "⚠️ **Neural Processor Cooldown**: You have reached the free tier speed limit. Please wait 15–20 seconds before your next question, Boss.";
    }

    if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    return `Diagnostic Alert: ${error.message}`;
  }
}

// --- VOICE OUTPUT (TTS) ---
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

// --- VOICE INPUT ---
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

// --- CHAT DISPATCHER ---
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

  let reply = await handleDeviceActions(text);

  if (reply === null) {
    reply = await fetchGeminiAI(text, currentImage);
  }

  loadingBubble.innerHTML = `<strong>J.A.R.V.I.S:</strong> ` + (typeof marked !== 'undefined' ? marked.parse(reply) : reply);
  if (liveIndicator) liveIndicator.textContent = "LIVE";
  if (chatFeed) chatFeed.scrollTop = chatFeed.scrollHeight;
  
  speakText(reply);
}

if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (userInput) {
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });
    }
