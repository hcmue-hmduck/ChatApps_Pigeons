import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../authService';
import { CryptoUtilityService } from './cryptoUtilityService';
import { E2eeApiService, SetupKeysPayload } from './e2eeApiService';
import { LocalDatabaseService } from './localDatabaseService';

@Injectable({
    providedIn: 'root',
})
export class KeyManagementService {
    private cryptoUtil = inject(CryptoUtilityService);
    private localDB = inject(LocalDatabaseService);
    private e2eeApiService = inject(E2eeApiService);
    private userId: string | null = null;

    constructor(private authService: AuthService) {
        if (typeof window !== 'undefined') {
            (window as any).TestKeyMService = this;
        }
        this.userId = authService.getUserId();
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

            await this.localDB.saveOwnKey({ userId: this.userId!, publicKeyBase64, privateKeyObj });

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

    async changePIN(pin: string) {
        try {
            const pinSalt = await this.cryptoUtil.generateRandomSalt();
            const kek = await this.cryptoUtil.deriveKEKFromPIN(pin, pinSalt.buffer);
            const ownKeys = await this.localDB.getOwnKey(this.userId!);
            if (!ownKeys) throw new Error('Thiết bị chưa thiết lập mã hóa E2EE');

            const { publicKeyBase64, privateKeyObj } = ownKeys;
            const wrappedObj = await this.cryptoUtil.wrapKey(privateKeyObj, kek);

            const wrappedPrivateKey = wrappedObj.wrappedKey;
            const kekIV = wrappedObj.iv;

            const payload: SetupKeysPayload = {
                public_key: publicKeyBase64,
                wrapped_private_key: wrappedPrivateKey,
                kek_iv: kekIV!,
                pin_salt: this.cryptoUtil.arrayBufferToBase64(pinSalt.buffer),
            };

            return await firstValueFrom(this.e2eeApiService.setupKeys(payload));
        } catch (error) {
            console.error(`changePIN:::`, error);
            throw error;
        }
    }
}
