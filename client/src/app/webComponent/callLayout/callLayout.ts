import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
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

            const { conversationType, conversationId, userId, initializeVideo } = event.data;
            await this.authService.setUserInfor(userId);
            this.socketService.emit('joinConversation', conversationId);

            const mode = this.activatedRoute.snapshot.queryParamMap.get('mode');
            if (mode === 'accept') {
                const { offer } = event.data;
                this.webRTCService.acceptIncomingCall(conversationId, conversationType, offer, initializeVideo);
            } else this.webRTCService.call(conversationId, conversationType, initializeVideo);

            window.removeEventListener('message', listener);
        };

        window.addEventListener('message', listener);

        window.opener.postMessage({ type: 'getCallData' }, window.location.origin);
    }

    handleCancel() {
        this.webRTCService.end();
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
