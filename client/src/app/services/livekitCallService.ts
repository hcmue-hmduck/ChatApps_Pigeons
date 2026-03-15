import { inject, Injectable } from '@angular/core';
import { Room, Track } from 'livekit-client';
import { environment } from '../../environments/environment';
import { AuthService } from './authService';
import { CallStateService } from './callStateService';
import { LivekitService } from './livekitService';
import { SocketService } from './socket';
import { lastValueFrom } from 'rxjs';
import { GROUP_CALL } from '../models/callData';
import { Conversation } from './conversation';
import { CallService } from './callService';

@Injectable({
    providedIn: 'root',
})
export class LivekitCallService {
    private livekitService = inject(LivekitService);
    private socketService = inject(SocketService);
    private callState = inject(CallStateService);
    private authService = inject(AuthService);
    private conversationService = inject(Conversation);
    private callService = inject(CallService);

    private wsUrl = environment.livekit_wsUrl;
    private room: Room | null = null;
    private localLiveKitStream: MediaStream | null = null;
    private remoteParticipantsMap = new Map<string, any>();

    constructor() {
        this.socketService.on('groupCall:joinRoom', async (data) => {
            const userId = this.authService.getUserId();
            // Chỉ callee (người được gọi) mới hiển thị modal incoming call
            if (userId === data.inviterId) return;

            this.callState.callStatus.set('ringing');

            const res = await lastValueFrom(
                this.conversationService.getConversationNameById(data.conversationId),
            );
            const groupName = res?.metadata?.name;

            this.callState.callSessionData.set({
                conversationId: data.conversationId,
                conversationType: GROUP_CALL,
                callId: data.callId,
                inviterName: data.inviterName,
                inviterAvatarUrl: data.inviterAvatarUrl,
                inviterId: data.inviterId,
                initializeVideo: data.initializeVideo,
                groupName,
            });
        });
    }

    call() {
        this.joinRoom({ isInviter: true });
    }

    end() {
        const callStatus = this.callState.callStatus();
        const callId = this.callState.callId;
        const countParticipant = this.room?.remoteParticipants.size;

        if (countParticipant === 0) {
            if (callStatus === 'ringing') this.callService.updateStatus(callId, 'cancelled');
            else if (callStatus === 'connected') this.callService.updateStatus(callId, 'completed');
        }

        this.cleanUp();
        this.callState.callStatus.set('ended');
        this.callState.syncCallStateToParent();
        this.callState.cleanUp({ resetCallStatus: false });
    }

    cleanUp() {
        this.room?.disconnect();
        this.room = null;
        this.localLiveKitStream = null;
        this.remoteParticipantsMap.clear();
    }

    async joinRoom({ isInviter = false }) {
        const { id, name, avatarUrl } = this.authService.getUserInfor();

        this.livekitService
            .getAccessToken(this.callState.conversationId, id, name, avatarUrl)
            .subscribe({
                next: async ({ metadata }) => {
                    const token = metadata.token;

                    this.room = new Room();
                    this.listenEvent();

                    await this.room.connect(this.wsUrl, token);

                    // livekit tự động publish track luôn
                    const initializeVideo = this.callState.isCameraOn();
                    if (initializeVideo)
                        await this.room.localParticipant.enableCameraAndMicrophone();
                    else {
                        await this.room.localParticipant.setMicrophoneEnabled(true);
                    }

                    this.updateRemoteParticipants();
                    this.callState.callStatus.set('connected');
                    this.callState.syncCallStateToParent();

                    if (isInviter)
                        this.socketService.emit('groupCall:inviteToJoinTheRoom', {
                            conversationId: this.callState.conversationId,
                            callId: this.callState.callId,
                            inviterId: id,
                            inviterName: name,
                            inviterAvatarUrl: avatarUrl,
                            initializeVideo: this.callState.isCameraOn(),
                        });

                    if (isInviter) {
                        this.callState.callStatus.set('ringing');
                        this.callState.isCaller.set(true);
                        this.callState.syncCallStateToParent();
                    }
                },
                error: (error) => {
                    console.log('Error join room live kit server');
                    this.callState.callStatus.set('failed');
                    this.callState.syncCallStateToParent();
                    throw error;
                },
            });
    }

    updateRemoteParticipants() {
        // Array.from(this.remoteStreamsMap.entries()) -> [[key, value], [key, value],...]
        const participants = Array.from(this.remoteParticipantsMap.entries()).map(
            ([participantId, { participantName, participantAvatarUrl, stream }]) => ({
                participantId,
                participantName,
                participantAvatarUrl,
                audioStream: this.callState.extractAudioStream(stream),
                videoStream: this.callState.extractVideoStream(stream),
                hasAudio: stream.getAudioTracks().length > 0,
                hasVideo: stream.getVideoTracks().length > 0,
            }),
        );

        this.callState.remoteParticipants.set(participants);
    }

    listenEvent() {
        // Khi local track được publish
        this.room?.on('localTrackPublished', (publication) => {
            if (publication.source === 'camera' || publication.source === 'microphone') {
                const mediaTrack = publication.track?.mediaStreamTrack;
                if (mediaTrack) {
                    if (this.localLiveKitStream === null)
                        this.localLiveKitStream = new MediaStream();

                    this.localLiveKitStream.addTrack(mediaTrack);
                    this.callState.localStream.set(this.localLiveKitStream);
                }
            }
        });

        this.room?.on('localTrackUnpublished', (publication) => {
            const mediaTrack = publication.track?.mediaStreamTrack;
            if (mediaTrack && this.localLiveKitStream) {
                this.localLiveKitStream.removeTrack(mediaTrack);
                this.callState.localStream.set(this.localLiveKitStream);
            }
        });

        // khi nhận track từ client khác
        this.room?.on('trackSubscribed', (track, publication, participant) => {
            const participantId = participant.identity || participant.sid;
            if (!this.remoteParticipantsMap.has(participantId)) {
                const { participantName, participantAvatarUrl } = JSON.parse(
                    String(participant.metadata),
                );
                this.remoteParticipantsMap.set(participantId, {
                    participantId,
                    participantName,
                    participantAvatarUrl,
                    stream: new MediaStream(),
                });
            }

            const stream = this.remoteParticipantsMap.get(participantId)?.stream;
            const mediaTrack = track.mediaStreamTrack;

            // kiểm tra tránh thêm trùng track
            if (
                !stream?.getTracks().some((track: MediaStreamTrack) => track.id === mediaTrack.id)
            ) {
                stream?.addTrack(mediaTrack);
                this.updateRemoteParticipants();
            }
        });

        this.room?.on('trackUnsubscribed', (track, publication, participant) => {
            const participantId = participant.identity || participant.sid;
            const mediaTrack = track.mediaStreamTrack;
            const stream = this.remoteParticipantsMap.get(participantId)?.stream;

            if (mediaTrack && stream) {
                stream.removeTrack(mediaTrack);
                if (stream.getTracks().length === 0)
                    // xóa stream nếu không còn track
                    this.remoteParticipantsMap.delete(participantId);
                this.updateRemoteParticipants();
            }
        });

        this.room?.on('participantConnected', () => {
            this.callState.clearCallTimeout();
            this.callState.callStatus.set('connected');
        })

        this.room?.on('participantDisconnected', (participant) => {
            const participantId = participant.identity || participant.sid;
            this.remoteParticipantsMap.delete(participantId);
            this.updateRemoteParticipants();
        });

        this.room?.on('disconnected', () => {
            this.callState.callStatus.set('ended');
            this.callState.syncCallStateToParent();
            this.callState.cleanUp({ resetCallStatus: false });
        });

        this.room?.on('trackSubscriptionFailed', (trackSid, participant, error) =>
            console.error('trackSubscriptionFailed', participant.identity, trackSid, error),
        );
    }

    async toggleCamera() {
        const enable = !this.callState.isCameraOn();

        if (enable) await this.enableCamera();
        else await this.disableCamera();

        this.callState.isCameraOn.set(enable);
    }

    async enableCamera() {
        const publication = await this.room?.localParticipant.setCameraEnabled(true);
        const videoTrack = publication?.track?.mediaStreamTrack;
        if (videoTrack) this.callState.addVideoTrackToLocalStream(videoTrack);
    }

    async disableCamera() {
        try {
            const participant = this.room?.localParticipant;
            if (!participant) return;

            const publication = participant.getTrackPublication(Track.Source.Camera);
            if (!publication) return;

            const videoTrack = publication.track;
            if (videoTrack) {
                await videoTrack.mute();
                if (videoTrack.mediaStreamTrack.readyState !== 'ended')
                    videoTrack.mediaStreamTrack.stop();
                await participant.unpublishTrack(videoTrack);
            }

            this.callState.removeVideoTrackFromLocalStream();
        } catch (error) {
            console.error(error);
        }
    }

    async toggleMicrophone() {
        const enable = !this.callState.isMicOn();

        if (enable) await this.room?.localParticipant.setMicrophoneEnabled(true);
        else await this.room?.localParticipant.setMicrophoneEnabled(false);

        this.callState.isMicOn.set(enable);
    }

    getRemoteParticipantsCount() {
        return this.room?.remoteParticipants.size;
    }
}
