import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class Friend {
    private apiUrl = `${environment.apiUrl}/home/friends`;
    constructor(private http: HttpClient) {}

    getFriendByUserId(userId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${userId}`);
    }

    createFriend(friendData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}`, friendData);
    }
}