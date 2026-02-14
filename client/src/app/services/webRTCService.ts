import { inject, Injectable } from '@angular/core';
import { AuthService } from './authService';
import { CallStateService } from './callStateService';
import { LivekitCallService } from './livekitCallService';
import { P2PCallService } from './p2pCallService';
import { SocketService } from './socket';

const DIRECT_CALL = 'direct',
    GROUP_CALL = 'group';

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

        // Client 2 nhận offer từ Client 1
        // instance này ở tab cha
        this.socketService.on('directCall:offerAwaiting', (data) => {
            const userId = this.authService.getUserId();
            if (userId === data.inviterId) return;

            console.log('Receive offer...');
            if (this.callState.isBusy()) {
                this.socketService.emit('directCall:remoteBusy', {
                    conversationId: data.conversationId,
                    remoteId: userId,
                });
                console.log('emit cho thằng kia, remote là ', userId);
                return;
            }

            this.callState.conversationId = data.conversationId;
            this.p2p.setFriendInfo(data.inviterName, data.inviterAvatarUrl);

            this.callState.callSessionData.set({
                conversationId: data.conversationId,
                conversationType: DIRECT_CALL,
                inviterName: data.inviterName,
                inviterAvatarUrl: data.inviterAvatarUrl,
                inviterId: data.inviterId,
                offer: data.offer,
                status: 'comming',
                initializeVideo: data.initializeVideo,
            });
        });

        // Client 1 nhận answer từ Client 2
        this.socketService.on('directCall:answerResponse', async (data) => {
            await this.p2p.handleAnswer(data);
        });

        // Nhận ICE candidate từ client kia
        this.socketService.on('directCall:newIceCandidate', (iceCandidate) => {
            this.p2p.addIceCandidate(iceCandidate);
        });

        this.socketService.on('directCall:remoteBusy', (remoteId) => {
            if (this.authService.getUserId() !== remoteId) {
                this.callState.isRemoteBusy.set(true);
                console.log('set remote busy:::', remoteId);
            }
        });

        this.socketService.on('call:cleanup', (userId) => {
            if (this.authService.getUserId() === userId) {
                this.cleanupCall();
            }
        });

        // SFU join room
        this.socketService.on('groupCall:joinRoom', (data) => {
            this.callState.conversationId = data.conversationId;
            this.callState.callSessionData.set({
                conversationId: data.conversationId,
                conversationType: GROUP_CALL,
                inviterName: data.inviterName,
                inviterAvatarUrl: data.inviterAvatarUrl,
                inviterId: data.inviterId,
                status: 'comming',
                initializeVideo: data.initializeVideo,
            });
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
    ) {
        console.log('Accept incomming call');
        this.callState.conversationId = conversationId;
        this.callState.conversationType = conversationType;
        this.callState.isCameraOn.set(initializeVideo);

        this.updateUserBusyState(true);

        if (conversationType === DIRECT_CALL) {
            this.isDirectCall = true;
            this.p2p.answerOffer(offer!);
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
