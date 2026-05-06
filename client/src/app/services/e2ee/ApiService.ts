import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Base64String } from './cryptoUtilityService';

export interface SetupKeysPayload {
    public_key: Base64String;
    wrapped_private_key: Base64String;
    kek_iv: Base64String;
    pin_salt: Base64String;
}

export interface SharedKeyVaultPayload {
    user_id: string;
    conversation_id: string;
    wrapped_shared_key: Base64String;
    key_version: number;
}

@Injectable({
    providedIn: 'root',
})
export class E2eeApiService {
    apiUrl = environment.apiUrl + '/e2ee';
    httpClient = inject(HttpClient);

    setupKeys(setupKeys: SetupKeysPayload) {
        return this.httpClient.post<any>(`${this.apiUrl}/setup`, setupKeys);
    }

    getMyKeys() {
        return this.httpClient.get<any>(`${this.apiUrl}/get/keys`);
    }

    getPublicKeys(participant_ids: string[]) {
        return this.httpClient.post<any>(`${this.apiUrl}/get/public-keys`, { participant_ids });
    }

    addSharedKeysVault(shared_keys_vault: SharedKeyVaultPayload[]) {
        return this.httpClient.post(`${this.apiUrl}/shared-keys`, { shared_keys_vault });
    }

    getSharedKey(conversation_id: string, key_version: number) {
        return this.httpClient.post<any>(`${this.apiUrl}/get/shared-key`, {
            conversation_id,
            key_version,
        });
    }

    getSharedKeys() {
        return this.httpClient.get<any>(`${this.apiUrl}/get/shared-keys`);
    }
}
