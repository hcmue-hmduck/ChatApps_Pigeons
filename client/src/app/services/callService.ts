import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './authService';
import { sign } from 'crypto';

@Injectable({
    providedIn: 'root',
})
export class CallService {
    private apiUrl = `${environment.apiUrl}/home/call`;
    private httpClient = inject(HttpClient);
    private authService = inject(AuthService);
    private CALL_TYPE = ['group', 'direct'];

    newCallMessage = signal<any>(null);

    startCall(
        conversation_id: string,
        call_type: string,
        media_type: 'video' | 'audio',
    ): Observable<any> {
        if (!this.CALL_TYPE.includes(call_type))
            return throwError(() => new Error('Cannot start call'));
        const caller_id = this.authService.getUserId();
        if (!caller_id) return throwError(() => new Error('Cannot start call'));
        return this.httpClient.post(`${this.apiUrl}/${conversation_id}`, {
            caller_id,
            call_type,
            media_type,
        });
    }

    joinCall(conversation_id: string): Observable<any> {
        const user_id = this.authService.getUserId();
        if (!user_id) return throwError(() => new Error('Cannot accept call'));
        return this.httpClient.post(`${this.apiUrl}/accept/${conversation_id}`, { user_id });
    }

    announceNewCallMessage(callMessage: any) {
        this.newCallMessage.set(callMessage);
    }
}
