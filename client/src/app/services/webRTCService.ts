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
    callState = inject(CallStateService);
    p2p = inject(P2PCallService);
    livekit = inject(LivekitCallService);
    socketService = inject(SocketService);
    authService = inject(AuthService);
    isDirectCall = true;

    // Expose signals for components
    callSessionData = this.callState.callSessionData;
    callEnded = this.callState.callEnded;
    isDeclined = this.callState.isDeclined;
    localStream = this.callState.localStream;
    remoteParticipants = this.callState.remoteParticipants;
    isCameraOn = this.callState.isCameraOn;
    isMicOn = this.callState.isMicOn;

    constructor() {
        // Client 2 nhận offer từ Client 1
        this.socketService.on('directCall:offerAwaiting', (data) => {
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
        this.socketService.on('call:missedCall', () => {
            if (this.callState.callSessionData()) {
                this.callState.callSessionData.update((curent) => {
                    if (!curent) return null;

                    return {
                        ...curent,
                        status: 'missed',
                    };
                });
            } else if (this.isDirectCall) {
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

        console.log('initializeVideo:', initializeVideo);

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

        if (conversationType === DIRECT_CALL) {
            this.isDirectCall = true;
            this.p2p.answerOffer(offer!);
        } else if (conversationType === GROUP_CALL) this.livekit.joinRoom({ isInviter: false });
    }

    declineIncomingCall(conversationId: string, conversationType: string) {
        if (conversationType === DIRECT_CALL)
            this.socketService.emit('call:endCall', this.callState.conversationId);
        this.socketService.emit('call:declineCall', conversationId);
        this.cleanupCall();
    }

    end() {
        this.socketService.emit('call:cancelCall', this.callState.conversationId);
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
}
