import { inject, Injectable } from '@angular/core';
import { LocalDatabaseService } from './localDatabaseService';
import { KeyManagementService } from './keyManagementService';
import { AuthService } from '../authService';

@Injectable({
    providedIn: 'root',
})
export class E2EEMessageService {
    localDB = inject(LocalDatabaseService);
    keyManagementService = inject(KeyManagementService);
    authService = inject(AuthService);

    userId = ''

    constructor() {
        this.userId = this.authService.getUserId();
    }

    sendMessage(conversationId: string, message: string) {
        
    }
}
