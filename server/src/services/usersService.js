const { Op } = require('sequelize');
const usersModel = require('../models/usersModel');

class UsersService {
    // Lấy users theo điều kiện filter
    async getAllUsers(where = {}) {
        const resolvedWhere = { is_active: true, ...where };

        if (where.id) {
            resolvedWhere.id = Array.isArray(where.id)
                ? { [Op.in]: where.id }
                : where.id;
        }

        if (where.full_name && typeof where.full_name === 'string') {
            resolvedWhere.full_name = { [Op.like]: `%${where.full_name}%` };
        }

        return await usersModel.findAll({
            where: resolvedWhere,
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