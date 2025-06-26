import CryptoJS from 'crypto-js';
import pako from 'pako';

export const encryptData = (data, secretKey) => {
    
    const jsonString = JSON.stringify(data); // Convert JSON to string
    const encrypted = CryptoJS.AES.encrypt(jsonString, secretKey).toString();
    return encrypted;
};

export const decryptData = (cipherText, secretKey) => {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedString); // Convert string back to JSON
};

export const compressData = (data) => {
    // Convert data to a JSON string
    const jsonString = JSON.stringify(data);

    // Compress the string to get binary data
     const compressed = pako.deflate(jsonString);

     // Convert it to base64
     const compressedBase64 = Buffer.from(compressed).toString('base64');
     
    return compressedBase64;
};


export const decompressData = (compressedBase64) => {
    try {
        // Decode the Base64 string back into binary data
        const compressed = Buffer.from(compressedBase64, 'base64');
        
        // Decompress the binary data using pako
        const decompressed = pako.inflate(compressed, { to: 'string' });
        
        // Return the decompressed string (which was originally JSON)
        return JSON.parse(decompressed);
    } catch (error) {
        console.error("Error during decompression:", error.message);
        throw error;
    }
};

const characters = 'abcdefghijklmnopJqrstuvwxyz012345A6789BCDEFGHIKLMNOPQRSTUVWXYZ';

// Custom reversible encoding
export const encodeNumber = (num) => {
    const base = 62;
    let encoded = '';

    // Convert number to a Base62 string
    let n = Math.abs(num);
    while (n > 0) {
        encoded = characters[n % base] + encoded;

        n = Math.floor(n / base);
    }

    // Add a prefix for negative numbers (optional)
    return (num < 0 ? 'N' : '') + encoded; // 'N' marks negatives
};

export const decodeNumber = (encoded) => {
    const base = 62;
    const isNegative = encoded.startsWith('N');
    let num = 0;

    // Remove prefix for negative numbers
    const str = isNegative ? encoded.slice(1) : encoded;

    // Decode Base62 string back to number
    for (let char of str) {
        num = num * base + characters.indexOf(char);
    }

    return isNegative ? -num : num;
};