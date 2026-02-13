export interface CallSessionData {
    conversationId: string;
    conversationType: string;
    inviterName: string;
    inviterAvatarUrl: string;
    inviterId: string;
    offer?: RTCSessionDescriptionInit;
    status: 'comming' | 'missed';
    initializeVideo: boolean;
}