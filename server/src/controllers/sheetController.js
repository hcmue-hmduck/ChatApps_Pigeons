const sheetService = require('../services/sheetService');
const successResponse = require('../core/successResponse');

class sheetController {
    async getSheet(req, res) {
        try {
            const data = await sheetService.getSheet();
            return new successResponse({
                message: 'Sheet data fetched successfully',
                metadata: {
                    data,
                },
            }).send(res);
        }
        catch (error) {
            console.error('sheetController.getSheet error:', error);
            return res.status(500).json({
                message: error?.message || 'Failed to get sheet data',
            });
        }
    }

    async createSheet(req, res) {
        try {
            const data = req.body;
            const newSheet = await sheetService.createSheet(data);
            return new successResponse({
                message: 'Sheet data created successfully',
                metadata: {
                    newSheet,
                },
            }).send(res);
        }
        catch (error) {
            console.error('sheetController.createSheet error:', error);
            return res.status(500).json({
                message: error?.message || 'Failed to create sheet data',
            });
        }
    }
}

module.exports = new sheetController();