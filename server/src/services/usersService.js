const usersModel = require('../models/usersModel');

class UsersService {
    // Lấy tất cả users
    async getAllUsers() {
        return await usersModel.findAll({
            where: { is_active: true },
            order: [['full_name', 'ASC']]
        });
    }

    // Lấy user theo ID
    async getUserById(userId) {
        return await usersModel.findByPk(userId);
    }

    // Tạo user mới
    async createUser(userData) {
        userData.created_at = new Date().toISOString();
        userData.updated_at = new Date().toISOString();
        return await usersModel.create(userData);
    }

    // Cập nhật user
    async updateUser(userId, userData) {
        const user = await usersModel.findByPk(userId);
        userData.updated_at = new Date().toISOString();
        if (user) {
            return await user.update(userData);
        }
        return null;
    }

    // Xóa user (Soft Delete)
    async deleteUser(userId) {
        const user = await usersModel.findByPk(userId);
        if (user) {
            // Soft delete - chỉ đánh dấu is_active = false
            await user.update({ 
                is_active: false,
                updated_at: new Date().toISOString()
            });
            return true;
        }
        return false;
    }
}

module.exports = new UsersService();