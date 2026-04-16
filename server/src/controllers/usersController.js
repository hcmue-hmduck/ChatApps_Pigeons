const usersService = require('../services/usersService');
const SuccessResponse = require('../core/successResponse');

class UsersController {
    // GET /admin/users - Lấy tất cả users
    async getAllUsers(req, res, next) {
        const allUsers = await usersService.getAllUsers();
        new SuccessResponse({
            message: 'Get all users successfully',
            metadata: allUsers,
        }).send(res)
    }

    // GET /admin/users/:id - Lấy user theo ID
    async getUserById(req, res) {
        const user = await usersService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        new SuccessResponse({
            message: 'Get user successfully',
            metadata: {
                // user,
                userInfor: user,
            },
        }).send(res)
    }

    // POST /admin/users - Tạo user mới
    async createUser(req, res) {
        const newUser = await usersService.createUser(req.body);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: newUser
        });

        new SuccessResponse({
            message: 'Create user successfully',
            metadata: newUser,
        }).send(res)
    }

    // PUT /admin/users/:id - Cập nhật user
    async updateUser(req, res) {
        try {
            const updatedUser = await usersService.updateUser(req.params.id, req.body);
            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            res.status(200).json({
                success: true,
                message: 'User updated successfully',
                data: updatedUser,
                metadata: {
                    updatedUserInfor: updatedUser,
                },
            });
        } catch (error) {
            res.status(500) .json({
                success: false,
                message: 'Error updating user',
                error: error.message
            });
        }
    }

    // DELETE /admin/users/:id - Xóa user
    async deleteUser(req, res) {
        try {
            const deleted = await usersService.deleteUser(req.params.id);
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            res.status(200).json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting user',
                error: error.message
            });
        }
    }
}

module.exports = new UsersController();