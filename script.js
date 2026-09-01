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
    engineStatus.textContent = 'GEMINI FLASH (ACTIVE)';
    engineStatus.style.color = '#00f0ff';
  } else {
    engineStatus.textContent = 'SET API KEY (TAP HERE)';
    engineStatus.style.color = '#ffaa00';
  }
}
updateEngineStatus();

// API Key setup prompt on tap
apiKeyCard.addEventListener('click', () => {
  const userKey = prompt("Enter your Google Gemini API Key (Get a free key from aistudio.google.com):", apiKey);
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

// --- REAL AI ENGINE (Google Gemini API) ---
async function fetchAIResponse(userPrompt) {
  if (!apiKey) {
    return "Sir, please configure your Gemini API Key first by tapping the **AI ENGINE** card above.";
  }

  const systemInstruction = "You are J.A.R.V.I.S, Tony Stark's highly intelligent AI assistant. Address the user as 'Boss' or 'Sir'. Be concise, highly accurate, and proficient at solving school/college assignments, coding, math, science, and technical problems. Use markdown for code blocks or formulas.";

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: `${systemInstruction}\n\nUser Question: ${userPrompt}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Connection refused.");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    return `Diagnostic Alert: ${error.message}`;
  }
}

// --- VOICE OUTPUT (TTS) ---
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    // Clean markdown symbols before speaking
    const cleanText = text.replace(/[*#`_]/g, '').replace(/J\.A\.R\.V\.I\.S:/g, '').substring(0, 250);
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
    alert("Microphone recognition is not supported in this browser. Use Chrome on Android.");
    return;
  }
  if (!isListening) recognition.start();
  else recognition.stop();
});

// --- CHAT DISPATCHER ---
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
  const loadingBubble = addMessage("J.A.R.V.I.S", "Analyzing request...", "jarvis-msg");

  const aiReply = await fetchAIResponse(text);
  
  // Replace loading message with full AI answer
  loadingBubble.innerHTML = `<strong>J.A.R.V.I.S:</strong> ` + (typeof marked !== 'undefined' ? marked.parse(aiReply) : aiReply);
  liveIndicator.textContent = "LIVE";
  chatFeed.scrollTop = chatFeed.scrollHeight;
  
  speakText(aiReply);
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSend();
});
