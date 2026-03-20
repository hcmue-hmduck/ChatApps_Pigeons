import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class MessageReactions {
    private apiUrl = `${environment.apiUrl}/home/message-reactions`;
    constructor(private http: HttpClient) { }

    getMessageReactions(convID: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${convID}`);
    }

    addMessageReaction(convID: string, messageID: string, reaction: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/${convID}/${messageID}`, reaction);
    }
}