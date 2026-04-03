const { Op } = require('sequelize');
const User = require('../models/usersModel');

class SearchService {
    async searchUsers(keyword) {
        if (!keyword) return [];
        
        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { full_name: { [Op.iLike]: `%${keyword}%` } },
                    { email: { [Op.iLike]: `%${keyword}%` } },
                ],
                is_active: true,
            },
            attributes: ['id', 'full_name', 'email', 'avatar_url', 'status'],
            limit: 10,
        });
        return users;
    }
}

module.exports = new SearchService();