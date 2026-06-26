"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.ForbiddenError = exports.NotFoundError = exports.UnauthorizedError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) { super(400, message); }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends AppError {
    constructor(message) { super(401, message); }
}
exports.UnauthorizedError = UnauthorizedError;
class NotFoundError extends AppError {
    constructor(message) { super(404, message); }
}
exports.NotFoundError = NotFoundError;
class ForbiddenError extends AppError {
    constructor(message) { super(403, message); }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message) { super(409, message); }
}
exports.ConflictError = ConflictError;
