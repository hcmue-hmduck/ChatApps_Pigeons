import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CallBroadcastService } from './services/callBroadcastService';
import { CallService } from './services/callService';
import { IncommingCallLayout } from './webComponent/incommingCallLayout/incommingCallLayout';
import { SidebarComponent } from './webComponent/sidebarComponent/sidebarComponent.component';
import { AuthService } from './services/authService';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, CommonModule, IncommingCallLayout],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class App implements OnInit {
    protected readonly title = signal('client');
    callBroadcastService = inject(CallBroadcastService);
    callService = inject(CallService);
    authService = inject(AuthService);
    platformId = inject(PLATFORM_ID);

    ngOnInit() {
        // Angular SSR gọi ngOnInit từ Node.js server (KHÔNG có Cookie)
        // sau đó Browser cũng gọi ngOnInit khi hydrate.
        // => 2 request refresh-token trong < 5 giây => Server chặn 429.
        // isPlatformBrowser đảm bảo chỉ gọi trên Browser thực sự.
        if (isPlatformBrowser(this.platformId)) {
            this.authService.refreshToken().subscribe({
                next: () => {
                    console.log('Phiên đăng nhập đã được khôi phục thành công.');
                },
                error: (error) => {
                    if (error.status === 401) {
                        console.log('Chưa đăng nhập (Phiên hết hạn).');
                    } else {
                        console.error('Lỗi khi kiểm tra phiên đăng nhập:', error);
                    }
                },
            });
        }
        
        this.callBroadcastService.listenEvents((event) => {
            console.log(`callBroadcastService.listenEvents:::`, event);

            if (event.type === 'call_close') {
                const { call_id } = event.data;
                if (!call_id) console.error('params invalid');

                this.callService.updateStatus(call_id, 'ended');
            }
        });
    }
}
