/**
 * @jest-environment jsdom
 */

global.$ = global.jQuery = require('jquery');

global.chrome = {
    storage: {
        local: {
            get: jest.fn((keys, cb) => cb({})),
            set: jest.fn((data, cb) => cb && cb()),
            remove: jest.fn((keys, cb) => cb && cb()), 
            clear: jest.fn((cb) => cb && cb())
        }
    },
    runtime: {
        sendMessage: jest.fn(),
        onMessage: { addListener: jest.fn() },
        getURL: jest.fn((path) => path)
    }
};

global.fetch = jest.fn();

require('../src/scripts/ai-service');   
require('../src/scripts/scrumHelper'); 

const { 
    enhanceReportWithAI, 
    encryptApiKey, 
    GeminiClient 
} = window;

describe('Integration: enhanceReportWithAI', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        const validKey = encryptApiKey('test-api-key');
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({
                aiSummary: true,
                aiApiKey: validKey,
                aiTone: 'casual'
            });
        });
    });

    test('успішно покращує звіт через AI', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{ 
                    content: { parts: [{ text: 'AI ENHANCED TEXT' }] } 
                }]
            })
        });

        const result = await enhanceReportWithAI("Old report text");

        expect(result).toBe('AI ENHANCED TEXT');
        expect(global.fetch).toHaveBeenCalled();
    });

    test('повертає оригінал, якщо aiSummary у сховищі false', async () => {
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({ aiSummary: false });
        });

        const input = "Raw data";
        const result = await enhanceReportWithAI(input);
        
        expect(result).toBe(input);
    });

    test('використовує стислий тон (concise) та містить дату', async () => {
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({
                aiSummary: true,
                aiApiKey: window.encryptApiKey('key'),
                aiTone: 'concise'
            });
        });

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] })
        });

        await window.enhanceReportWithAI("data");

        const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        const systemPrompt = requestBody.contents[0].parts[0].text;

        expect(systemPrompt).toContain('ruthlessly brief'); 
        expect(systemPrompt).toContain(new Date().getFullYear().toString());
    });
});