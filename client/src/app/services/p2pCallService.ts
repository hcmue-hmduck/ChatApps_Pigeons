import { inject, Injectable } from '@angular/core';
import { SocketService } from './socket';
import { CallStateService } from './callStateService';
import { AuthService } from './authService';

@Injectable({
    providedIn: 'root',
})
export class P2PCallService {
    private socketService = inject(SocketService);
    private callState = inject(CallStateService);
    private authService = inject(AuthService);

    private peerConnection: RTCPeerConnection | null = null;
    private remoteIceCandidates: RTCIceCandidate[] = [];
    private localIceCandidates: RTCIceCandidate[] = [];
    private canSendLocalIceCandidates = false;
    private friendName = '';
    private friendAvatarUrl = '';
    private remoteStream: MediaStream | null = null;

    setFriendInfo(name: string, avatar: string) {
        this.friendName = name;
        this.friendAvatarUrl = avatar;
    }

    async call() {
        try {
            await this.getUserMedia();

            await this.createRTCPeerConnection({ isOfferer: true });

            const offer = await this.peerConnection?.createOffer();
            await this.peerConnection?.setLocalDescription(offer);

            const { userName, userAvatarUrl, userId } = this.authService.getUserInfor();
            this.socketService.emit('directCall:newOffer', {
                offer,
                conversationId: this.callState.conversationId,
                inviterName: userName,
                inviterAvatarUrl: userAvatarUrl,
                inviterId: userId,
                initializeVideo: this.callState.isCameraOn(),
            });
            console.log('P2P offer sent');
        } catch (error) {
            console.log(error);
        }
    }

    async getUserMedia() {
        try {
            const initializeVideo = this.callState.isCameraOn()
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: initializeVideo });
            this.callState.localStream.set(stream);
        } catch (error) {
            console.log('GUM error');
            throw error;
        }
    }

    async createRTCPeerConnection({ isOfferer }: { isOfferer: boolean }) {
        try {
            const iceServers = [
                {
                    urls: [
                        'stun:stun.l.google.com:19302',
                        'stun:stun1.l.google.com:19302',
                        'stun:stun2.l.google.com:19302',
                    ],
                },
                {
                    urls: [
                        'turn:free.expressturn.com:3478?transport=udp',
                        'turn:free.expressturn.com:3478?transport=tcp',
                    ],
                    username: '000000002085840964',
                    credential: 'sKjvQuFxUdRfoMmPTuZdYnJMtsU=',
                },
                {
                    urls: [
                        'turn:global.relay.metered.ca:80',
                        'turn:global.relay.metered.ca:80?transport=tcp',
                        'turn:global.relay.metered.ca:443',
                        'turns:global.relay.metered.ca:443?transport=tcp',
                    ],
                    username: '5dfbd13aff31fb43c684a6f8',
                    credential: 'Be36dmr4lOTvBgvx',
                },
            ];
            this.peerConnection = new RTCPeerConnection({
                iceTransportPolicy: 'all',
                iceServers,
            });

            // Debug ICE/DTLS states to track connectivity issues
            this.peerConnection.addEventListener('iceconnectionstatechange', () => {
                console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
                window.setTimeout(() => {
                    this.logUsedIceServer();
                }, 1000);
            });

            this.peerConnection.addEventListener('icegatheringstatechange', () => {
                console.log('ICE gathering state:', this.peerConnection?.iceGatheringState);
            });

            this.peerConnection.addEventListener('connectionstatechange', () => {
                console.log('Peer connection state:', this.peerConnection?.connectionState);
            });

            this.peerConnection.addEventListener('icecandidateerror', (event) => {
                console.log('ICE candidate error:', event);
            });

            // Khi nhận được icecandidate mới từ STUN server
            this.peerConnection.addEventListener('icecandidate', (event) => {
                if (event.candidate !== null) {
                    // Gửi candidate sau khi setLocalDescription
                    if (this.canSendLocalIceCandidates) {
                        this.sendIceCandidate(event.candidate);
                    } else this.localIceCandidates.push(event.candidate);
                }
            });

            // Khi nhận được track từ client khác
            this.peerConnection.addEventListener('track', (event) => {
                let stream = event.streams[0];

                if (!stream) {
                    stream = new MediaStream();
                    stream.addTrack(event.track);
                }

                const currentParticipants = this.callState.remoteParticipants();
                const p2pUser = currentParticipants.find((p) => p.participantId === 'p2p');

                if (!p2pUser) {
                    this.callState.remoteParticipants.set([
                        {
                            participantId: 'p2p',
                            participantName: this.friendName,
                            participantAvatarUrl: this.friendAvatarUrl,
                            stream,
                        },
                    ]);
                } else {
                    const existStream = p2pUser.stream;
                    if (!existStream.getTracks().find((track) => track.id === event.track.id))
                        existStream.addTrack(event.track);
                    this.callState.remoteParticipants.set([...currentParticipants]);
                }

                console.log('Track received...');
            });

            if (isOfferer) this.addLocalTrackAsTransceivers();
        } catch (error) {
            throw error;
        }
    }

    addLocalTrackAsTransceivers() {
        const stream = this.callState.localStream();
        if (!stream || !this.peerConnection) return;

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            this.peerConnection.addTransceiver(audioTrack, {
                direction: 'sendrecv',
                streams: [stream],
            });
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            this.peerConnection.addTransceiver(videoTrack, {
                direction: 'sendrecv',
                streams: [stream],
            });
        } else {
            const tranceiver = this.peerConnection.addTransceiver('video', {
                direction: 'sendrecv',
            });
            tranceiver.sender.replaceTrack(null);
        }
    }

    // gán sau khi người nhận set remote
    // không tạo tranceiver mới, cập nhật lại 1 luồng của tranceiver nhận từ người gọi
    attachLocalTrackToRemoteTransceivers() {
        const stream = this.callState.localStream();
        if (!stream || !this.peerConnection) return;

        this.peerConnection.getTransceivers().forEach((transceiver) => {
            const kind = transceiver.receiver.track.kind;

            const audioTrack = stream.getAudioTracks()[0];
            const videoTrack = stream.getVideoTracks()[0];

            if (kind === 'audio') {
                transceiver.sender.replaceTrack(audioTrack);
                transceiver.direction = 'sendrecv';
            } else if (kind === 'video') {
                transceiver.sender.replaceTrack(videoTrack);
                transceiver.direction = 'sendrecv';
            }
        });
    }

    async answerOffer(offer: RTCSessionDescriptionInit) {
        try {
            await this.getUserMedia();
            await this.createRTCPeerConnection({ isOfferer: false });

            await this.peerConnection?.setRemoteDescription(offer);
            if (this.remoteIceCandidates.length > 0) this.addRemoteIceCandidates();

            this.attachLocalTrackToRemoteTransceivers();

            const answer = await this.peerConnection?.createAnswer();
            await this.peerConnection?.setLocalDescription(answer);

            this.canSendLocalIceCandidates = true;
            this.sendLocalIceCandidates();

            const { userName, userAvatarUrl } = this.authService.getUserInfor();
            this.socketService.emit('directCall:newAnswer', {
                answer,
                conversationId: this.callState.conversationId,
                answererName: userName,
                answererAvatarUrl: userAvatarUrl,
            });
            console.log('P2P answer sent');
        } catch (error) {
            console.error(error);
        }
    }

    async handleAnswer(data: any) {
        try {
            await this.peerConnection?.setRemoteDescription(data.answer);
            if (this.remoteIceCandidates.length > 0) this.addRemoteIceCandidates();

            this.canSendLocalIceCandidates = true;
            this.sendLocalIceCandidates();

            this.friendName = data.answererName;
            this.friendAvatarUrl = data.answererAvatarUrl;

            if (this.remoteStream) {
                this.callState.remoteParticipants.set([
                    {
                        participantId: 'p2p',
                        participantName: data.answererName,
                        participantAvatarUrl: data.answererAvatarUrl,
                        stream: this.remoteStream!,
                    },
                ]);
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    addIceCandidate(iceCandidate: RTCIceCandidate) {
        try {
            if (this.peerConnection && this.peerConnection?.remoteDescription) {
                this.peerConnection?.addIceCandidate(iceCandidate);
            } else {
                // lưu lại để khi có peerConnection đã set remote sẽ dùng đến
                this.remoteIceCandidates.push(iceCandidate);
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    sendIceCandidate(iceCandidate: RTCIceCandidate) {
        this.socketService.emit('directCall:newIceCandidate', {
            iceCandidate: iceCandidate,
            conversationId: this.callState.conversationId,
        });
    }

    sendLocalIceCandidates() {
        try {
            if (this.canSendLocalIceCandidates) {
                this.localIceCandidates.forEach((iceCandidate) => {
                    this.sendIceCandidate(iceCandidate);
                });
                this.localIceCandidates = [];
            }
        } catch (error) {
            throw error;
        }
    }

    async addRemoteIceCandidates() {
        try {
            this.remoteIceCandidates.forEach((iceCandidate) => {
                this.peerConnection?.addIceCandidate(iceCandidate);
            });
            this.remoteIceCandidates = [];
        } catch (error) {
            throw error;
        }
    }

    async logUsedIceServer() {
        const stats = await this.peerConnection?.getStats();

        stats?.forEach((report) => {
            if (report.type === 'transport' || report.type === 'candidate-pair') {
                if (report.state === 'succeeded' || report.selected) {
                    const localCandidate = stats.get(report.localCandidateId);
                    const remoteCandidate = stats.get(report.remoteCandidateId);

                    if (localCandidate && remoteCandidate) {
                        console.log(
                            '%c --- CONNECTION INFO ---',
                            'color: yellow; font-weight: bold;',
                        );
                        console.log(`Connection type: ${localCandidate.candidateType}`);
                        console.log(`Protocol: ${localCandidate.protocol}`);

                        if (localCandidate.candidateType === 'relay') {
                            console.log(
                                `%c USING TURN SERVER: ${localCandidate.url}`,
                                'color: #ff9900; font-weight: bold;',
                            );
                            console.log(
                                `Relay address: ${localCandidate.address}:${localCandidate.port}`,
                            );
                        } else {
                            console.log(
                                '%c USING P2P (NO TURN QUOTA)',
                                'color: #00ff00;',
                            );
                        }
                    }
                }
            }
        });
    }

    async toggleCamera() {
        const enable = !this.callState.isCameraOn();

        if (enable) this.enableCamera();
        else this.disableCamera();
        this.callState.isCameraOn.set(enable);
    }

    async enableCamera() {
        try {
            const transceiver = this.peerConnection?.getTransceivers().find((transceiver) => {
                return transceiver.receiver.track?.kind === 'video';
            });

            if (!transceiver) return;

            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const videoTrack = stream.getVideoTracks()[0];
            await transceiver.sender.replaceTrack(videoTrack);
            // transceiver.direction = 'sendrecv';

            this.callState.addVideoTrackToLocalStream(videoTrack);
        } catch (error) {
            console.error(error);
        }
    }

    disableCamera() {
        try {
            const transceiver = this.peerConnection?.getTransceivers().find((transceiver) => {
                return transceiver.receiver.track?.kind === 'video';
            });

            if (!transceiver) return;

            const track = transceiver.sender.track;
            if (!track) return;

            track.enabled = false;
            track.stop();
            transceiver.sender.replaceTrack(null);

            this.callState.removeVideoTrackFromLocalStream();
        } catch (error) {
            console.error(error);
        }
    }

    async toggleMicrophone() {
        const enable = !this.callState.isMicOn();

        const transceiver = this.peerConnection?.getTransceivers().find((trans) => {
            return trans.receiver.track?.kind === 'audio';
        });
        if (!transceiver) return;

        const audioTrack = transceiver.sender.track;
        if (!audioTrack) return;

        if (enable) audioTrack.enabled = true;
        else audioTrack.enabled = false;

        this.callState.isMicOn.set(enable);
    }

    cleanUp() {
        this.peerConnection?.close();
        this.peerConnection = null;
        this.remoteIceCandidates = [];
        this.localIceCandidates = [];
        this.remoteStream = null;
        this.canSendLocalIceCandidates = false;
        this.friendName = '';
        this.friendAvatarUrl = '';
    }
}
