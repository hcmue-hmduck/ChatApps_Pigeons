import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class BotMessages {
    private apiUrl = `${environment.apiUrl}/home/chatAI`;
    constructor(private http: HttpClient) { }

    getAnsMessages(userMessage: string): Observable<any> {
        return this.http.post(`${this.apiUrl}`, { userMessage })
    }
}
