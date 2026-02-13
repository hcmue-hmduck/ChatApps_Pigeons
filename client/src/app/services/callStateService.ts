import { Injectable, signal } from '@angular/core';
import { CallSessionData } from '../models/callSessionData.model';

export interface RemoteParticipant {
    participantId: string;
    participantName: string;
    participantAvatarUrl: string;
    stream: MediaStream;
}

// const DIRECT_CALL = 'direct',
//     GROUP_CALL = 'group';

@Injectable({
    providedIn: 'root',
})
export class CallStateService {
    callSessionData = signal<CallSessionData | null>(null);
    callEnded = signal<boolean>(false);
    isDeclined = signal<boolean>(false);
    localStream = signal<MediaStream | null>(null);
    remoteParticipants = signal<RemoteParticipant[]>([]);
    isCameraOn = signal<boolean>(true);
    isMicOn = signal<boolean>(true);
    conversationId = '';
    conversationType = '';

    cleanUp() {
        this.localStream()
            ?.getTracks()
            .forEach((track) => track.stop());

        this.remoteParticipants().forEach(({ stream }) => {
            stream.getTracks().forEach((track) => track.stop());
        });

        this.callSessionData.set(null);
        this.callEnded.set(true);
        this.isDeclined.set(false);
        this.localStream.set(null);
        this.remoteParticipants.set([]);
        this.isCameraOn.set(true);
        this.isMicOn.set(true);
        this.conversationId = '';
        this.conversationType = '';
    }

    addVideoTrackToLocalStream(videoTrack: MediaStreamTrack) {
        const localStream = this.localStream();
        localStream?.addTrack(videoTrack);
        this.localStream.set(localStream);
    }

    removeVideoTrackFromLocalStream() {
        const localStream = this.localStream();
        const videoTrack = localStream?.getVideoTracks();
        videoTrack?.forEach((track) => localStream?.removeTrack(track));
        this.localStream.set(localStream);
    }
}
