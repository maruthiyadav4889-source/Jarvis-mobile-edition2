const chatFeed = document.getElementById('chatFeed');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

// Text-to-Speech Engine
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text.replace('J.A.R.V.I.S:', ''));
    speech.rate = 1.0;
    speech.pitch = 0.9;
    window.speechSynthesis.speak(speech);
  }
}

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
  }

  setTimeout(() => {
    addMessage("J.A.R.V.I.S", response, "jarvis-msg");
    speakText(response);
  }, 350);
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

// Initial scroll position
chatFeed.scrollTop = chatFeed.scrollHeight;
