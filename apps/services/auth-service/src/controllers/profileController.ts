import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';

/**
 * POST /me/photo
 * Upload a profile picture for the authenticated user.
 * Accepts multipart/form-data with a 'photo' field.
 * Stores the image as a base64 data URL in the database.
 */
export const uploadUserPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(401, 'Non autorisé : identifiant utilisateur manquant');
    }

    if (!req.file) {
      throw new AppError(400, 'Aucun fichier image fourni');
    }

    const { mimetype, buffer } = req.file;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimetype)) {
      throw new AppError(400, 'Type de fichier non supporté. Utilisez JPEG, PNG, GIF ou WebP.');
    }

    // Encode to base64 data URL
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimetype};base64,${base64}`;

    // Update user profile photo
    const updated = await prisma.utilisateur.update({
      where: { id: userId },
      data: { photoUrl: dataUrl },
      select: {
        id: true,
        username: true,
        nom: true,
        prenom: true,
        email: true,
        service: true,
        actif: true,
        photoUrl: true,
        dateCreation: true,
        derniereConnexion: true,
        role: {
          select: {
            id: true,
            code: true,
            libelle: true,
            description: true,
          },
        },
      },
    });

    res.json({ message: 'Photo de profil mise à jour avec succès', user: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /me/profile
 * Update profile information of the authenticated user (nom, prenom, email, service).
 */
export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(401, 'Non autorisé : identifiant utilisateur manquant');
    }

    const { nom, prenom, email, service, photoUrl } = req.body;

    const updateData: Record<string, any> = {};
    if (nom !== undefined) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (email !== undefined) updateData.email = email;
    if (service !== undefined) updateData.service = service;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

    if (Object.keys(updateData).length === 0) {
      throw new AppError(400, 'Aucune donnée à mettre à jour');
    }

    const updated = await prisma.utilisateur.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        nom: true,
        prenom: true,
        email: true,
        service: true,
        actif: true,
        photoUrl: true,
        dateCreation: true,
        derniereConnexion: true,
        role: {
          select: {
            id: true,
            code: true,
            libelle: true,
            description: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
