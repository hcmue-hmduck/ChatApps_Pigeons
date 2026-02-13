import { isPlatformBrowser } from '@angular/common';
import { Component, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { CallSessionData } from '../../models/callSessionData.model';
import { AuthService } from '../../services/authService';
import { WebRtcService } from '../../services/webRTCService';

@Component({
    selector: 'app-incomming-call-layout',
    imports: [],
    templateUrl: './incommingCallLayout.html',
    styleUrl: './incommingCallLayout.css',
})
export class IncommingCallLayout {
    webRTCService = inject(WebRtcService);
    authService = inject(AuthService);
    callSessionData = signal<CallSessionData | null>(null);
    userId = '';
    ringtone: HTMLAudioElement | undefined;
    private vibrateIntervalId: number | null = null;
    private platformId = inject(PLATFORM_ID);

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.ringtone = new Audio('sounds/ringtone.mp3');
            this.ringtone.loop = true;
        }

        effect(() => {
            const callSessionData = this.webRTCService.callSessionData();
            this.userId = this.authService.getUserId();

            if (callSessionData && callSessionData.inviterId !== this.userId) {
                this.callSessionData.set(callSessionData);
                if (callSessionData?.status === 'comming') {
                    this.playRingTone();
                    this.startVibrating();
                } else {
                    this.stopRingtone();
                    this.stopVibrating();
                }
            } else this.callSessionData.set(null);
        });
    }

    playRingTone() {
        if (this.ringtone) {
            this.ringtone.play().catch((error) => {
                console.warn(error);
            });
        }
    }

    stopRingtone() {
        if (this.ringtone) {
            this.ringtone.pause();
            this.ringtone.currentTime = 0; // Quay lại đầu file
        }
    }

    startVibrating() {
        navigator.vibrate([1000, 1000]);
        if (navigator.vibrate) {
            this.vibrateIntervalId = window.setInterval(() => {
                navigator.vibrate([1000, 2000]);
            }, 3000);
        }
    }

    stopVibrating() {
        if (this.vibrateIntervalId) {
            window.clearInterval(Number(this.vibrateIntervalId));
            this.vibrateIntervalId = null;
        } else navigator.vibrate(0);
    }

    handleAccept() {
        if (this.callSessionData) {
            const { initializeVideo } = this.callSessionData()!;
            this.openCallWindow({ initializeVideo });
            this.stopRingtone();
            this.stopVibrating();
        }
    }

    handleDecline() {
        if (this.callSessionData) {
            const { conversationId, conversationType } = this.callSessionData()!;
            this.webRTCService.declineIncomingCall(conversationId, conversationType);
            this.webRTCService.callSessionData.set(null);
            this.stopRingtone();
            this.stopVibrating();
        }
    }

    closeOverlay() {
        this.webRTCService.callSessionData.set(null);
    }

    openCallWindow({ initializeVideo }: { initializeVideo: boolean }) {
        const listener = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data.type === 'getCallData') {
                const payload = {
                    type: 'sendCallData',
                    conversationType: this.callSessionData()?.conversationType,
                    conversationId: this.callSessionData()?.conversationId,
                    userId: this.userId,
                    ...(this.callSessionData()?.offer && { offer: this.callSessionData()?.offer }),
                    initializeVideo,
                };

                (event.source as Window)?.postMessage(payload, window.location.origin);

                window.removeEventListener('message', listener);
                this.webRTCService.callSessionData.set(null);
            }
        };

        window.addEventListener('message', listener);

        const width = 1200,
            height = 700,
            left = window.screen.width / 2 - width / 2,
            top = window.screen.height / 2 - height / 2,
            features = `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,resizable=yes`;

        window.open(
            `/call-display?mode=accept`, // url
            'CallWindow', // window name
            features,
        );
    }
}
