import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class Messages {
    private apiUrl = `${environment.apiUrl}/home/messages`;
    constructor(private http: HttpClient) {}

    // Lấy tất cả messages của users này
    getMessages(conversationId: string, limit: number = 50, offset: number = 0): Observable<any> {
        return this.http
            .get(`${this.apiUrl}/${conversationId}?limit=${limit}&offset=${offset}`)
            // .pipe(tap((data) => console.log('getMessages:::',data)));
    }

    postMessage(
        conversationId: string,
        senderId: string,
        content: string,
        replyTo?: string,
    ): Observable<any> {
        const body: any = { senderId, content };
        if (replyTo) body.parent_message_id = replyTo;
        return this.http.post(`${this.apiUrl}/${conversationId}`, body);
    }

    putMessage(messageId: string, content: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/${messageId}`, { content });
    }

    deleteMessage(messageId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${messageId}`);
    }

    pinMessage(message_id: string, conversation_id: string, pinned_by: string ,note: string, order_index: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/pinmessage`, { message_id, conversation_id, pinned_by, note, order_index });
    }

    unpinMessage(pinMessageId: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/pinmessage/${pinMessageId}`, { is_deleted: 'true' });
    }
}
