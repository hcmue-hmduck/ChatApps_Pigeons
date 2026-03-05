const callModel = require('../models/callsModel.js');

class CallService {
    async getCallById(call_id, options = {}) {
        return await callModel.findByPk(call_id, options);
    }

    async startCall({ conversation_id, caller_id, call_type, media_type }, options = {}) {
        return await callModel.create(
            {
                conversation_id,
                caller_id,
                call_type,
                media_type,
                content: `Cuộc gọi ${media_type === 'audio' ? 'thoại' : media_type}`,
            },
            options,
        );
    }

    async updateStatusCall({ call_id, status }, options = {}) {
        if (!call_id || !status) throw new Error('params invalid');
        const STATUS = ['ongoing', 'completed', 'missed', 'declined', 'cancelled'];
        if (!STATUS.includes(status)) throw new Error('Status call is not found');

        const updateData = {
            status,
        };

        const foundCall = await this.getCallById(call_id);
        if (!foundCall) throw new Error('call not found');

        if (status === 'ongoing') updateData.started_at = new Date();
        else if (status === 'completed' && foundCall.started_at) {
            updateData.ended_at = new Date();
            const startLog = new Date(foundCall.started_at).getTime();
            const endLog = updateData.ended_at.getTime();

            // Tính toán dựa trên miliseconds
            const duration_ms = endLog - startLog;
            const duration_seconds = Math.floor(duration_ms / 1000);

            // Nếu kết quả ra âm hoặc quá lớn (do lệch múi giờ), ta sẽ thấy ngay ở bước này
            updateData.duration_seconds = duration_seconds;
        }

        return await callModel.update(updateData, {
            where: {
                id: call_id,
            },
            returning: true,
            ...options,
        });
    }
}

module.exports = new CallService();
