import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";

// ==========================================
// 🧠 MASSIVE SMART DATABASE (Including Heart, Derma, Gyno, Vaccines)
// ==========================================
const MEDICAL_DATABASE = [
  // 🔴 BASIC & PREVIOUS SMART ENTRIES
  {
    keywords: ["paracetamol", "dolo", "crocin", "calpol", "fever", "bukhar", "pain", "headache", "sar dard"],
    name: "Paracetamol (Dolo 650 / Crocin)",
    class: "Analgesic / Antipyretic",
    use: "Reduces fever and relieves mild to moderate pain.",
    sideEffects: "Rare liver damage on extreme overdose.",
    hinglishSummary: "💡 **Short Summary:** Bukhar ya badan dard ke liye ye sabse safe dawai hai. Khane ke baad lena behtar hai."
  },
  {
    keywords: ["low bp", "bp low", "blood pressure low", "chakkar", "kamjori", "weakness", "ors"],
    name: "ORS / Electrolytes (For Low BP)",
    class: "Rehydration Therapy",
    use: "Restores fluids and minerals to instantly increase low blood pressure.",
    sideEffects: "Safe if taken in normal amounts.",
    hinglishSummary: "💡 **Short Summary:** Low BP ke liye specifically koi hard dawai nahi hoti. Chakkar aane par turant ORS ka ghol ya Nimbu-namak-cheeni ka paani pilayein."
  },
  
  // 🔴 HEART & BLOOD PRESSURE (From Your List)
  {
    keywords: ["ramipril", "cardace", "ramace", "high bp", "heart attack", "heart failure"],
    name: "Ramipril (Cardace / Ramace)",
    class: "ACE Inhibitor",
    use: "Treats high blood pressure and reduces the risk of heart attack and stroke.",
    sideEffects: "Dry cough (sookhi khasi), low blood pressure.",
    hinglishSummary: "💡 **Short Summary:** High BP aur heart ke patients ko ye dawai di jati hai taaki heart attack ka risk kam ho. Agar isse sookhi khasi (dry cough) ho, toh doctor ko batayein."
  },
  {
    keywords: ["amlodipine", "telmisartan", "losartan", "bp", "blood pressure", "telma"],
    name: "Amlodipine / Telmisartan / Losartan",
    class: "Antihypertensive (BP Medicine)",
    use: "Relaxes blood vessels to lower high blood pressure.",
    sideEffects: "Swelling in ankles, dizziness, fatigue.",
    hinglishSummary: "💡 **Short Summary:** High BP (Blood Pressure) ko control karne ki dawai hai. Ise roz ek hi time par lena chahiye, beech mein chhodna khatarnak ho sakta hai."
  },
  {
    keywords: ["aspirin", "ecosprin", "blood thinner", "clot", "heart"],
    name: "Aspirin (Ecosprin) / Clopidogrel",
    class: "Antiplatelet (Blood Thinner)",
    use: "Prevents blood clots, reducing the risk of heart attacks and strokes.",
    sideEffects: "Stomach upset, heartburn, increased bleeding risk.",
    hinglishSummary: "💡 **Short Summary:** Yeh khoon patla karne ki dawai (blood thinner) hai. Heart attack se bachne ke liye di jati hai. Ise hamesha khane ke baad lein taaki gas na bane."
  },

  // 🔴 DIABETES (SUGAR) (From Your List)
  {
    keywords: ["sugar", "diabetes", "diabetic", "madhumeh", "metformin", "glycomet", "glimepiride", "amaryl"],
    name: "Metformin / Glimepiride (Glycomet / Amaryl)",
    class: "Anti-diabetic Drug",
    use: "Controls high blood sugar levels in Type 2 Diabetes.",
    sideEffects: "Stomach upset, nausea, metallic taste.",
    hinglishSummary: "💡 **Short Summary:** Bhai, Sugar (Diabetes) control karne ke liye ye sabse main dawaiyan hain. Ise khane ke beech mein ya baad mein lein, khali pet nahi. Aur meetha ekdum band!"
  },
  {
    keywords: ["insulin", "injection", "glargine", "lispro"],
    name: "Insulin (Regular / Glargine / Lispro)",
    class: "Hormone Therapy",
    use: "Direct blood sugar control for Diabetes Mellitus.",
    sideEffects: "Hypoglycemia (Low blood sugar), weight gain.",
    hinglishSummary: "💡 **Short Summary:** Jab tablets se sugar control nahi hoti, tab Insulin ke injections lagte hain. Injection lene ke baad khana khana zaroori hai warna sugar achanak low ho sakti hai (chakkar aa sakte hain)."
  },

  // 🔴 DERMATOLOGY & SKIN (From Your List)
  {
    keywords: ["isotretinoin", "isotroin", "acne", "pimple", "muhase", "tretiva"],
    name: "Isotretinoin (Isotroin / Tretiva)",
    class: "Oral Retinoid (Vitamin A derivative)",
    use: "Powerful medicine used to treat severe cystic acne and prevent scarring.",
    sideEffects: "Dry lips, dry skin, liver enzyme increase. NOT safe during pregnancy.",
    hinglishSummary: "💡 **Short Summary:** Yeh severe acne (mote pimples) ke liye use hota hai jab normal creams kaam nahi karti. Ye skin ka oil kam karta hai. Dhyan rahe, isse honth (lips) bahut sookhte hain toh lip balm lagayein. Pregnant ladies ko ye bilkul NAHI leni chahiye."
  },
  {
    keywords: ["betamethasone", "clobetasol", "betnovate", "tenovate", "eczema", "allergy", "khujli"],
    name: "Betamethasone / Clobetasol (Betnovate / Tenovate)",
    class: "Topical Corticosteroid",
    use: "Reduces severe skin inflammation, psoriasis, eczema, and allergic reactions.",
    sideEffects: "Skin thinning if used for too long.",
    hinglishSummary: "💡 **Short Summary:** Skin ki allergy, redness, aur khujli kam karne ke liye ye best creams hain. Par inhe face par regularly fairness cream ki tarah use mat karna, warna skin patli aur kharab ho jayegi."
  },

  // 🔴 GYNECOLOGY & HORMONES (From Your List)
  {
    keywords: ["levonorgestrel", "unwanted 72", "ulipristal", "emergency", "pregnancy", "contraceptive"],
    name: "Levonorgestrel (Unwanted-72)",
    class: "Emergency Contraceptive",
    use: "Emergency pregnancy prevention after unprotected sex.",
    sideEffects: "Nausea, irregular periods, stomach pain.",
    hinglishSummary: "💡 **Short Summary:** Unprotected sex ke baad pregnancy rokne ke liye ye emergency pill use hoti hai (within 72 hours). Ise regularly use nahi karna chahiye warna periods irregular ho jate hain."
  },
  {
    keywords: ["norethisterone", "primolut", "period", "menstruation", "bleeding"],
    name: "Norethisterone (Primolut-N)",
    class: "Progestogen",
    use: "Used for delaying menstruation or controlling heavy menstrual bleeding.",
    sideEffects: "Weight gain, breast tenderness, mood swings.",
    hinglishSummary: "💡 **Short Summary:** Agar kisi pooja ya function ke liye periods (menstruation) delay karne ho, ya periods mein bahot heavy bleeding ho rahi ho, toh ye dawai doctor dete hain."
  },

  // 🔴 EMERGENCY & ICU MEDICINES (From Your List)
  {
    keywords: ["epinephrine", "adrenaline", "cardiac arrest", "anaphylaxis", "severe allergy"],
    name: "Epinephrine (Adrenaline)",
    class: "Emergency Drug / Life Saver",
    use: "Used in Cardiac arrest and severe allergic reactions (anaphylaxis).",
    sideEffects: "Fast heart rate, anxiety, high BP.",
    hinglishSummary: "💡 **Short Summary:** Yeh ek 'Life-Saving' injection hai. Jab heart achanak ruk jaye (cardiac arrest) ya kisi cheez (jaise madhumakhi) se bhayankar allergy ho jaye jisme saans rukne lage, tab ye turant diya jata hai."
  },

  // 🔴 VACCINES (From Your List)
  {
    keywords: ["vaccine", "tika", "bcg", "hepatitis", "tetanus", "polio", "rabies"],
    name: "General Vaccines (BCG, Tetanus, Rabies, Polio)",
    class: "Immunization",
    use: "Prevents severe diseases (TB, Tetanus, Dog Bites, Polio).",
    sideEffects: "Mild fever and pain at the injection site.",
    hinglishSummary: "💡 **Short Summary:** Vaccines (Tike) bimari hone se pehle bachate hain. Kutta katne par 'Rabies' ka injection, loha lagne par 'Tetanus' ka injection lagwana bahut zaroori hai. Iske baad halka bukhar aana normal hai."
  },

  // 🔴 GENERAL / OTHERS
  {
    keywords: ["pantoprazole", "pan 40", "omeprazole", "acidity", "gas", "jalan"],
    name: "Pantoprazole / Omeprazole (Pan-40 / Omez)",
    class: "Proton Pump Inhibitor (PPI)",
    use: "Treats severe acidity, acid reflux, GERD, and stomach ulcers.",
    sideEffects: "Headache, stomach pain.",
    hinglishSummary: "💡 **Short Summary:** Gas aur acidity ki sabse best dawai hai. Subah khali pet (nashte se adha ghanta pehle) leni chahiye."
  },
  {
    keywords: ["liver", "udiliv", "jaundice", "fatty liver"],
    name: "Ursodeoxycholic Acid (Udiliv 300)",
    class: "Hepatoprotective",
    use: "Treats fatty liver and protects liver cells.",
    sideEffects: "Diarrhea.",
    hinglishSummary: "💡 **Short Summary:** Liver ki problem (Fatty liver ya piliya) mein ye dawai kaam aati hai. Tel-masala ekdum band kar dein."
  }
];

const Chatbot = () => {
  const { user } = useSelector((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const getCurrentTime = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const [messages, setMessages] = useState([
    { 
      sender: "bot", 
      text: "Hello! I am **HealthBot Elite**. 🏥\n\nI am now updated with a Massive Encyclopedia! Ask me about BP, Sugar, Skin (Acne), Emergency medicines, or Women's Health.", 
      time: getCurrentTime() 
    }
  ]);
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (user?.isAdmin || user?.isDoctor) return null;

  const formatText = (text) => {
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong style='color:#0f172a; font-weight:700;'>$1</strong>") 
      .replace(/\*(.*?)\*/g, "<em style='color:#2563eb; font-weight:600;'>$1</em>") 
      .replace(/\n/g, "<br/>"); 
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  // 🧠 THE ULTRA-ADVANCED SEARCH ENGINE
  const searchDatabase = (query) => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return null;

    let matchedMeds = [];

    // 1. EXACT OVERRIDES
    if (lowerQuery.includes("low bp") || lowerQuery.includes("bp low")) {
      const lowBpMed = MEDICAL_DATABASE.find(med => med.name.includes("ORS"));
      if (lowBpMed) return [lowBpMed];
    }

    // 2. FUZZY MATCHING
    MEDICAL_DATABASE.forEach(med => {
      const isMatch = med.keywords.some(keyword => lowerQuery.includes(keyword.toLowerCase()));
      if (isMatch) matchedMeds.push(med);
    });

    matchedMeds = [...new Set(matchedMeds)];
    return matchedMeds.length > 0 ? matchedMeds : null;
  };

  // 💬 SMART CONVERSATIONAL ENGINE
  const getSmartFallbackResponse = (query) => {
    const lowerQuery = query.toLowerCase().trim();
    
    if (/(hi|hello|hey|hii|helo|namaste)/.test(lowerQuery) && lowerQuery.length < 15) {
      return "Hello there! 👋 Kaise help karu aapki aaj? Aap kisi bhi problem (jaise Sugar, BP, Acne, Allergy) ya dawai ka naam type kar sakte hain.";
    }
    
    if (lowerQuery.includes("this medicine") || lowerQuery.includes("about medicine")) {
      return "Aap dawai ke baare mein janna chahte hain, par aapne **naam nahi bataya**. 😅\n\nPlease dawai ya problem ka naam likhiye (Jaise: 'Acne', 'Sugar', 'Isotretinoin').";
    }

    return `Mujhe apne database mein **"${query}"** se judi exact jankari nahi mili.\n\n💡 **Tip:** Kripya kisi specific dawai ka naam (jaise *Dolo, Cardace*) ya bimari (jaise *Sugar, BP, Acne, Pregnancy*) try karein. Agar problem serious hai, toh please doctor ko dikhayein!`;
  };

  const handleSend = () => {
    if (input.trim() === "") return;

    const userText = input;
    setMessages((prev) => [...prev, { sender: "user", text: userText, time: getCurrentTime() }]);
    setInput(""); 
    setIsTyping(true);

    setTimeout(() => {
      const foundMeds = searchDatabase(userText);

      if (foundMeds) {
        let responseText = "✅ **Analysis Complete:**\n\n";
        
        foundMeds.forEach(med => {
          responseText += `💊 **${med.name}**\n`;
          responseText += `• **Class:** ${med.class}\n`;
          responseText += `• **Primary Use:** ${med.use}\n`;
          responseText += `• **Side Effects:** ${med.sideEffects}\n\n`;
          responseText += `${med.hinglishSummary}\n\n`;
          responseText += `---------------------------\n\n`;
        });

        responseText += "⚠️ *Note: This AI is for information only. Always consult a verified doctor.*";
        setMessages((prev) => [...prev, { sender: "bot", text: responseText.trim(), time: getCurrentTime() }]);
      } else {
        const smartResponse = getSmartFallbackResponse(userText);
        setMessages((prev) => [...prev, { sender: "bot", text: smartResponse, time: getCurrentTime() }]);
      }
      setIsTyping(false);
    }, 600);
  };

  const handleClearChat = () => {
    setMessages([{ sender: "bot", text: "Chat history cleared! What do you want to search?", time: getCurrentTime() }]);
  };

  return (
    <>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed", bottom: "30px", right: "30px", width: "70px", height: "70px",
          borderRadius: "50%", background: "linear-gradient(135deg, #1e293b, #3b82f6)",
          color: "white", display: "flex", justifyContent: "center", alignItems: "center",
          fontSize: "30px", boxShadow: "0 10px 40px rgba(59, 130, 246, 0.4)",
          cursor: "pointer", zIndex: 1000, transition: "0.3s", border: "2px solid #93c5fd"
        }}
      >
        <i className={`fa-solid ${isOpen ? "fa-times" : "fa-pills"}`}></i>
      </div>

      {isOpen && (
        <div style={{
          position: "fixed", bottom: "115px", right: "30px", width: "420px", height: "600px",
          background: "#f8fafc", borderRadius: "20px", boxShadow: "0 25px 80px rgba(0,0,0,0.3)",
          display: "flex", flexDirection: "column", zIndex: 1000, overflow: "hidden", border: "1px solid #cbd5e1"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #1e293b, #2563eb)", color: "white",
            padding: "20px 25px", display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "4px solid #60a5fa"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#ffffff", display: "flex", justifyContent: "center", alignItems: "center", color: "#2563eb", fontSize: "18px", boxShadow: "0 0 10px rgba(255,255,255,0.2)" }}>
                <i className="fa-solid fa-brain"></i>
              </div>
              <div>
                <div style={{ fontWeight: "800", fontSize: "18px", letterSpacing: "0.5px" }}>HealthBot <span style={{color: "#93c5fd"}}>Elite</span></div>
                <div style={{ fontSize: "12px", color: "#bfdbfe", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", background: "#34d399", borderRadius: "50%", display: "inline-block", animation: "pulse 2s infinite" }}></span> V-MAX Smart Engine
                </div>
              </div>
            </div>
            <i className="fa-solid fa-trash-can" onClick={handleClearChat} style={{ cursor: "pointer", fontSize: "18px", color: "#fca5a5", transition: "0.2s" }}></i>
          </div>

          <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", background: "#f1f5f9" }}>
            {messages.map((msg, index) => (
              <div key={index} style={{
                alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                background: msg.sender === "user" ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#ffffff",
                color: msg.sender === "user" ? "white" : "#1e293b",
                padding: "16px 20px", borderRadius: msg.sender === "user" ? "20px 20px 5px 20px" : "20px 20px 20px 5px",
                maxWidth: "85%", fontSize: "14.5px", boxShadow: "0 5px 15px rgba(0,0,0,0.06)",
                lineHeight: "1.6", border: msg.sender === "bot" ? "1px solid #e2e8f0" : "none"
              }}>
                {msg.text && (msg.sender === "bot" ? formatText(msg.text) : msg.text)}
                <div style={{ marginTop: "8px", fontSize: "11px", color: msg.sender === "user" ? "#bfdbfe" : "#94a3b8", textAlign: "right", fontWeight: "600" }}>{msg.time}</div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ alignSelf: "flex-start", padding: "12px 20px", background: "#ffffff", borderRadius: "20px", fontSize: "13px", color: "#475569", boxShadow: "0 4px 10px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}>
                <i className="fa-solid fa-comment-dots fa-fade" style={{ color: "#3b82f6" }}></i> Fetching clinical data...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: "15px 20px", background: "white", display: "flex", gap: "12px", alignItems: "center", borderTop: "1px solid #e2e8f0" }}>
            <input 
              type="text" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type Acne, BP, Pregnancy, or Medicine..."
              style={{ flex: 1, padding: "14px 20px", border: "1px solid #cbd5e1", borderRadius: "30px", outline: "none", fontSize: "14px", background: "#f8fafc", fontWeight: "500", transition: "0.3s" }}
            />

            <button onClick={handleSend} disabled={isTyping || input.trim() === ""} style={{ background: input.trim() === "" ? "#cbd5e1" : "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", border: "none", width: "48px", height: "48px", borderRadius: "50%", cursor: "pointer", transition: "all 0.3s ease", boxShadow: input.trim() === "" ? "none" : "0 4px 12px rgba(37, 99, 235, 0.4)" }}>
              <i className="fa-solid fa-paper-plane" style={{ fontSize: "16px" }}></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;