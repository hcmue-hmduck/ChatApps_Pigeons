export interface CallSessionData {
    conversationId: string;
    conversationType: string;
    inviterName: string;        
    inviterAvatarUrl: string;
    inviterId: string;
    status: 'comming' | 'missed';
    initializeVideo: boolean;
    offer?: RTCSessionDescriptionInit; // Cho direct call
    groupName?: string; // Cho group call
}

export const DIRECT_CALL = 'direct';
export const GROUP_CALL = 'group';
