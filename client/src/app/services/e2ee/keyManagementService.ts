import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../authService';
import { CryptoUtilityService } from './cryptoUtilityService';
import { E2eeApiService, SetupKeysPayload, SharedKeyVaultPayload } from './te2eeApiService';
import { LocalDatabaseService } from './localDatabaseService';

@Injectable({
    providedIn: 'root',
})
export class KeyManagementService {
    private cryptoUtil = inject(CryptoUtilityService);
    private localDB = inject(LocalDatabaseService);
    private e2eeApiService = inject(E2eeApiService);

    private userId = ''
    private convesationKeys: Map<string, CryptoKey> = new Map();

    constructor(private authService: AuthService) {
        if (typeof window !== 'undefined') {
            (window as any).TestKeyMService = this;
        }
        this.userId = authService.getUserId();
    }

    // async syncKeys() {
    //     const conversationKeys = await this.localDB.getConversationsKeys();
    //     for (const c of conversationKeys) {
    //         const { conversationId, keyVersion, sharedKeyObj } = c;
    //         this.convesationKeys.set(`${conversationKeys}_${keyVersion}`, sharedKeyObj);
    //     }
    // }

    async checkIdentityKeyPair() {
        const ownKeys = await this.localDB.getOwnKey(this.userId)
        return !!ownKeys
    }

    async setupNewDevice(pin: string) {
        try {
            const pinSalt = await this.cryptoUtil.generateRandomSalt();
            const kek = await this.cryptoUtil.deriveKEKFromPIN(pin, pinSalt.buffer);

            const { publicKeyBase64, privateKeyObj } =
                await this.cryptoUtil.generateIdentityKeyPair();
            const wrappedObj = await this.cryptoUtil.wrapKey(privateKeyObj, kek);

            const wrappedPrivateKey = wrappedObj.wrappedKey;
            const kekIV = wrappedObj.iv;

            await this.localDB.saveOwnKey({
                userId: this.userId!,
                publicKeyBase64,
                privateKeyObj,
                pinHash: await this.cryptoUtil.hashString(pin),
            });

            const payload: SetupKeysPayload = {
                public_key: publicKeyBase64,
                wrapped_private_key: wrappedPrivateKey,
                kek_iv: kekIV!,
                pin_salt: this.cryptoUtil.arrayBufferToBase64(pinSalt.buffer),
            };

            return await firstValueFrom(this.e2eeApiService.setupKeys(payload));
        } catch (error) {
            console.error(`setupNewDevice:::`, error);
            throw error;
        }
    }

    async verifyPin(pin: string) {
        try {
            const ownKeys = await this.localDB.getOwnKey(this.userId!);
            if (!ownKeys) throw new Error('missing own key');

            const { pinHash } = ownKeys;
            const curPinHash = await this.cryptoUtil.hashString(pin);

            return curPinHash === pinHash;
        } catch (error) {
            console.error(`verifyPin`, error);
            throw error;
        }
    }

    async changePin(newPin: string) {
        try {
            const pinSalt = await this.cryptoUtil.generateRandomSalt();
            const kek = await this.cryptoUtil.deriveKEKFromPIN(newPin, pinSalt.buffer);
            const ownKeys = await this.localDB.getOwnKey(this.userId!);
            if (!ownKeys) throw new Error('Thiết bị chưa thiết lập mã hóa E2EE');

            const { publicKeyBase64, privateKeyObj } = ownKeys;
            const wrappedObj = await this.cryptoUtil.wrapKey(privateKeyObj, kek);

            const wrappedPrivateKey = wrappedObj.wrappedKey;
            const kekIV = wrappedObj.iv;
            const pinSaltBase64 = this.cryptoUtil.arrayBufferToBase64(pinSalt.buffer);

            const payload: SetupKeysPayload = {
                public_key: publicKeyBase64,
                wrapped_private_key: wrappedPrivateKey,
                kek_iv: kekIV!,
                pin_salt: pinSaltBase64,
            };

            await this.localDB.updateOwnKey(this.userId!, {
                pinHash: await this.cryptoUtil.hashString(newPin),
            });

            return await firstValueFrom(this.e2eeApiService.setupKeys(payload));
        } catch (error) {
            console.error(`changePIN:::`, error);
            throw error;
        }
    }

    async recoveryDevice(pin: string) {
        try {
            const res = await firstValueFrom(this.e2eeApiService.getMyKeys());
            const metadata = res.metadata;
            if (!metadata) throw new Error('res invalid');
            const { public_key, wrapped_private_key, kek_iv, pin_salt } = metadata;

            const pinSaltBuffer = this.cryptoUtil.base64ToArrayBuffer(pin_salt);

            const kek = await this.cryptoUtil.deriveKEKFromPIN(pin, pinSaltBuffer);
            const privateKeyObj = await this.cryptoUtil.unwrapKey(wrapped_private_key, kek, kek_iv);
            const pinHash = await this.cryptoUtil.hashString(pin);

            const arrPromise = [];
            arrPromise.push(
                this.localDB.saveOwnKey({
                    userId: this.userId!,
                    publicKeyBase64: public_key,
                    privateKeyObj,
                    pinHash,
                }),
            );

            const res2 = await firstValueFrom(this.e2eeApiService.getSharedKeys());
            const sharedKeys = res2.metadata;
            for (const vault of sharedKeys) {
                const { conversation_id, key_version, wrapped_shared_key } = vault;
                const sharedKeyObj = await this.cryptoUtil.unwrapKey(
                    wrapped_shared_key,
                    privateKeyObj,
                );
                arrPromise.push(
                    this.localDB.saveSharedKey({
                        conversationId: conversation_id,
                        keyVersion: key_version,
                        sharedKeyObj,
                    }),
                );
            }

            return await Promise.all(arrPromise);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async establishConversationSercurity(conversationId: string, participantIds: string[]) {
        try {
            participantIds.push(this.userId!); // thêm id của chính mình
            const res = await firstValueFrom(this.e2eeApiService.getPublicKeys(participantIds));
            const participants = res.metadata;

            const sharedKey = await this.cryptoUtil.generateSharedKey();
            await this.localDB.saveSharedKey({
                conversationId,
                sharedKeyObj: sharedKey,
                keyVersion: 1,
            });

            const payload: SharedKeyVaultPayload[] = [];
            for (const p of participants) {
                const publicKeyObj = await this.cryptoUtil.importPublicKey(p.public_key);
                const { wrappedKey } = await this.cryptoUtil.wrapKey(sharedKey, publicKeyObj);
                payload.push({
                    user_id: p.id,
                    conversation_id: conversationId,
                    wrapped_shared_key: wrappedKey,
                    key_version: 1,
                });
            }

            return await firstValueFrom(this.e2eeApiService.addSharedKeysVault(payload));
        } catch (error) {
            console.error(`establishConversationSercurity`, error);
            throw error;
        }
    }
}
