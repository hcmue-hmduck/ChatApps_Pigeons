const { User } = require('../models/usersModel');

class SearchService {
    async searchUsers(keyword) {
        const users = await User.find({
            $text: { $search: keyword },
        }).select('name email avatar');
        return users;
    }
}

module.exports = new SearchService();