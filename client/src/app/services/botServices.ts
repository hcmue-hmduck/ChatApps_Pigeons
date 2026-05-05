import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class BotServices {
    private apiUrl = `${environment.apiUrl}/bot`;
    constructor(private http: HttpClient) { }

    createBot(full_name: string, bot_name: string) {
        return this.http.post(`${this.apiUrl}`, {full_name, bot_name});
    }

    getBotList() {
        return this.http.get(`${this.apiUrl}`);
    }

    updateBot(botId: string, data: { webhook_url?: string }) {
        return this.http.put(`${this.apiUrl}/${botId}`, data);
    }

    getBotById(botId: string) {
        return this.http.get(`${this.apiUrl}/${botId}`);
    }

    postMessageToWebhook(botUserId: string, data: any) {
        return this.http.post(`${this.apiUrl}/${botUserId}/webhook`, data);
    }
}
