import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/authService';
import { SocketService } from '../../services/socket';
import { CallStateService } from '../../services/callStateService';
import { WebRtcService } from '../../services/webRTCService';

@Component({
    selector: 'app-call-layout',
    imports: [],
    templateUrl: './callLayout.html',
    styleUrl: './callLayout.css',
})
export class CallLayoutComponent implements OnInit {
    webRTCService = inject(WebRtcService);
    socketService = inject(SocketService);
    authService = inject(AuthService);
    activatedRoute = inject(ActivatedRoute);
    callState = inject(CallStateService);

    readonly avatarUrlDefault = '/assets/AvatarDefault.jpg';

    userAvatarUrl = computed<string>(() => {
        return this.authService.getUserInfor().userAvatarUrl;
    });

    remoteCount = computed<number>(() => {
        return this.callState.remoteParticipants().length;
    });

    totalCount = computed<number>(() => {
        return this.remoteCount() + (this.callState.localStream() ? 1 : 0);
    });

    isWaiting = computed(() => {
        return this.totalCount() === 1;
    });

    isTwoPeople = computed(() => {
        return this.totalCount() === 2;
    });

    isGroupCall = computed(() => {
        return this.totalCount() > 2;
    });

    ngOnInit(): void {
        const navigation = performance.getEntriesByType(
            'navigation',
        )[0] as PerformanceNavigationTiming; // Type Assertion
        if (navigation && navigation.type === 'reload') {
            // Nếu reload trang thì không Gọi
            return;
        }

        const listener = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data.type !== 'sendCallData') return;

            const {
                conversationType,
                conversationId,
                userId,
                initializeVideo,
                inviterName,
                inviterId,
                inviterAvatarUrl,
                callId
            } = event.data;
            await this.authService.setUserInfor(userId);
            this.socketService.emit('joinConversation', conversationId);

            const mode = this.activatedRoute.snapshot.queryParamMap.get('mode');
            if (mode === 'accept') {
                const { offer } = event.data;
                this.webRTCService.acceptIncomingCall(
                    conversationId,
                    conversationType,
                    callId,
                    offer,
                    initializeVideo,
                    inviterName,
                    inviterId,
                    inviterAvatarUrl,
                );
            } else this.webRTCService.call(conversationId, conversationType, callId, initializeVideo);

            window.removeEventListener('message', listener);
        };

        window.addEventListener('message', listener);

        window.opener.postMessage({ type: 'getCallData' }, window.location.origin);
    }

    endCall() {
        // this.webRTCService.end();
        console.log('RemoteParticipant:::', this.callState.remoteParticipants());
    }

    toggleCamera() {
        this.webRTCService.toggleCamera();
    }

    toggleMicrophone() {
        this.webRTCService.toggleMicrophone();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        // event.preventDefault();
    }

    @HostListener('window:unload')
    onUnload() {
        this.webRTCService.end();
    }
}
