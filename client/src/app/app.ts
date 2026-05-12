import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from './services/authService';
import { CallBroadcastService } from './services/callBroadcastService';
import { CallService } from './services/callService';
import { IncommingCallLayout } from './webComponent/incommingCallLayout/incommingCallLayout';
import { CryptoUtilityService } from './services/e2ee/cryptoUtilityService';
import { LocalDatabaseService } from './services/e2ee/localDatabaseService';
import { KeyManagementService } from './services/e2ee/keyManagementService';
import { E2EEMessageService } from './services/e2ee/e2eeMessageService';
import { SocketService } from './services/socket';

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
    router = inject(Router);
    socketService = inject(SocketService);

    // test service
    cryptoService = inject(CryptoUtilityService);
    localDBService = inject(LocalDatabaseService);
    keyMService = inject(KeyManagementService);
    e2eeMessageService = inject(E2EEMessageService);

    ngOnInit() {
        this.callBroadcastService.listenEvents((event) => {
            console.log(`callBroadcastService.listenEvents:::`, event);

            if (event.type === 'call_close') {
                const { call_id } = event.data;
                if (!call_id) console.error('params invalid');

                this.callService.updateStatus(call_id, 'ended');
            }
        });

        this.socketService.on('accountLocked', () => {
            console.log('Account has been locked by admin');
            this.authService.clearLocalUser();
            this.router.navigate(['/']).then(() => {
                setTimeout(() => {
                    alert('Tài khoản của bạn đã bị khóa bởi quản trị viên.');
                }, 500);
            });
        });

        if (!isPlatformBrowser(this.platformId)) return;

        try {
            const windowAny = window as any;
            windowAny.OneSignalDeferred = windowAny.OneSignalDeferred || [];
            windowAny.OneSignalDeferred.push(async (OneSignal: any) => {
                // OneSignal.Debug.setLogLevel('none');
                await OneSignal.init({
                    appId: 'a90c132a-bc7c-4bce-9dcf-7d4887ea6419',
                    allowLocalhostAsSecureOrigin: true,
                    serviceWorkerPath: 'OneSignalSDKWorker.js',
                });
                console.log(`Init OneSignal`);

                await OneSignal.Notifications.requestPermission();
                const permission = await OneSignal.Notifications.permission;

                const currentUser = this.authService.getUserInfor();
                if (currentUser && currentUser.id) {
                    if (OneSignal.login && typeof OneSignal.login === 'function') {
                        await OneSignal.login(String(currentUser.id));
                        console.log(`Login OneSignal`);
                    }
                }
            });
        } catch (error) {
            console.error(`Init OneSignal:`, error);
        }
    }
}
