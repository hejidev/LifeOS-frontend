"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const errors_1 = require("../lib/errors");
function validate(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        if (!result.success) {
            const message = result.error.errors.map((e) => e.message).join(", ");
            return next(new errors_1.AppError(message, 422));
        }
        // Attach validated data
        req.validated = result.data;
        // Optionally overwrite body/query/params with validated versions
        req.body = result.data.body ?? req.body;
        req.query = result.data.query ?? req.query;
        req.params = result.data.params ?? req.params;
        next();
    };
}
