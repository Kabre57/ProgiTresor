import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import * as authService from '../services/authService';
import { ValidationError, AppError } from '../utils/errors';
import logger from '../utils/logger';
import {
  LoginSchema,
  RefreshTokenSchema,
  UserCreateSchema,
  UserUpdateSchema,
  PaginationSchema
} from '../../../../../shared/types/auth.types';

export const validate = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.format()));
  }
  req.body = result.data;
  next();
};

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Authenticate user and return JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const authData = await authService.loginUser(username, password);
    res.json(authData);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /refresh-token:
 *   post:
 *     summary: Refresh access token using a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const { accessToken } = await authService.refreshAccessToken(refreshToken);
    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Revoke user refresh token and logout
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    await authService.logoutUser(refreshToken);
    res.json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Get current authenticated user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized – missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized: User ID not found in token');
    }
    const userProfile = await authService.getUserProfile(userId);
    res.json(userProfile);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get paginated list of users (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserProfile'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden – insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { data, total } = await authService.getAllUsers(Number(page), Number(limit));
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreateRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Validation error or username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden – insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userData = req.body;
    const newUser = await authService.createNewUser(userData);
    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update an existing user (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateRequest'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Validation error or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden – insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    const userData = req.body;
    const updatedUser = await authService.updateExistingUser(userId, userData);
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden – insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    await authService.deleteExistingUser(userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Vérifie l'état du service et la connexion à la base de données.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: auth-service
 *       503:
 *         description: Service is unhealthy (base de données indisponible)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = require('../repositories/userRepository').getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'auth-service' });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    next(new AppError(503, `Database connection failed: ${message}`));
  }
};

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     responses:
 *       200:
 *         description: Prometheus metrics in exposition format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
export const getMetrics = async (req: Request, res: Response) => {
  const client = require('../utils/metrics').default;
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
};
