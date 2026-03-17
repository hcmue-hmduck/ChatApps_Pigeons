import { inject, Injectable, signal } from '@angular/core';
import { User } from './user';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { LoginPayload, SignupPayload } from '../models/authData';

interface UserInfor {
    id: string;
    name: string;
    avatarUrl: string;
    email: string;
    role: string;
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private user = signal<UserInfor>({
        id: '',
        name: '',
        avatarUrl: '',
        email: '',
        role: '',
    });
    private apiUrl = `${environment.apiUrl}/access`;

    userService = inject(User);
    httpClient = inject(HttpClient);

    async setUserInfo(userId: string) {
        try {
            const { metadata } = await firstValueFrom(this.userService.getUserById(userId));
            const { id, full_name, avatar_url, role, email } = metadata.userInfor;
            this.user.set({
                id,
                name: full_name,
                avatarUrl: avatar_url,
                role,
                email,
            });
            console.log('Đã setUserInfor: ', { id, full_name, avatar_url, role, email });
        } catch (error) {
            console.log('Lỗi setUserInfor:::');
            throw error;
        }
    }

    getUserId() {
        return this.user().id;
    }

    getUserInfor() {
        return this.user();
    }

    login(payload: LoginPayload): Observable<any> {
        return this.httpClient.post(`${this.apiUrl}/login`, payload);
    }

    signup(payload: SignupPayload): Observable<any> {
        return this.httpClient.post(`${this.apiUrl}/signup`, payload);
    }

    logout(): Observable<any> {
        return this.httpClient.post(`${this.apiUrl}/logout`, {});
    }

    refreshToken(): Observable<any> {
        return this.httpClient.post(`${this.apiUrl}/refresh-token`, {})
    }

    googleLogin(): Observable<any> {
        return this.httpClient.get(`${this.apiUrl}/google`)
    }
}
