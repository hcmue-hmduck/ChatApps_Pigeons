import { error } from 'node:console';
import { AvatarWrap } from './../../models/callData';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../authService';
import { CryptoUtilityService } from './cryptoUtilityService';
import { ConversationKeyVaultPayload, E2eeApiService, SetupKeysPayload } from './e2eeApiService';
import { E2EEError, E2EEErrorCode } from './e2eeError';
import { LocalDatabaseService, OwnKey } from './localDatabaseService';

@Injectable({
    providedIn: 'root',
})
export class KeyManagementService {
    private cryptoUtil = inject(CryptoUtilityService);
    private localDB = inject(LocalDatabaseService);
    private e2eeApiService = inject(E2eeApiService);

    private userId = '';
    private sharedKeys: Map<
        string,
        {
            latestVersion: number;
            allVersion: Map<number, CryptoKey>;
        }
    > = new Map();

    constructor(private authService: AuthService) {
        if (typeof window !== 'undefined') {
            (window as any).TestKeyMService = this;
        }
        this.userId = authService.getUserId();
    }

    async checkIdentityKeyPair() {
        const ownKeys = await this.localDB.getOwnKey(this.userId);
        return !!ownKeys;
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

            const payload: SetupKeysPayload = {
                public_key: publicKeyBase64,
                wrapped_private_key: wrappedPrivateKey,
                kek_iv: kekIV!,
                pin_salt: this.cryptoUtil.arrayBufferToBase64(pinSalt.buffer),
            };

            await firstValueFrom(this.e2eeApiService.setupKeys(payload));

            return await this.localDB.saveOwnKey({
                userId: this.userId!,
                publicKeyBase64,
                privateKeyObj,
                pinHash: await this.cryptoUtil.hashString(pin),
            });
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

    // phục hồi identity key và toàn bộ conversation key
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

            const res2 = await firstValueFrom(this.e2eeApiService.getConversationKeys());
            const sharedKeys = res2.metadata;
            for (const vault of sharedKeys) {
                const { conversation_id, key_version, wrapped_shared_key } = vault;
                const sharedKeyObj = await this.cryptoUtil.unwrapKey(
                    wrapped_shared_key,
                    privateKeyObj,
                );
                arrPromise.push(
                    this.localDB.saveConversationKey({
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

    async establishConversationSercurity(
        conversationId: string,
        participantIds: string[],
        keyVersion = 1,
    ) {
        try {
            participantIds.push(this.userId!); // thêm id của chính mình
            const res = await firstValueFrom(this.e2eeApiService.getPublicKeys(participantIds));
            const participants = res.metadata;

            const sharedKey = await this.cryptoUtil.generateSharedKey();
            const payload: ConversationKeyVaultPayload[] = [];
            for (const p of participants) {
                const publicKeyObj = await this.cryptoUtil.importPublicKey(p.public_key);
                const { wrappedKey } = await this.cryptoUtil.wrapKey(sharedKey, publicKeyObj);
                payload.push({
                    user_id: p.id,
                    conversation_id: conversationId,
                    wrapped_shared_key: wrappedKey,
                    key_version: keyVersion,
                });
            }

            await firstValueFrom(this.e2eeApiService.addConversationKeys(payload));

            return await this.localDB.saveConversationKey({
                conversationId,
                sharedKeyObj: sharedKey,
                keyVersion,
            });
        } catch (error) {
            console.error(`establishConversationSercurity`, error);
            throw error;
        }
    }

    async rotateConversationKey(conversationId: string, participantIds: string[]) {
        try {
            const latestConvKeys = await this.localDB.getLatestConversationKey(conversationId);
            if (!latestConvKeys)
                throw new E2EEError(
                    E2EEErrorCode.SHARED_KEY_NOT_FOUND,
                    'latest shared key not found',
                );

            const keyVersion = latestConvKeys.keyVersion + 1;
            return await this.establishConversationSercurity(
                conversationId,
                participantIds,
                keyVersion,
            );
        } catch (error: any) {
            console.error(`rotateSharedKey`, error);

            const serverErrorCode = error.error.errorCode;
            if (serverErrorCode === E2EEErrorCode.SERVER_KEY_VERSION_MISMATCH)
                return await this.syncLatestConversationKey(conversationId);

            throw error;
        }
    }

    private async syncLatestConversationKey(conversationId: string) {
        try {
            const res = await firstValueFrom(
                this.e2eeApiService.getLatestConversationKey(conversationId),
            );
            const latestConKey = res.metadata;
            const { wrapped_shared_key, key_version } = latestConKey;

            const ownKey = await this.localDB.getOwnKey(this.userId);
            if (!ownKey) throw new E2EEError(E2EEErrorCode.IDENTITY_KEY_NOT_FOUND);

            const sharedKeyObj = await this.cryptoUtil.unwrapKey(
                wrapped_shared_key,
                ownKey.privateKeyObj,
            );

            return await this.localDB.saveConversationKey({
                conversationId,
                sharedKeyObj,
                keyVersion: key_version,
            });
        } catch (error) {
            console.error(`syncLatestSharedKey`, error);
            throw error;
        }
    }

    private updateSharedKeyCache(
        conversationId: string,
        keyVersion: number,
        sharedKeyObj: CryptoKey,
    ) {
        let convData = this.sharedKeys.get(conversationId);

        if (!convData) {
            const allVersion = new Map<number, CryptoKey>();
            allVersion.set(keyVersion, sharedKeyObj);

            this.sharedKeys.set(conversationId, {
                latestVersion: keyVersion,
                allVersion: allVersion,
            });
        } else {
            convData.allVersion.set(keyVersion, sharedKeyObj);
            if (keyVersion > convData.latestVersion) {
                convData.latestVersion = keyVersion;
            }
        }
    }

    async getSharedKey(conversationId: string, keyVersion: number) {
        try {
            // cache
            const sharedKey = this.sharedKeys.get(conversationId)?.allVersion.get(keyVersion);
            if (sharedKey) return sharedKey;

            // local db
            const conKey = await this.localDB.getConversationKey(conversationId, keyVersion);
            if (conKey) {
                console.log('localdb');
                const { sharedKeyObj } = conKey;
                this.updateSharedKeyCache(conversationId, keyVersion, sharedKeyObj);
                return sharedKeyObj;
            }

            // db
            const res = await firstValueFrom(
                this.e2eeApiService.getConversationKey(conversationId, keyVersion),
            );
            const convKeyServer = res.metadata;
            const wrappedSharedKey = convKeyServer.wrapped_shared_key;
            if (!wrappedSharedKey) throw new E2EEError(E2EEErrorCode.SHARED_KEY_NOT_FOUND);

            const ownKey = await this.localDB.getOwnKey(this.userId);
            if (!ownKey) throw new E2EEError(E2EEErrorCode.IDENTITY_KEY_NOT_FOUND);
            const { privateKeyObj } = ownKey;
            const sharedKeyObj = await this.cryptoUtil.unwrapKey(wrappedSharedKey, privateKeyObj);

            await this.localDB.saveConversationKey({ conversationId, keyVersion, sharedKeyObj });
            this.updateSharedKeyCache(conversationId, keyVersion, sharedKeyObj);

            return sharedKeyObj;
        } catch (error) {
            console.error(`getSharedKey`, error);
            throw error;
        }
    }

    async getLatestConversationKey(conversationId: string): Promise<{
        keyVersion: number;
        sharedKeyObj: CryptoKey;
    }> {
        try {
            // cache
            const cache = this.sharedKeys.get(conversationId);
            if (cache) {
                const keyVersion = cache.latestVersion;
                const sharedKeyObj = cache.allVersion.get(keyVersion);
                if (sharedKeyObj) {
                    return {
                        keyVersion,
                        sharedKeyObj,
                    };
                }
            }

            // local db
            const convKey = await this.localDB.getLatestConversationKey(conversationId);
            if (convKey) {
                const { keyVersion, sharedKeyObj } = convKey;
                this.updateSharedKeyCache(conversationId, keyVersion, sharedKeyObj);
                return {
                    keyVersion,
                    sharedKeyObj,
                };
            }

            // db
            const res = await firstValueFrom(
                this.e2eeApiService.getLatestConversationKey(conversationId),
            );
            const convKeyFromServer = res.metadata;
            const wrappedSharedKey = convKeyFromServer.wrapped_shared_key;
            const keyVersion = convKeyFromServer.key_version;

            const ownKey = await this.localDB.getOwnKey(this.userId);
            if (!ownKey) throw new E2EEError(E2EEErrorCode.IDENTITY_KEY_NOT_FOUND);
            const { privateKeyObj } = ownKey;

            const sharedKeyObj = await this.cryptoUtil.unwrapKey(wrappedSharedKey, privateKeyObj);

            await this.localDB.saveConversationKey({ conversationId, keyVersion, sharedKeyObj });
            this.updateSharedKeyCache(conversationId, keyVersion, sharedKeyObj);

            return {
                keyVersion,
                sharedKeyObj,
            };
        } catch (error: any) {
            const errorCodeServer =  error.error.errorCode;
            if(errorCodeServer === E2EEErrorCode.SERVER_VAULT_NOT_FOUND) {
                console.log('establish');
            }
            throw error;
        }
    }
}
