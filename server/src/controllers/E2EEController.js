const SuccessResponse = require("../core/successResponse.js");
const e2eeService = require("../services/E2EEService.js");

class E2EEController {
    async setupKeys(req, res, next) {
        const { id } = req.user;
        return new SuccessResponse({
            message: "setup key successfully",
            metadata: await e2eeService.setupKeys(id, req.body),
        }).send(res);
    }
}

module.exports = new E2EEController();
