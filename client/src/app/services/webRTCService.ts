import { inject, Injectable } from '@angular/core';
import { DIRECT_CALL, GROUP_CALL } from '../models/callSessionData.model';
import { AuthService } from './authService';
import { CallStateService } from './callStateService';
import { LivekitCallService } from './livekitCallService';
import { P2PCallService } from './p2pCallService';
import { SocketService } from './socket';

@Injectable({
    providedIn: 'root',
})
export class WebRtcService {
    private callState = inject(CallStateService);
    private p2p = inject(P2PCallService);
    private livekit = inject(LivekitCallService);
    private socketService = inject(SocketService);
    private authService = inject(AuthService);
    private isDirectCall = true;

    constructor() {
        this.socketService.on('call:busyUpdated', (data) => {
            if (data.userId === this.authService.getUserId()) {
                this.callState.isBusy.set(data.isBusy);
            }
        });

        this.socketService.on('call:cleanup', (userId) => {
            if (this.authService.getUserId() === userId) {
                this.cleanupCall();
            }
        });

        // Nhận tín hiệu kết thúc cuộc gọi
        this.socketService.on('call:endCall', () => {
            this.cleanupCall();
        });

        // Gọi nhỡ
        this.socketService.on('call:missedCall', (conversationId) => {
            if (this.callState.callSessionData()) {
                this.callState.callSessionData.update((curent) => {
                    if (!curent) return null;

                    return {
                        ...curent,
                        status: 'missed',
                    };
                });
            } else if (this.isDirectCall && this.callState.conversationId === conversationId) {
                this.cleanupCall();
            }
        });

        // Bị từ chối
        this.socketService.on('call:declineCall', () => {
            this.callState.isDeclined.set(true);
        });
    }

    call(conversationId: string, conversationType: string, initializeVideo: boolean) {
        this.callState.conversationId = conversationId;
        this.callState.conversationType = conversationType;
        this.callState.isCameraOn.set(initializeVideo);

        this.updateUserBusyState(true);

        if (conversationType === DIRECT_CALL) {
            this.isDirectCall = true;
            this.p2p.call();
        } else if (conversationType === GROUP_CALL) {
            this.livekit.call();
        } else {
            console.log('Error: conversation type invalid');
            return;
        }
    }

    acceptIncomingCall(
        conversationId: string,
        conversationType: string,
        offer: RTCSessionDescriptionInit | null,
        initializeVideo: boolean,
        // for P2P
        inviterName: string,
        inviterId: string,
        inviterAvatarUrl: string,
    ) {
        console.log('Accept incomming call');
        this.callState.conversationId = conversationId;
        this.callState.conversationType = conversationType;
        this.callState.isCameraOn.set(initializeVideo);

        this.updateUserBusyState(true);

        if (conversationType === DIRECT_CALL) {
            this.isDirectCall = true;
            this.p2p.answerOffer(offer!, inviterName, inviterId, inviterAvatarUrl);
        } else if (conversationType === GROUP_CALL) this.livekit.joinRoom({ isInviter: false });
    }

    declineIncomingCall(conversationId: string, conversationType: string) {
        if (conversationType === DIRECT_CALL) {
            this.socketService.emit('call:endCall', this.callState.conversationId);
            this.socketService.emit('call:declineCall', conversationId);
        }
        this.cleanupCall();
    }

    end() {
        this.socketService.emit('call:cancelCall', this.callState.conversationId);

        this.socketService.emit('call:cleanup', {
            conversationId: this.callState.conversationId,
            userId: this.authService.getUserId(),
        });

        this.cleanupCall();
    }

    toggleCamera() {
        if (this.callState.conversationType === GROUP_CALL) {
            return this.livekit.toggleCamera();
        } else {
            return this.p2p.toggleCamera();
        }
    }

    toggleMicrophone() {
        if (this.callState.conversationType === GROUP_CALL) {
            return this.livekit.toggleMicrophone();
        } else {
            return this.p2p.toggleMicrophone();
        }
    }

    cleanupCall() {
        this.callState.cleanUp();
        this.p2p.cleanUp();
        this.livekit.cleanUp();
    }

    updateUserBusyState(isBusy: boolean) {
        this.socketService.emit('call:busyUpdated', {
            conversationId: this.callState.conversationId,
            userId: this.authService.getUserId(),
            isBusy: isBusy,
        });
    }
}
