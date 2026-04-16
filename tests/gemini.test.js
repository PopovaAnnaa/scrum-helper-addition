/**
 * @jest-environment jsdom
 */

global.chrome = {
    storage: {
        local: { get: jest.fn((keys, cb) => cb({})) }
    }
};

require('../src/scripts/ai-service');

const { GeminiClient, encryptApiKey } = window;

describe('GeminiClient', () => {
    let client;
    let validEncryptedKey;

    beforeEach(() => {
        validEncryptedKey = encryptApiKey('test-real-api-key');
        
        client = new GeminiClient(validEncryptedKey);
        global.fetch = jest.fn();
    });

    test('generateText успішно повертає текст', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: 'Enhanced report' }] } }]
            })
        });

        const result = await client.generateText('input');
        
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('key=test-real-api-key'),
            expect.any(Object)
        );
        expect(result).toBe('Enhanced report');
    });

    test('generateText викидає помилку, якщо API повернув 403', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({ error: { message: 'Invalid API Key' } })
        });

        await expect(client.generateText('hello'))
            .rejects.toThrow('Fatal Gemini Error: Invalid API Key');
    });
});