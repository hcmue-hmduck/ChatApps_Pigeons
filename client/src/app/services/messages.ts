import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})

export class Messages {
    private apiUrl = `${environment.apiUrl}/home/messages`;
    constructor(private http: HttpClient) { }

    // Lấy tất cả messages của users này
    getMessages(conversationId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${conversationId}`);
    }

    postMessage(conversationId: string, senderId:string, content: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${conversationId}`, { senderId, content });
    }

    putMessage(messageId: string, content: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/${messageId}`, { content });
    }

    deleteMessage(messageId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${messageId}`);
    }
}