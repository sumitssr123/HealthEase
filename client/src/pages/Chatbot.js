import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import API from "../api";
import { message, Input, Button, Spin } from "antd";

const { TextArea } = Input;

const Chatbot = () => {
    const [isListening, setIsListening] = useState(false);
    const [chatDisplay, setChatDisplay] = useState([
        {
            role: "AI Doctor",
            text: "Hello! I am Dr. AI, your HealthEase medical assistant. How can I help you today? You can describe your symptoms by typing below or tapping the microphone button."
        }
    ]);
    const [textInput, setTextInput] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Refs for speech recognition, voice synthesis, and conversation history
    const chatHistoryRef = useRef([]);
    const recognitionRef = useRef(null);
    const synthVoicesRef = useRef([]);
    const transcriptRef = useRef("");
    const timeoutRef = useRef(null);
    const chatBottomRef = useRef(null);

    const scrollToBottom = () => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatDisplay]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const r = new SpeechRecognition();
            r.continuous = true;
            r.interimResults = false;
            r.lang = 'en-US';

            r.onresult = (event) => {
                const currentTranscript = event.results[event.results.length - 1][0].transcript;
                transcriptRef.current += currentTranscript + " ";

                clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(async () => {
                    r.stop();
                    const finalText = transcriptRef.current.trim();
                    if (finalText) {
                        setChatDisplay(prev => [...prev, { role: "Patient", text: finalText }]);
                        setIsListening(false);
                        await sendQuery(finalText);
                    }
                    transcriptRef.current = "";
                }, 1000);
            };

            r.onend = () => setIsListening(false);
            recognitionRef.current = r;
        }

        const loadVoices = () => {
            if (window.speechSynthesis) {
                synthVoicesRef.current = window.speechSynthesis.getVoices();
            }
        };
        loadVoices();
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const speak = (text) => {
        if (!window.speechSynthesis) return;
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

    const sendQuery = async (text) => {
        if (!text.trim()) return;

        let currentHistory = [...chatHistoryRef.current];
        currentHistory.push({ role: "user", parts: [{ text }] });
        setLoading(true);

        try {
            const res = await API.post("/api/v1/chatbot/chat", { chatHistory: currentHistory });
            setLoading(false);
            
            if (res.data.success) {
                const reply = res.data.reply;
                setChatDisplay(prev => [...prev, { role: "AI Doctor", text: reply }]);
                
                currentHistory.push({ role: "model", parts: [{ text: reply }] });
                chatHistoryRef.current = currentHistory.slice(-10);
                
                speak(reply);
            } else {
                message.error(res.data.message || "Chatbot service response error");
            }
        } catch (e) {
            setLoading(false);
            console.error(e);
            const errorMsg = e.response?.data?.message || "Medical AI assistant temporarily offline. Please verify GEMINI_API_KEY.";
            setChatDisplay(prev => [...prev, { role: "AI Doctor", text: `⚠️ ${errorMsg}` }]);
        }
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        const query = textInput.trim();
        if (!query || loading) return;

        setChatDisplay(prev => [...prev, { role: "Patient", text: query }]);
        setTextInput("");
        sendQuery(query);
    };

    const handleStartMic = () => {
        if (!recognitionRef.current) {
            message.warning("Speech recognition is not supported in this browser. Please use text typing below.");
            return;
        }
        if (window.speechSynthesis?.speaking) {
            window.speechSynthesis.cancel();
        }
        transcriptRef.current = ""; 
        setIsListening(true);
        recognitionRef.current.start();
    };

    return (
        <Layout>
            <div className="container mt-3" style={{ maxWidth: '750px' }}>
                <div className="text-center mb-3">
                    <h2 style={{ color: '#2c3e50', fontWeight: 'bold' }}>
                        🩺 Dr. AI Medical Assistant
                    </h2>
                    <p className="text-muted small">
                        Powered by Google Gemini • General Healthcare Guidance & Symptom Clarification
                    </p>
                </div>

                <div 
                    className="alert alert-warning py-2 px-3 small d-flex align-items-center mb-3"
                    style={{ borderRadius: '10px', fontSize: '0.85rem' }}
                >
                    <i className="fa-solid fa-triangle-exclamation me-2 fs-6"></i>
                    <span>
                        <strong>Clinical Disclaimer:</strong> Dr. AI provides informative guidance only and does not replace a professional clinical diagnosis. If you have severe symptoms, please seek emergency medical attention.
                    </span>
                </div>

                {/* Chat window */}
                <div 
                    className="chat-box border p-3 mb-3" 
                    style={{ 
                        height: "50vh", 
                        overflowY: "auto", 
                        borderRadius: "15px", 
                        background: "#fcfdfe", 
                        boxShadow: "inset 0 1px 4px rgba(0,0,0,0.06)" 
                    }}
                >
                    {chatDisplay.map((msg, i) => (
                        <div key={i} className={`mb-3 ${msg.role === "Patient" ? "text-end" : "text-start"}`}>
                            <div 
                                className={`p-3 d-inline-block rounded-3 shadow-sm ${
                                    msg.role === "Patient" 
                                        ? "bg-primary text-white" 
                                        : "bg-white border text-dark"
                                }`} 
                                style={{ maxWidth: "85%", textAlign: "left", whiteSpace: "pre-wrap" }}
                            >
                                <div className="small fw-bold mb-1 opacity-75">
                                    {msg.role === "Patient" ? "👤 You" : "🩺 Dr. AI Assistant"}
                                </div>
                                <div>{msg.text}</div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="text-start mb-3">
                            <div className="p-3 d-inline-block rounded-3 bg-white border">
                                <Spin size="small" /> <span className="ms-2 text-muted">Dr. AI is thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatBottomRef} />
                </div>

                {/* Input Controls */}
                <form onSubmit={handleTextSubmit} className="mb-4">
                    <div className="d-flex gap-2">
                        <Button 
                            type={isListening ? "primary" : "default"}
                            danger={isListening}
                            shape="circle"
                            size="large"
                            icon={<i className={`fa-solid ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>}
                            onClick={handleStartMic}
                            disabled={loading}
                            title={isListening ? "Listening..." : "Click to Speak"}
                            style={{ height: '46px', width: '46px', flexShrink: 0 }}
                        />
                        <TextArea
                            rows={1}
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            placeholder="Type your medical query or symptoms here..."
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            onPressEnter={(e) => {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleTextSubmit(e);
                                }
                            }}
                            disabled={loading}
                            style={{ borderRadius: '10px', resize: 'none' }}
                        />
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            size="large"
                            loading={loading}
                            disabled={!textInput.trim() || loading}
                            style={{ borderRadius: '10px', height: '46px', fontWeight: 'bold' }}
                        >
                            Send <i className="fa-solid fa-paper-plane ms-1"></i>
                        </Button>
                    </div>
                    {isListening && (
                        <div className="text-danger small mt-1 text-center animate-pulse">
                            <i className="fa-solid fa-circle me-1"></i> Listening to your voice... Speak naturally.
                        </div>
                    )}
                </form>
            </div>
        </Layout>
    );
};

export default Chatbot;