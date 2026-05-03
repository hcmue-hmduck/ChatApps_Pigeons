const sheetModel = require('../models/sheetModel');

class sheetService {
    async getSheet() {
        try {
            const data = await sheetModel.ThongKeModel.find({});
            return data;
        } catch (error) {
            console.error('sheetService.getSheet error:', error);
            throw new Error(error?.message || 'Failed to get sheet data');
        }
    }

    async createSheet(data) {
        try {
            const newSheet = new sheetModel.ThongKeModel(data);
            await newSheet.save();
            return newSheet;
        } catch (error) {
            console.error('sheetService.createSheet error:', error);
            throw new Error(error?.message || 'Failed to create sheet data');
        }
    }
}

module.exports = new sheetService();