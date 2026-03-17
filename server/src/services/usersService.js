const { Op } = require('sequelize');
const usersModel = require('../models/usersModel');
const { comparePassword } = require('../utils/authUtil.js');
const {BadRequestError, UnauthorizedError} = require('../core/errorResponse.js')

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
        console.log(email, password)
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
            });

        return foundUser;
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
                updated_at: new Date().toISOString(),
            });
            return true;
        }
        return false;
    }
}

module.exports = new UsersService();
