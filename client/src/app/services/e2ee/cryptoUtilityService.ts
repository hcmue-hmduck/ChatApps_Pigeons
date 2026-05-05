import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

/**
 * Branded Type: Đại diện cho một chuỗi đã được mã hóa Base64.
 * - Giúp TypeScript phân biệt được chuỗi Base64 với chuỗi văn bản thông thường (string).
 * - Ngăn chặn lỗi truyền nhầm dữ liệu chưa mã hóa vào các hàm yêu cầu mật mã.
 * - Lưu ý: Nhãn `__brand` chỉ tồn tại trong lúc code (compile-time), không tồn tại khi chạy (runtime).
 */
export type Base64String = string & { readonly __brand: 'Base64String' };

declare global {
    interface Window {
        TestCryptoUtilityService: any;
    }
}

@Injectable({
    providedIn: 'root',
})
export class CryptoUtilityService {
    private platformId = inject(PLATFORM_ID);
    constructor() {
        if (isPlatformBrowser(this.platformId)) window.TestCryptoUtilityService = this;
    }

    stringToArrayBuffer(str: string): ArrayBuffer {
        return new TextEncoder().encode(str).buffer;
    }

    arrayBufferToString(buf: ArrayBuffer) {
        return new TextDecoder().decode(buf);
    }

    arrayBufferToBase64(buf: ArrayBuffer): Base64String {
        const bytes = new Uint8Array(buf);
        const length = bytes.length;
        let binaryString = '';

        for (let i = 0; i < length; i++) {
            // map các số từ 0-255 sang bảng mã latin 1
            binaryString += String.fromCharCode(bytes[i]);
        }

        return window.btoa(binaryString) as Base64String;
    }

    base64ToArrayBuffer(base64: Base64String): ArrayBuffer {
        const binaryString = window.atob(base64);
        const length = binaryString.length;
        const bytes = new Uint8Array(length);

        for (let i = 0; i < length; i++) {
            // charCodeAt(i) lấy giá trị nhị phân của ký tự tại vị trí i
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
    }

    async generateIdentityKeyPair(): Promise<CryptoKeyPair> {
        const algorithms: RsaHashedKeyGenParams = {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]), // [1,0,1] hệ 256 = 65537 hệ 10
            hash: 'SHA-256',
        };

        return await window.crypto.subtle.generateKey(
            algorithms, // algorithms
            true, // extractable
            ['wrapKey', 'unwrapKey'], // key usages
        );
    }

    async generateSharedKey(): Promise<CryptoKey> {
        const algorithms: AesKeyGenParams = {
            name: 'AES-GCM',
            length: 256,
        };
        return await window.crypto.subtle.generateKey(algorithms, true, ['encrypt', 'decrypt']);
    }

    async deriveKEKFromPIN(pin: string, saltBuffer: ArrayBuffer): Promise<CryptoKey> {
        const pinBuffer = this.stringToArrayBuffer(pin);

        const algorithms: Pbkdf2Params = {
            name: 'PBKDF2',
            iterations: 100000,
            hash: 'SHA-256',
            salt: saltBuffer,
        };

        const baseKey: CryptoKey = await window.crypto.subtle.importKey(
            'raw',
            pinBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveKey'],
        );

        const derivedKeyType: AesDerivedKeyParams = {
            name: 'AES-GCM',
            length: 256,
        };

        return await window.crypto.subtle.deriveKey(
            algorithms,
            baseKey,
            derivedKeyType,
            false, // extractable
            ['wrapKey', 'unwrapKey'],
        );
    }

    async encryptData(
        plaintext: string,
        key: CryptoKey,
    ): Promise<{
        ciphertext: Base64String;
        iv: Base64String;
    }> {
        const ivBuffer = window.crypto.getRandomValues(new Uint8Array(12)).buffer;
        const data = this.stringToArrayBuffer(plaintext);

        const algorithms: AesGcmParams = {
            name: 'AES-GCM',
            iv: ivBuffer,
        };

        const ciphertext = await window.crypto.subtle.encrypt(algorithms, key, data);

        return {
            ciphertext: this.arrayBufferToBase64(ciphertext),
            iv: this.arrayBufferToBase64(ivBuffer),
        };
    }

    async decryptData(ciphertext: Base64String, iv: Base64String, key: CryptoKey): Promise<string> {
        const ivBuffer = this.base64ToArrayBuffer(iv);
        const algorithms: AesGcmParams = { name: 'AES-GCM', iv: ivBuffer };
        const ciphertextBuffer = this.base64ToArrayBuffer(ciphertext);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            algorithms,
            key,
            ciphertextBuffer,
        );

        return this.arrayBufferToString(decryptedBuffer);
    }

    async wrapKey(
        key: CryptoKey,
        wrappingKey: CryptoKey,
    ): Promise<{
        wrappedKey: Base64String;
        iv: Base64String | undefined;
    }> {
        const algoName = wrappingKey.algorithm.name;
        let wrapAlgorithm: AesGcmParams | RsaOaepParams;
        let ivBuffer: ArrayBuffer | undefined;

        if (algoName === 'AES-GCM') {
            ivBuffer = window.crypto.getRandomValues(new Uint8Array(12)).buffer;
            wrapAlgorithm = { name: 'AES-GCM', iv: ivBuffer };
        } else wrapAlgorithm = { name: 'RSA-OAEP' };

        const wrappedKeyBuffer = await window.crypto.subtle.wrapKey(
            'jwk',
            key,
            wrappingKey,
            wrapAlgorithm,
        );

        return {
            wrappedKey: this.arrayBufferToBase64(wrappedKeyBuffer),
            iv: ivBuffer ? this.arrayBufferToBase64(ivBuffer) : undefined,
        };
    }

    async unwrapKey(
        wrappedKey: Base64String,
        unwrappingKey: CryptoKey,
        iv?: Base64String,
    ): Promise<CryptoKey> {
        const wrappedKeyBuffer = this.base64ToArrayBuffer(wrappedKey);
        const algoName = unwrappingKey.algorithm.name;

        let unwrapAlgorithm: RsaOaepParams | AesGcmParams; // thuật toán để unwrap
        let usages: KeyUsage[];
        let unwrappedKeyAlgorithm: RsaHashedImportParams | AesKeyAlgorithm; // cấu hình của key sẽ được unwrap
        if (algoName === 'AES-GCM' && iv) {
            // TH1: unwrap private key
            unwrapAlgorithm = {
                name: algoName,
                iv: this.base64ToArrayBuffer(iv),
            };
            unwrappedKeyAlgorithm = {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
            };
            usages = ['unwrapKey'];
        } else {
            // TH2: unwrap shared key
            unwrapAlgorithm = {
                name: algoName,
            };
            unwrappedKeyAlgorithm = {
                name: 'AES-GCM',
                length: 256,
            };
            usages = ['encrypt', 'decrypt'];
        }

        return await window.crypto.subtle.unwrapKey(
            'jwk',
            wrappedKeyBuffer,
            unwrappingKey,
            unwrapAlgorithm,
            unwrappedKeyAlgorithm,
            true, // extractable
            usages,
        );
    }
}

/** Test console trình duyệt
const {publicKey, privateKey} = await TestCryptoUtilityService.generateIdentityKeyPair()
const pin = 180205
const saltBuffer = crypto.getRandomValues(new Uint8Array(16)).buffer
const kek = await TestCryptoUtilityService.deriveKEKFromPIN(pin, saltBuffer)
const sharedKey = await TestCryptoUtilityService.generateSharedKey()
let wrappedObject = await TestCryptoUtilityService.wrapKey(sharedKey, publicKey)
const wrappedSharedKey = wrappedObject.wrappedKey
wrappedObject = await TestCryptoUtilityService.wrapKey(privateKey, kek)
const wrappedPrivateKey = wrappedObject.wrappedKey
const kekIV = wrappedObject.iv
const unwrappedPrivateKey = await TestCryptoUtilityService.unwrapKey(wrappedPrivateKey, kek, kekIV)
unwrappedPrivateKey
privateKey
const unwrappedSharedKey = await TestCryptoUtilityService.unwrapKey(wrappedSharedKey, unwrappedPrivateKey)
unwrappedSharedKey
sharedKey
 */
