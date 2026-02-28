const ENCRYPTION_SECRET = 'scrum_helper_secure_key';

function encryptApiKey(text) {
    if (!text) return '';
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_SECRET.charCodeAt(i % ENCRYPTION_SECRET.length));
    }
    return btoa(result);
}

function decryptApiKey(encodedText) {
    if (!encodedText) return '';
    try {
        const text = atob(encodedText);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_SECRET.charCodeAt(i % ENCRYPTION_SECRET.length));
        }
        return result;
    } catch (e) {
        console.error("Failed to decrypt API Key");
        return '';
    }
}

async function verifyApiKeyWithProvider(apiKey) {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        if (response.status === 401) {
            return { isValid: false, error: "Invalid API Key. Please check your settings." };
        } else if (response.status === 429) {
            return { isValid: false, error: "Rate limit reached or insufficient balance on OpenAI." };
        } else if (!response.ok) {
            return { isValid: false, error: `API Error: ${response.status}` };
        }
        
        return { isValid: true };
    } catch (error) {
        return { isValid: false, error: "Network error. Please check your internet connection." };
    }
}