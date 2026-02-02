import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})

export class Conversation {
    private apiUrl = `${environment.apiUrl}/home/conversation`;
    constructor(private http: HttpClient) { }

    // Lấy tất cả conversations của users này
    getConversations(userId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${userId}`);
    }

    postConversation(participantIds: string[]): Observable<any> {
        return this.http.post(`${this.apiUrl}`, { participantIds });
    }

    putConversation(conversationId: string, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/${conversationId}`, data);
    }

    deleteConversation(conversationId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${conversationId}`);
    }
}