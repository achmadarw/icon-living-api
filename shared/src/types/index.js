"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.TransactionType = exports.ExpenseStatus = exports.PaymentStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["WARGA"] = "WARGA";
    Role["BENDAHARA"] = "BENDAHARA";
    Role["KETUA"] = "KETUA";
})(Role || (exports.Role = Role = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["APPROVED"] = "APPROVED";
    PaymentStatus["REJECTED"] = "REJECTED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var ExpenseStatus;
(function (ExpenseStatus) {
    ExpenseStatus["DRAFT"] = "DRAFT";
    ExpenseStatus["SUBMITTED"] = "SUBMITTED";
    ExpenseStatus["APPROVED"] = "APPROVED";
    ExpenseStatus["REJECTED"] = "REJECTED";
})(ExpenseStatus || (exports.ExpenseStatus = ExpenseStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["INCOME"] = "INCOME";
    TransactionType["EXPENSE"] = "EXPENSE";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["PAYMENT_SUBMITTED"] = "PAYMENT_SUBMITTED";
    NotificationType["PAYMENT_APPROVED"] = "PAYMENT_APPROVED";
    NotificationType["PAYMENT_REJECTED"] = "PAYMENT_REJECTED";
    NotificationType["EXPENSE_SUBMITTED"] = "EXPENSE_SUBMITTED";
    NotificationType["EXPENSE_APPROVED"] = "EXPENSE_APPROVED";
    NotificationType["EXPENSE_REJECTED"] = "EXPENSE_REJECTED";
    NotificationType["EXPENSE_AUTO_APPROVED"] = "EXPENSE_AUTO_APPROVED";
    NotificationType["USER_CREATED"] = "USER_CREATED";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
//# sourceMappingURL=index.js.map