import { isPlatformBrowser } from '@angular/common';
import { Component, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { CallSessionData, DIRECT_CALL, GROUP_CALL } from '../../models/callSessionData.model';
import { AuthService } from '../../services/authService';
import { CallService } from '../../services/callService';
import { CallStateService } from '../../services/callStateService';
import { WebRtcService } from '../../services/webRTCService';

@Component({
    selector: 'app-incomming-call-layout',
    imports: [],
    templateUrl: './incommingCallLayout.html',
    styleUrl: './incommingCallLayout.css',
})
export class IncommingCallLayout {
    webRTCService = inject(WebRtcService);
    callService = inject(CallService);
    callState = inject(CallStateService);
    authService = inject(AuthService);
    callSessionData = signal<CallSessionData | null>(null);
    userId = '';
    ringtone: HTMLAudioElement | undefined;

    private vibrateIntervalId: number | null = null;
    private platformId = inject(PLATFORM_ID);

    readonly directCallType = DIRECT_CALL;
    readonly groupCallType = GROUP_CALL;
    readonly avatarUrlDefault = '/assets/AvatarDefault.jpg';

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.ringtone = new Audio('assets/sounds/ringtone.mp3');
            this.ringtone.loop = true;
        }

        effect(() => {
            const callSessionData = this.callState.callSessionData();
            const callStatus = this.callState.callStatus();
            const isCaller = this.callState.isCaller();
            this.userId = this.authService.getUserId();

            if (callSessionData && callStatus === 'ringing' && !isCaller && callSessionData.inviterId !== this.userId) {
                this.callSessionData.set(callSessionData);
                this.playRingTone();
                this.startVibrating();
            } else {
                this.callSessionData.set(null);
                this.stopRingtone();
                this.stopVibrating();
            }
        });
    }

    playRingTone() {
        // if (this.ringtone) {
        //     this.ringtone.play().catch((error) => {
        //         console.warn(error);
        //     });
        // }
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
        if (!this.callSessionData) return;
        const { conversationType, conversationId } = this.callSessionData()!;
        if (!conversationType || !conversationId) return;

        this.stopRingtone();
        this.stopVibrating();

        console.log('handleAccept:::', conversationType);

        if (conversationType === this.groupCallType) {
            console.log('groupCallType:::', conversationId);
            this.callService
                .joinCall(conversationId) // Tạo message system tham gia cuộc gọi
                .subscribe({
                    next: (res) => {
                        const {userName, userAvatarUrl} = this.authService.getUserInfor();
                        const callMessage = {
                            ...res.metadata,
                            sender_name: userName,
                            sender_avatar: userAvatarUrl,
                        };
                        // Thông báo cho messageLayout cập nhật UI
                        this.callService.announceNewCallMessage(callMessage)
                        this.openCallWindow();
                    },
                    error: (error) => console.error(error),
                });
        } else this.openCallWindow();
    }

    handleDecline() {
        if (this.callSessionData) {
            const { conversationId, conversationType } = this.callSessionData()!;
            this.webRTCService.declineIncomingCall(conversationId, conversationType);
            this.callState.callSessionData.set(null);
            this.stopRingtone();
            this.stopVibrating();
        }
    }

    closeOverlay() {
        this.callState.callSessionData.set(null);
    }

    openCallWindow() {
        const listener = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data.type === 'getCallData') {
                const payload = {
                    type: 'sendCallData',
                    conversationType: this.callSessionData()?.conversationType,
                    conversationId: this.callSessionData()?.conversationId,
                    userId: this.userId,
                    ...(this.callSessionData()?.offer && { offer: this.callSessionData()?.offer }),
                    initializeVideo: this.callSessionData()?.initializeVideo,
                    inviterName: this.callSessionData()?.inviterName,
                    inviterAvatarUrl: this.callSessionData()?.inviterAvatarUrl,
                    inviterId: this.callSessionData()?.inviterId,
                };

                (event.source as Window)?.postMessage(payload, window.location.origin);

                window.removeEventListener('message', listener);
                this.callState.callSessionData.set(null);
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
