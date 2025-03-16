import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const sendMessage = async (customMessage = null) => {
    const messageToSend = customMessage !== null ? customMessage : input.trim();
    if (!messageToSend) return;

    const newMessages = [...messages, { role: "user", content: messageToSend }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: messageToSend,
      });

      setMessages([
        ...newMessages,
        { role: "bot", content: response.data.reply },
      ]);

      // speak(response.data.reply); // opcional auto-read
    } catch (error) {
      console.error("Error al comunicarse con el backend", error);
      setMessages([
        ...newMessages,
        { role: "bot", content: "Hubo un error al obtener respuesta 😢" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = (text) => {
    setInput(text);
    sendMessage(text);
  };

  const speak = (text) => {
    if (!text) return;

    const synth = window.speechSynthesis;
    const femaleVoices = voices.filter((voice) =>
      (voice.lang === "es-ES" || voice.lang === "es-MX") &&
      (voice.name.toLowerCase().includes("female") ||
        voice.name.toLowerCase().includes("mujer") ||
        voice.name.toLowerCase().includes("natural") ||
        voice.name.toLowerCase().includes("google"))
    );

    const selectedVoice = femaleVoices[0] || voices.find((voice) => voice.lang === "es-ES" || voice.lang === "es-MX");

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice?.lang || "es-ES";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);

    synth.speak(utterance);
  };

  const handleSpeakLastBotMessage = () => {
    const lastBotMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === "bot");

    if (lastBotMessage) {
      speak(lastBotMessage.content);
    } else {
      alert("No hay mensajes del bot para leer.");
    }
  };

  const handleStopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className={`full-screen-container ${darkMode ? "dark" : "light"}`}>
      <header className="main-header">
        <h1 className="header-title">Halo Chatbot</h1>
        <div className="toggle-switch">
          <label className="switch">
            <input
              type="checkbox"
              checked={!darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </header>

      <div className="chat-avatar-layout">
        <div className="chat-window-container">
          <div className="chat-window">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.role === "user" ? "user" : "bot"} message-fade-in`}
              >
                <div className="message-content">{msg.content}</div>
              </div>
            ))}

            {loading && (
              <div className="message bot message-fade-in">
                <div className="message-content typing">Escribiendo...</div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <input
              type="text"
              placeholder="Escribe tu mensaje..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button onClick={() => sendMessage()} disabled={loading}>
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>

          <div className="quick-replies">
            <p>Respuestas rápidas:</p>
            <button onClick={() => handleQuickReply("Hola, ¿Quién eres?")}>Hola, ¿Quién eres?</button>
            <button onClick={() => handleQuickReply("¿Qué es Halo?")}>¿Qué es Halo?</button>
            <button onClick={() => handleQuickReply("Ayuda")}>Ayuda</button>
          </div>
        </div>

        {/* AVATAR + BOTÓN TTS DINÁMICO */}
        <div className={`avatar-container ${loading ? "loading" : ""}`}>
          <img
            src="https://cdn-icons-png.flaticon.com/512/4712/4712100.png"
            alt="Asistente Virtual"
            className="avatar-image"
          />
          <p className="avatar-name">Asistente Virtual</p>

          {/* BOTÓN TTS */}
          <button
            onClick={() => speaking ? handleStopSpeaking() : handleSpeakLastBotMessage()}
            className={`tts-toggle-button ${speaking ? 'mute' : ''}`}
          >
            {speaking ? '🔇 Mutear TTS' : '🔊 Escuchar Bot'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;
