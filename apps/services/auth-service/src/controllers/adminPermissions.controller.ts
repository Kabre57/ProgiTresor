import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { redisBlacklistService } from '../services/redisBlacklist.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import { z } from 'zod';

// Schéma de validation Zod pour le corps de la requête
const updateAdminPermissionsSchema = z.object({
  perimeters: z.array(
    z.object({
      perimeterId: z.string(),
      level: z.number().min(0).max(4),
    })
  ).optional(),
  denies: z.array(
    z.object({
      perimeterId: z.string(),
      action: z.string(),
      add: z.boolean(),
    })
  ).optional(),
});

/**
 * Contrôleur d'administration pour la gestion fine des permissions graduationnelles
 * et des exclusions par utilisateur.
 */
export const updateAdminPermissions = async (req: Request, res: Response, next: NextFunction) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    return next(new ValidationError('Identifiant utilisateur invalide.'));
  }

  // Validation des données reçues avec Zod
  const parsed = updateAdminPermissionsSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new ValidationError(JSON.stringify(parsed.error.format())));
  }

  const { perimeters, denies } = parsed.data;

  try {
    const userExists = await prisma.utilisateur.findUnique({
      where: { id: userId },
    });
    if (!userExists) {
      throw new NotFoundError('Utilisateur introuvable.');
    }

    // Exécution des modifications dans une transaction Prisma atomique
    await prisma.$transaction(async (tx) => {
      // 1. Traitement des modifications de niveaux de périmètre
      if (perimeters && Array.isArray(perimeters)) {
        for (const p of perimeters) {
          const { perimeterId, level } = p;

          // Récupération de tous les niveaux définis pour le périmètre ciblé
          const allLevels = await tx.perimeterLevel.findMany({
            where: { perimeterId },
          });

          // Retrait préalable de l'affectation existante pour ce périmètre
          const levelIds = allLevels.map((l) => l.id);
          await tx.userPerimeterLevel.deleteMany({
            where: {
              userId,
              perimeterLevelId: { in: levelIds },
            },
          });

          // Ajout du nouveau niveau si supérieur à 0 (0 = Aucun droit)
          if (level > 0) {
            const targetLevel = allLevels.find((l) => l.level === level);
            if (!targetLevel) {
              throw new ValidationError(
                `Le niveau ${level} n'existe pas pour le périmètre ${perimeterId}.`
              );
            }

            await tx.userPerimeterLevel.create({
              data: {
                userId,
                perimeterLevelId: targetLevel.id,
              },
            });
          }
        }
      }

      // 2. Traitement des ajouts ou retraits d'exclusions (denies)
      if (denies && Array.isArray(denies)) {
        for (const d of denies) {
          const { action, perimeterId, add } = d;

          if (add) {
            // Insertion sécurisée pour éviter les doublons (avec upsert)
            await tx.permissionExclusion.upsert({
              where: {
                userId_perimeterId_action: {
                  userId,
                  perimeterId,
                  action,
                },
              },
              update: {},
              create: {
                userId,
                perimeterId,
                action,
              },
            });
          } else {
            // Suppression de l'exclusion
            await tx.permissionExclusion.deleteMany({
              where: {
                userId,
                perimeterId,
                action,
              },
            });
          }
        }
      }
    });

    // 3. Invalidation immédiate de la session de l'utilisateur modifié (Token Versioning + Redis JTI Blacklist)
    await redisBlacklistService.invalidateUserTokens(userId);

    // Récupérer les nouveaux droits mis à jour
    const updatedPerimeters = await prisma.userPerimeterLevel.findMany({
      where: { userId },
      include: { perimeterLevel: true },
    });
    const updatedExclusions = await prisma.permissionExclusion.findMany({
      where: { userId },
    });

    res.json({
      success: true,
      message: 'Permissions de l\'utilisateur mises à jour. Les sessions actives ont été révoquées.',
      data: {
        perimeters: updatedPerimeters.map((up) => ({
          perimeterId: up.perimeterLevel.perimeterId,
          level: up.perimeterLevel.level,
        })),
        denies: updatedExclusions.map((ue) => ({
          perimeterId: ue.perimeterId,
          action: ue.action,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
