"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationQuerySchema = void 0;
const zod_1 = require("zod");
exports.notificationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    isRead: zod_1.z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .optional(),
});
//# sourceMappingURL=notification.schema.js.map