"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idParamSchema = exports.paginationSchema = void 0;
const zod_1 = require("zod");
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
exports.idParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'ID wajib diisi'),
});
//# sourceMappingURL=common.schema.js.map