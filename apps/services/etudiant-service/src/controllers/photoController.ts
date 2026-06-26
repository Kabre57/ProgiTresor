import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

/**
 * POST /:matricule/photo
 * Upload a profile picture for a etudiant.
 * Accepts multipart/form-data with a 'photo' field.
 * Stores the image as a base64 data URL in the database.
 */
export const uploadEtudiantPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matricule = req.params.matricule?.trim().toUpperCase();
    if (!matricule) {
      return res.status(400).json({ error: 'Matricule requis' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier image fourni' });
    }

    const { mimetype, buffer } = req.file;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimetype)) {
      return res.status(400).json({
        error: 'Type de fichier non supporté. Utilisez JPEG, PNG, GIF ou WebP.'
      });
    }

    // Encode to base64 data URL
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimetype};base64,${base64}`;

    // Update etudiant profile photo
    const updated = await prisma.etudiant.update({
      where: { matricule },
      data: { photoUrl: dataUrl },
      include: {
        antenne: true,
        filiere: true,
        statut: true,
        promotion: true,
      },
    });

    res.json({ message: 'Photo de profil mise à jour avec succès', etudiant: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /:matricule/photo
 * Remove the profile picture for a etudiant.
 */
export const deleteEtudiantPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matricule = req.params.matricule?.trim().toUpperCase();
    if (!matricule) {
      return res.status(400).json({ error: 'Matricule requis' });
    }

    const updated = await prisma.etudiant.update({
      where: { matricule },
      data: { photoUrl: null },
      include: {
        antenne: true,
        filiere: true,
        statut: true,
        promotion: true,
      },
    });

    res.json({ message: 'Photo de profil supprimée', etudiant: updated });
  } catch (error) {
    next(error);
  }
};
