export enum E2EEErrorCode {
    // Lỗi thiết lập
    SETUP_FAILED = 'E2EE_SETUP_FAILED',
    INVALID_PIN = 'E2EE_INVALID_PIN',

    // Lỗi khóa (Keys)
    IDENTITY_KEY_NOT_FOUND = 'E2EE_IDENTITY_KEY_NOT_FOUND',
    SHARED_KEY_NOT_FOUND = 'E2EE_SHARED_KEY_NOT_FOUND',
    INVALID_KEY = 'E2EE_INVALID_KEY',

    // Lỗi thao tác mã hóa
    ENCRYPTION_FAILED = 'E2EE_ENCRYPTION_FAILED',
    DECRYPTION_FAILED = 'E2EE_DECRYPTION_FAILED',

    // Lỗi hạ tầng
    DB_OPERATION_FAILED = 'E2EE_DB_OPERATION_FAILED',
    SERVER_SYNC_FAILED = 'E2EE_SERVER_SYNC_FAILED',
}

// Chuyển thành const object thay vì enum
export const E2EEErrorMessage: Record<E2EEErrorCode, string> = {
    [E2EEErrorCode.SETUP_FAILED]: 'Không thể thiết lập bảo mật. Vui lòng thử lại sau.',
    [E2EEErrorCode.INVALID_PIN]: 'Mã PIN không chính xác, vui lòng kiểm tra lại.',
    [E2EEErrorCode.IDENTITY_KEY_NOT_FOUND]:
        'Không tìm thấy thông tin định danh bảo mật trên thiết bị này.',
    [E2EEErrorCode.SHARED_KEY_NOT_FOUND]: 'Cuộc trò chuyện này chưa được thiết lập mã hóa.',
    [E2EEErrorCode.INVALID_KEY]: 'Khóa bảo mật không hợp lệ hoặc đã bị thay đổi.',
    [E2EEErrorCode.ENCRYPTION_FAILED]: 'Lỗi trong quá trình mã hóa tin nhắn.',
    [E2EEErrorCode.DECRYPTION_FAILED]: 'Không thể giải mã tin nhắn này.',
    [E2EEErrorCode.DB_OPERATION_FAILED]: 'Lỗi truy xuất dữ liệu bảo mật cục bộ.',
    [E2EEErrorCode.SERVER_SYNC_FAILED]: 'Không thể đồng bộ dữ liệu bảo mật với máy chủ.',
};

export class E2EEError extends Error {
    constructor(
        public code: E2EEErrorCode,
        message?: string,
        public originalError?: any,
    ) {
        super(message || E2EEErrorMessage[code]);
        // gắn public trên constructor = this.code = code
        this.name = 'E2EEError';
        // Error là ông, E2EEError là cha, this là con.
        // setPrototypeOf để prototype của this từ Error chuyển sang E2EEError
        Object.setPrototypeOf(this, E2EEError.prototype);
    }
}
