const { Op, where } = require('sequelize');
const usersModel = require('../models/usersModel');
const { comparePassword, hashPassword } = require('../utils/authUtil.js');
const { BadRequestError, UnauthorizedError, ConflictRequestError } = require('../core/errorResponse.js');
const { getUpdateData } = require('../utils/dataUtil.js');

class UsersService {
    // Lấy users theo điều kiện filter
    async getAllUsers(where = {}) {
        const resolvedWhere = { is_active: true, ...where };

        if (where.id) {
            resolvedWhere.id = Array.isArray(where.id) ? { [Op.in]: where.id } : where.id;
        }

        if (where.full_name && typeof where.full_name === 'string') {
            resolvedWhere.full_name = { [Op.like]: `%${where.full_name}%` };
        }

        return await usersModel.findAll({
            where: resolvedWhere,
            order: [['full_name', 'ASC']],
        });
    }

    // Lấy user theo ID
    async getUserById(userId) {
        return await usersModel.findByPk(userId);
    }

    // Lấy user theo email định danh
    async getUserByEmail(email) {
        return await usersModel.findOne({ where: { email } });
    }

    async getUserByEmailAndPassword(email, password) {
        console.log(email, password);
        if (!email || !password) throw new BadRequestError('missing parameters');

        const foundUser = await this.getUserByEmail(email);
        if (!foundUser) throw new UnauthorizedError('invalid email or password');

        const isMatch = await comparePassword(password, foundUser.password_hash);
        if (!isMatch) throw new UnauthorizedError('invalid email or password');

        return foundUser;
    }

    // Tạo user mới
    async createUser(userData) {
        userData.created_at = new Date().toISOString();
        userData.updated_at = new Date().toISOString();
        return await usersModel.create(userData);
    }

    async findOrCreateSocialUser({ displayName, email }) {
        if (!displayName || !email) throw new BadRequestError('missing parameters');

        let foundUser = await this.getUserByEmail(email);
        if (!foundUser)
            foundUser = await this.createUser({
                email,
                full_name: displayName,
                is_email_verified: true,
            });

        return foundUser;
    }

    // Cập nhật user
    async updateUser(userId, userData) {

        const user = await usersModel.findByPk(userId);
        if (!user) throw new BadRequestError('User not found');

        const updateData = getUpdateData(userData);

        return await user.update(updateData);
    }

    async setPassword(userId, password) {
        const password_hash = await hashPassword(password);
        console.log(`password_hash`, password_hash)
        return this.updateUser(userId, { password_hash });
    }

    async changePassword(userId, oldPassword, newPassword) {
        console.log(`changePassword:::`, { userId, oldPassword, newPassword })
        const user = await this.getUserById(userId);
        if (!user) throw new BadRequestError('User not found');

        const { password_hash } = user;

        // Xử lý trường hợp người dùng chưa từng có mật khẩu (vd: đăng nhập bằng Google)
        if (!password_hash) {
            throw new BadRequestError('User has no password set. Please use set password API instead.');
        }

        const ok = await comparePassword(oldPassword, password_hash);
        // Dùng BadRequestError (400) thay vì UnauthorizedError (401) để tránh Interceptor hiểu nhầm là hết token và logout
        if (!ok) throw new BadRequestError('Mật khẩu hiện tại không chính xác');

        user.password_hash = await hashPassword(newPassword);
        return await user.save();
    }

    // Xóa user (Soft Delete)
    async deleteUser(userId) {
        const user = await usersModel.findByPk(userId);
        if (user) {
            await user.update({
                is_active: false,
                updated_at: new Date().toISOString(),
            });
            return true;
        }
        return false;
    }
}

module.exports = new UsersService();
