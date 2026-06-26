"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.extractUserFromHeaders = void 0;
const errors_1 = require("../utils/errors");
/**
 * Middleware d'extraction des informations utilisateur depuis les headers du Gateway.
 */
const extractUserFromHeaders = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    const userName = req.headers['x-user-name'];
    if (userId)
        req.userId = parseInt(userId);
    if (userRole)
        req.userRole = userRole;
    if (userName)
        req.userName = userName;
    next();
};
exports.extractUserFromHeaders = extractUserFromHeaders;
/**
 * Middleware d'autorisation basé sur les rôles.
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const role = req.userRole || req.headers['x-user-role'];
        if (!role || !allowedRoles.includes(role)) {
            return next(new errors_1.ForbiddenError('Insufficient permissions'));
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
