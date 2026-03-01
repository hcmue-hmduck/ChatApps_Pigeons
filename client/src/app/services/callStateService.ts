import { Injectable, signal } from '@angular/core';
import { CallSessionData, GROUP_CALL } from '../models/callSessionData.model';

export interface RemoteParticipant {
    participantId: string;
    participantName: string;
    participantAvatarUrl: string;
    audioStream: MediaStream;
    videoStream: MediaStream;
    hasAudio: boolean;
    hasVideo: boolean;
}

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
    isRemoteBusy = signal<boolean>(false);
    isBusy = signal<boolean>(false);

    conversationId = '';
    conversationType = '';
    callId = '';

    cleanUp() {
        this.localStream()
            ?.getTracks()
            .forEach((track) => track.stop());

        this.remoteParticipants().forEach(({ audioStream, videoStream }) => {
            audioStream.getTracks().forEach((track) => track.stop());
            videoStream.getTracks().forEach((track) => track.stop());
        });

        this.callSessionData.set(null);
        this.callEnded.set(true);
        this.isDeclined.set(false);
        this.localStream.set(null);
        this.remoteParticipants.set([]);
        this.isCameraOn.set(true);
        this.isMicOn.set(true);
        this.isBusy.set(false);
        this.isRemoteBusy.set(false);
        this.conversationId = '';
        this.conversationType = '';
        this.callId = '';

        console.log('clean up call state', this.isRemoteBusy());
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

    extractAudioStream(stream: MediaStream) {
        const audioStream = new MediaStream();
        const audioTrack = stream.getAudioTracks();

        if (audioTrack) audioTrack.forEach((track) => audioStream.addTrack(track));
        return audioStream;
    }

    extractVideoStream(stream: MediaStream) {
        const videoStream = new MediaStream();
        const videoTrack = stream.getVideoTracks();

        if (videoTrack) videoTrack.forEach((track) => videoStream.addTrack(track));
        return videoStream;
    }

    getGroupName() {
        if(this.conversationType !== GROUP_CALL) return ''
        return ''
    } 
}
