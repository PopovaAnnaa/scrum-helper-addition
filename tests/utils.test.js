/**
 * @jest-environment jsdom
 */


require('../src/scripts/ai-service');

const { 
    encryptApiKey, 
    decryptApiKey, 
    cleanAndTrimRawData 
} = window;

describe('Utility Functions', () => {
    test('шифрування та дешифрування мають повертати початковий текст', () => {
        const key = "test-api-key-123";
        const encrypted = encryptApiKey(key);
        const decrypted = decryptApiKey(encrypted);
        expect(decrypted).toBe(key);
    });

    test('cleanAndTrimRawData видаляє хеші комітів', () => {
        const raw = "abc1234 Fix login issue\ndef5678 Add logout";
        const cleaned = cleanAndTrimRawData(raw);
        expect(cleaned).toBe("Fix login issue\nAdd logout");
    });
});