import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    private socket?: Socket;
    platformId = inject(PLATFORM_ID);

    constructor() {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.socket = io(environment.apiUrl);

        this.socket.on('connect', () => {
            console.log('Đã kết nối Socket.io thành công với ID:', this.socket?.id);
        });
    }

    emit (event: string, data: any) {
        this.socket?.emit(event, data);
    }

    on(event: string, callback: (data: any) => void) {
        this.socket?.on(event, callback);
    }
    
    off(event: string, callback?: (data: any) => void) {
        if (callback) {
            this.socket?.off(event, callback);
        } else {
            this.socket?.off(event);
        }
        console.log(`Đã ngắt kết nối sự kiện: ${event}`);
    }
}