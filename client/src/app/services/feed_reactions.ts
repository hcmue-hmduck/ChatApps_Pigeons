import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class FeedReactions {
    private apiUrl = `${environment.apiUrl}/home/post-reactions`;
    private provinceApi = environment.ProvinceAPI;

    constructor(private http: HttpClient) {}

    addPostReaction(post_id: string, user_id: string, reaction_type: string, emoji_char: string): Observable<any> {
        return this.http.post(this.apiUrl, { post_id, user_id, reaction_type, emoji_char });
    }

    removePostReaction(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    getPostReactions(post_id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${post_id}`);
    }
}
