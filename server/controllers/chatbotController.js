const chatController = async (req, res) => {
    try {
        const { chatHistory } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY; 

        if (!API_KEY) {
            console.log("ERROR: API Key missing");
            return res.status(500).send({ success: false, error: "API Key missing" });
        }

        const body = {
            system_instruction: {
                "parts": [{
                    "text": "You are Dr. AI, a friendly human doctor. NO complex jargon, NO emojis, NO markdown. Keep responses to 1-3 short sentences. STRICT RULE: You are allowed to ask a maximum of 1 or 2 questions TOTAL to understand the patient's symptoms. Once you have enough details, STOP asking questions. Provide a clear, practical health solution, medicine suggestion, or home remedy. After providing the solution, politely conclude the conversation without asking anything else."
                }]
            },
            contents: chatHistory 
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("GEMINI API ERROR:", result);
            return res.status(500).send({ success: false, error: result.error?.message || "Gemini API Error" });
        }

        const reply = result.candidates[0].content.parts[0].text;
        res.status(200).send({ success: true, reply });

    } catch (error) {
        console.error("BACKEND CRASH ERROR:", error);
        res.status(500).send({ success: false, error: "Server Error" });
    }
};

module.exports = { chatController };