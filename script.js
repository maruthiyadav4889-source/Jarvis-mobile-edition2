const chatFeed = document.getElementById('chatFeed');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const apiKeyCard = document.getElementById('apiKeyCard');
const engineStatus = document.getElementById('engineStatus');
const liveIndicator = document.getElementById('liveIndicator');

// Retrieve stored Gemini API Key
let apiKey = localStorage.getItem('JARVIS_API_KEY') || '';

function updateEngineStatus() {
  if (apiKey) {
    engineStatus.textContent = 'NEURAL ENGINE (READY)';
    engineStatus.style.color = '#00f0ff';
  } else {
    engineStatus.textContent = 'SET API KEY (TAP HERE)';
    engineStatus.style.color = '#ffaa00';
  }
}
updateEngineStatus();

// API Key Setup Prompt
apiKeyCard.addEventListener('click', () => {
  const userKey = prompt("Enter your Google Gemini API Key:", apiKey);
  if (userKey !== null) {
    apiKey = userKey.trim();
    localStorage.setItem('JARVIS_API_KEY', apiKey);
    updateEngineStatus();
    if (apiKey) {
      addMessage("J.A.R.V.I.S", "Neural link established. AI Engine is ready for your commands, Boss.", "jarvis-msg");
      speakText("Neural link established. AI Engine is ready for your commands, Boss.");
    }
  }
});

// --- ROBUST AI ENGINE WITH AUTO-FALLBACK ---
async function fetchAIResponse(userPrompt) {
  if (!apiKey) {
    return "Sir, please configure your Gemini API Key first by tapping the **AI ENGINE** card above.";
  }

  const systemInstruction = "You are J.A.R.V.I.S, Tony Stark's personal AI assistant. Address the user as 'Boss' or 'Sir'. Be concise, highly accurate, and proficient at solving school/college assignments, coding, mathematics, science, and technical problems. Use clean Markdown for code blocks or formulas.";

  // List of active model endpoints to try in order
  const models = [
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.5-flash",
    "gemini-1.5-pro"
  ];

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemInstruction}\n\nUser Query: ${userPrompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000
    }
  };

  let lastError = "";

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
      } else {
        const errData = await response.json();
        lastError = errData.error?.message || response.statusText;
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  return `Diagnostic Alert: Unable to reach neural core. ${lastError}`;
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
    micBtn.style.background = '#ff0055';
    micBtn.style.boxShadow = '0 0 15px #ff0055';
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
  micBtn.style.background = 'linear-gradient(135deg, #00f0ff, #0099aa)';
  micBtn.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.4)';
}

micBtn.addEventListener('click', () => {
  if (!recognition) {
    alert("Microphone recognition requires Chrome on Android.");
    return;
  }
  if (!isListening) recognition.start();
  else recognition.stop();
});

// --- CHAT LOGIC ---
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

  liveIndicator.textContent = "PROCESSING...";
  const loadingBubble = addMessage("J.A.R.V.I.S", "Analyzing directive...", "jarvis-msg");

  const aiReply = await fetchAIResponse(text);
  
  loadingBubble.innerHTML = `<strong>J.A.R.V.I.S:</strong> ` + (typeof marked !== 'undefined' ? marked.parse(aiReply) : aiReply);
  liveIndicator.textContent = "LIVE";
  chatFeed.scrollTop = chatFeed.scrollHeight;
  
  speakText(aiReply);
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSend();
});
