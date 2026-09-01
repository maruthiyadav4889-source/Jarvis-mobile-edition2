const chatFeed = document.getElementById('chatFeed');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const apiKeyCard = document.getElementById('apiKeyCard');
const engineStatus = document.getElementById('engineStatus');
const liveIndicator = document.getElementById('liveIndicator');

let apiKey = localStorage.getItem('JARVIS_API_KEY') || '';
let activeModelName = null;

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
  const userKey = prompt("Enter your Google Gemini API Key (from aistudio.google.com):", apiKey);
  if (userKey !== null) {
    apiKey = userKey.trim();
    localStorage.setItem('JARVIS_API_KEY', apiKey);
    activeModelName = null; // reset cached model
    updateEngineStatus();
    if (apiKey) {
      addMessage("J.A.R.V.I.S", "Neural link established. Scanning available AI models...", "jarvis-msg");
      speakText("Neural link established. Scanning available AI models.");
    }
  }
});

// 1. AUTO-DETECT ACTIVE MODEL FROM GOOGLE
async function detectBestModel(key) {
  if (activeModelName) return activeModelName;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();

    if (data.models && data.models.length > 0) {
      // Find models that support generateContent
      const usableModels = data.models.filter(m => 
        m.supportedGenerationMethods && 
        m.supportedGenerationMethods.includes('generateContent')
      );

      // Prioritize flash models, then pro, then any available
      const best = usableModels.find(m => m.name.includes('flash')) || 
                   usableModels.find(m => m.name.includes('gemini')) || 
                   usableModels[0];

      if (best) {
        activeModelName = best.name; // e.g. "models/gemini-2.0-flash"
        return activeModelName;
      }
    }
  } catch (e) {
    console.warn("Auto-detect failed, using default:", e);
  }

  // Safe fallback
  activeModelName = "models/gemini-2.0-flash";
  return activeModelName;
}

// 2. AI GENERATION ENGINE
async function fetchAIResponse(userPrompt) {
  if (!apiKey) {
    return "Sir, please configure your Gemini API Key first by tapping the **AI ENGINE** card above.";
  }

  const modelPath = await detectBestModel(apiKey);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;

  const systemInstruction = "You are J.A.R.V.I.S, Tony Stark's personal AI assistant. Address the user as 'Boss' or 'Sir'. Be concise, highly accurate, and proficient at solving assignments, coding, mathematics, science, and general queries. Use markdown for code and formatting.";

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemInstruction}\n\nUser: ${userPrompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      // Fallback: If 404, try legacy direct call
      if (response.status === 404) {
        return await fallbackDirectCall(userPrompt);
      }
      throw new Error(data.error?.message || response.statusText);
    }

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Empty response received from AI model.");
    }

  } catch (error) {
    return `Diagnostic Alert: ${error.message}`;
  }
}

// Direct backup fallback
async function fallbackDirectCall(userPrompt) {
  try {
    const backupUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(backupUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }]
      })
    });
    const d = await res.json();
    return d.candidates[0].content.parts[0].text;
  } catch (err) {
    return `Diagnostic Alert: Unable to connect. Please verify your API key at aistudio.google.com`;
  }
}

// 3. VOICE OUTPUT (TTS)
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

// 4. VOICE INPUT (Speech Recognition)
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

// 5. CHAT MESSAGING
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

