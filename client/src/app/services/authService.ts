import { inject, Injectable, signal } from '@angular/core';
import { User } from './user';
import { firstValueFrom } from 'rxjs';

interface UserInfor {
    userId: string;
    userName: string;
    userAvatarUrl: string;
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private user = signal<UserInfor>({
        userId: '',
        userName: '',
        userAvatarUrl: '',
    });

    userService = inject(User);

    async setUserInfor(userId: string) {
        try {
            const { metadata } = await firstValueFrom(this.userService.getUserById(userId));
            const { id, full_name, avatar_url } = metadata;
            this.user.set({
                userId: id,
                userName: full_name,
                userAvatarUrl: avatar_url,
            });
            console.log('Đã setUserInfor...');
        } catch (error) {
            console.log('Lỗi setUserInfor:::');
            throw error;
        }
    }

    getUserId() {
        return this.user().userId;
    }

    getUserInfor() {
        return this.user();
    }
}
