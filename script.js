const chatFeed = document.getElementById('chatFeed');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');

// --- 1. SPEECH SYNTHESIS (VOICE OUTPUT) ---
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text.replace(/J\.A\.R\.V\.I\.S:/g, ''));
    speech.rate = 1.0;
    speech.pitch = 0.9;
    
    // Pick an English voice if available
    const voices = window.speechSynthesis.getVoices();
    const britishVoice = voices.find(v => v.lang.includes('en-GB') || v.name.includes('UK') || v.name.includes('Male'));
    if (britishVoice) speech.voice = britishVoice;

    window.speechSynthesis.speak(speech);
  }
}

// --- 2. SPEECH RECOGNITION (VOICE INPUT) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;

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

  recognition.onerror = (event) => {
    console.error("Speech Recognition Error: ", event.error);
    stopMic();
  };

  recognition.onend = () => {
    stopMic();
  };
}

function stopMic() {
  isListening = false;
  micBtn.style.background = 'linear-gradient(135deg, #00f0ff, #0099aa)';
  micBtn.style.boxShadow = '0 0 14px rgba(0, 240, 255, 0.5)';
}

micBtn.addEventListener('click', () => {
  if (!recognition) {
    alert("Speech recognition is not supported in this browser. Please use Chrome on Android.");
    return;
  }
  if (!isListening) {
    recognition.start();
  } else {
    recognition.stop();
  }
});

// --- 3. CHAT LOGIC ---
function addMessage(sender, text, type) {
  const bubble = document.createElement('div');
  bubble.classList.add('chat-bubble', type);
  bubble.textContent = `${sender}: ${text}`;
  chatFeed.appendChild(bubble);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function processCommand(query) {
  const q = query.trim().toLowerCase();
  let response = "Systems online. How may I assist you, Boss?";

  if (q.includes("time")) {
    response = `Current system time is ${new Date().toLocaleTimeString()}.`;
  } else if (q.includes("date")) {
    response = `Today's date is ${new Date().toLocaleDateString()}.`;
  } else if (q.includes("status") || q.includes("diagnostic")) {
    response = "All sub-routines functioning at 100% efficiency, Boss.";
  } else if (q.includes("who are you")) {
    response = "I am J.A.R.V.I.S — Just A Rather Very Intelligent System.";
  } else if (q.includes("open google")) {
    window.open("https://www.google.com", "_blank");
    response = "Opening Google for you, Boss.";
  } else if (q.includes("open youtube")) {
    window.open("https://www.youtube.com", "_blank");
    response = "Accessing YouTube systems now.";
  }

  setTimeout(() => {
    addMessage("J.A.R.V.I.S", response, "jarvis-msg");
    speakText(response);
  }, 300);
}

function handleSend() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("YOU", text, "user-msg");
  userInput.value = "";
  processCommand(text);
}

sendBtn.addEventListener('click', handleSend);

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    handleSend();
  }
});
