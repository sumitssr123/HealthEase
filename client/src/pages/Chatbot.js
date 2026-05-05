import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import axios from "axios";
import { message } from "antd";

const Chatbot = () => {
    const [isListening, setIsListening] = useState(false);
    const [chatDisplay, setChatDisplay] = useState([]);
    
    // 🟢 Refs: Inse AI tumhari baatein bhulega nahi aur wait karega
    const chatHistoryRef = useRef([]);
    const recognitionRef = useRef(null);
    const synthVoicesRef = useRef([]);
    const transcriptRef = useRef("");
    const timeoutRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const r = new SpeechRecognition();
        
        r.continuous = true; // 🟢 Ab saans lene par ya rukne par mic band nahi hoga
        r.interimResults = false;
        r.lang = 'en-US';

        r.onresult = (event) => {
            // Jo bhi tumne naya bola, usko pichli baat ke sath jod do
            const currentTranscript = event.results[event.results.length - 1][0].transcript;
            transcriptRef.current += currentTranscript + " ";

            // 🟢 2-Second Silence Detector
            clearTimeout(timeoutRef.current); // Purana timer hatao
            timeoutRef.current = setTimeout(async () => {
                // Agar 2 second tak ekdum shanti rahi, tab message send hoga
                r.stop();
                const finalText = transcriptRef.current.trim();
                
                if (finalText) {
                    setChatDisplay(prev => [...prev, { role: "Patient", text: finalText }]);
                    setIsListening(false);
                    await callGemini(finalText);
                }
                transcriptRef.current = ""; // Agli baat ke liye clear kar do
            }, 1000); // 2000ms = 2 seconds ka intezaar
        };

        r.onend = () => setIsListening(false);
        recognitionRef.current = r;

        const loadVoices = () => {
            synthVoicesRef.current = window.speechSynthesis.getVoices();
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const speak = (text) => {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[^a-zA-Z0-9.,?' ]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.pitch = 1.05;
        utterance.rate = 1.0;

        const voiceRankings = ["Aria", "Samantha", "Google UK English Female", "Microsoft Zira", "Jenny"];
        let selectedVoice = null;
        for (let target of voiceRankings) {
            selectedVoice = synthVoicesRef.current.find(v => v.name.includes(target));
            if (selectedVoice) break;
        }

        if (selectedVoice) utterance.voice = selectedVoice;
        window.speechSynthesis.speak(utterance);
    };

    const callGemini = async (text) => {
        let currentHistory = [...chatHistoryRef.current];
        currentHistory.push({ role: "user", parts: [{ text }] });

        try {
            const res = await axios.post("/api/v1/chatbot/chat", { chatHistory: currentHistory }, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            
            if (res.data.success) {
                const reply = res.data.reply;
                setChatDisplay(prev => [...prev, { role: "AI Doctor", text: reply }]);
                
                currentHistory.push({ role: "model", parts: [{ text: reply }] });
                chatHistoryRef.current = currentHistory.slice(-10); // Pichli 10 baatein yaad rakhega
                
                speak(reply);
            }
        } catch (e) {
            message.error("Connection lost");
        }
    };

    const handleStart = () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        transcriptRef.current = ""; 
        setIsListening(true);
        recognitionRef.current.start();
    };

    return (
        <Layout>
            <div className="container mt-4" style={{ maxWidth: '600px' }}>
                <h2 className="text-center mb-4" style={{color: '#2c3e50'}}>🩺 Dr. AI Assistant</h2>
                <div className="chat-box border p-3 mb-4" style={{ height: "50vh", overflowY: "auto", borderRadius: "15px", background: "#fdfdfd", boxShadow: "inset 0 0 10px rgba(0,0,0,0.05)" }}>
                    {chatDisplay.length === 0 && <p className="text-center text-muted mt-5">Click the mic and describe your symptoms...</p>}
                    {chatDisplay.map((msg, i) => (
                        <div key={i} className={`mb-3 ${msg.role === "Patient" ? "text-end" : "text-start"}`}>
                            <div className={`p-2 d-inline-block rounded ${msg.role === "Patient" ? "bg-primary text-white" : "bg-light border"}`} style={{maxWidth: "80%"}}>
                                <strong>{msg.role}:</strong> {msg.text}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="text-center">
                    <button 
                        className={`btn btn-lg shadow ${isListening ? 'btn-danger' : 'btn-success'}`}
                        onClick={handleStart}
                        disabled={isListening}
                        style={{ borderRadius: '50px', padding: '15px 40px', transition: 'all 0.3s' }}
                    >
                        {isListening ? "Listening... (Take your time)" : "🎤 Speak to Doctor"}
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default Chatbot;