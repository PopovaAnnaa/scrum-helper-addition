const ENCRYPTION_SECRET = 'scrum_helper_secure_key';

function encryptApiKey(text) {
    if (!text) return '';
    const result = text.split('').map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) ^ ENCRYPTION_SECRET.charCodeAt(i % ENCRYPTION_SECRET.length))
    ).join('');
    return btoa(unescape(encodeURIComponent(result)));
}

function decryptApiKey(encodedText) {
    if (!encodedText) return '';
    try {
        const decoded = decodeURIComponent(escape(atob(encodedText)));
        return decoded.split('').map((char, i) => 
            String.fromCharCode(char.charCodeAt(0) ^ ENCRYPTION_SECRET.charCodeAt(i % ENCRYPTION_SECRET.length))
        ).join('');
    } catch (e) {
        console.error("Failed to decrypt API Key. Data might be in old format.");
        return '';
    }
}

class GeminiClient {
    constructor(encryptedApiKey, options = {}) {
        this.encryptedApiKey = encryptedApiKey;
        this.model = options.model || 'gemini-2.5-flash'; 
    }

    _getApiKey() {
        try {
            const decrypted = decryptApiKey(this.encryptedApiKey);
            return (decrypted && decrypted.startsWith('AIza')) ? decrypted : '';
        } catch (e) { return ''; }
    }

    async generateText(prompt, systemPrompt = null) {
        const apiKey = this._getApiKey();
        if (!apiKey) throw new Error("API Key is missing.");

        const url = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${apiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [{ 
                    text: systemPrompt 
                        ? `${systemPrompt}\n\nTask: ${prompt}` 
                        : prompt 
                }]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Gemini 3 Error: ${data.error?.message || response.statusText}`);
        }
        
        try {
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            console.error("Unexpected response structure:", data);
            throw new Error("Could not parse AI response.");
        }
    }

    async verifyKey() {
        const apiKey = this._getApiKey();
        if (!apiKey) return { isValid: false, error: "Key decryption failed." };
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
            return { isValid: response.ok, error: response.ok ? null : "Invalid Key" };
        } catch (e) {
            return { isValid: false, error: "Network error" };
        }
    }
}

async function verifyApiKeyWithProvider(encryptedKey) {
    console.log("Verifying AI API Key...");
    const client = new GeminiClient(encryptedKey);
    const result = await client.verifyKey();
    
    if (!result.isValid) {
        console.error("Verification failed:", result.error);
        throw new Error(result.error);
    }
    
    console.log("API Key is valid.");
    return true;
}

window.encryptApiKey = encryptApiKey;
window.decryptApiKey = decryptApiKey;
window.GeminiClient = GeminiClient;
window.verifyApiKeyWithProvider = verifyApiKeyWithProvider;