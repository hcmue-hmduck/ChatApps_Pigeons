import { inject, Injectable } from '@angular/core';
import { LocalDatabaseService } from './localDatabaseService';
import { KeyManagementService } from './keyManagementService';
import { AuthService } from '../authService';
import { Base64String, CryptoUtilityService } from './cryptoUtilityService';

export interface EncryptedPayload {
    ciphertext: Base64String;
    iv: Base64String;
    keyVersion: number;
}

@Injectable({
    providedIn: 'root',
})
export class E2EEMessageService {
    localDB = inject(LocalDatabaseService);
    keyManagementService = inject(KeyManagementService);
    cryptoUtil = inject(CryptoUtilityService);
    authService = inject(AuthService);

    userId = '';

    constructor() {
        if (typeof window !== 'undefined') {
            (window as any).TestE2EEMessageService = this;
        }
        this.userId = this.authService.getUserId();
    }

    async encryptMessage(conversationId: string, message: string) {
        try {
            const { keyVersion, sharedKeyObj } =
                await this.keyManagementService.getLatestConversationKey(conversationId);
            const { ciphertext, iv } = await this.cryptoUtil.encryptData(message, sharedKeyObj);
            return {
                ciphertext,
                iv,
                keyVersion,
            };
        } catch (error) {
            console.error(`encryptMessage`, error);
            throw error;
        }
    }

    async decryptMessage<T extends EncryptedPayload>(conversationId: string, encryptPayload: T) {
        try {
            const { ciphertext, iv, keyVersion, ...payload } = encryptPayload;
            const sharedKey = await this.keyManagementService.getSharedKey(
                conversationId,
                keyVersion,
            );
            const content = await this.cryptoUtil.decryptData(ciphertext, iv, sharedKey);
            return {
                ...payload,
                content,
                isDecrypted: true,
            };
        } catch (error) {
            console.error(`decryptMessage`, error);
            return {
                ...encryptPayload,
                content: `Nội dung đã được mã hóa`,
                isDecrypted: false,
            };
        }
    }

    async processIncomingMessage(conversationId: string, messages: any[] = []) {
        const decryptedMessages = await Promise.all(
            messages.map(async (msg) => {
                if (!msg.is_e2ee || msg.is_deleted || !msg.content) {
                    return msg;
                }

                const encryptedPayload = {
                    ...msg,
                    ciphertext: msg.content,
                    keyVersion: msg.key_version,
                    iv: msg.iv
                };

                const decrypted = await this.decryptMessage(conversationId, encryptedPayload);
                return {
                    ...msg,
                    content: decrypted.content,
                    is_decrypted: true,
                };
            }),
        );

        // await this.localDB.saveMessages(decryptedMessages as any);
        return decryptedMessages;
    }
}
