import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Base64String } from './cryptoUtilityService';

export interface SetupKeysPayload {
    public_key: Base64String;
    wrapped_private_key: Base64String;
    kek_iv: Base64String;
    pin_salt: Base64String;
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
}
