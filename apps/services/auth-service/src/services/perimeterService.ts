import { prisma } from '../utils/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Liste tous les périmètres avec leurs niveaux disponibles.
 */
export const listAllPerimeters = async () => {
  return prisma.perimeter.findMany({
    include: {
      levels: {
        orderBy: { level: 'asc' }
      }
    },
    orderBy: { id: 'asc' }
  });
};

/**
 * Récupère les niveaux de périmètres d'un utilisateur.
 */
export const getUserPerimeters = async (userId: number) => {
  const user = await prisma.utilisateur.findUnique({
    where: { id: userId }
  });
  if (!user) {
    throw new NotFoundError('Utilisateur introuvable');
  }

  const userLevels = await prisma.userPerimeterLevel.findMany({
    where: { userId },
    include: {
      perimeterLevel: {
        include: {
          perimeter: true
        }
      }
    }
  });

  return userLevels.map(ul => ({
    perimeterId: ul.perimeterLevel.perimeterId,
    perimeterLibelle: ul.perimeterLevel.perimeter.libelle,
    level: ul.perimeterLevel.level,
    levelLibelle: ul.perimeterLevel.libelle
  }));
};

/**
 * Assigne un niveau de périmètre à un utilisateur (efface le précédent pour ce périmètre).
 */
export const setUserPerimeterLevel = async (
  userId: number,
  perimeterId: string,
  level: number
) => {
  const user = await prisma.utilisateur.findUnique({
    where: { id: userId }
  });
  if (!user) {
    throw new NotFoundError('Utilisateur introuvable');
  }

  const perimeter = await prisma.perimeter.findUnique({
    where: { id: perimeterId },
    include: { levels: true }
  });
  if (!perimeter) {
    throw new NotFoundError('Périmètre introuvable');
  }

  // 1. Supprimer l'ancienne affectation de niveau pour ce périmètre
  const levelIds = perimeter.levels.map(l => l.id);
  await prisma.userPerimeterLevel.deleteMany({
    where: {
      userId,
      perimeterLevelId: { in: levelIds }
    }
  });

  // 2. Si le niveau est > 0, ajouter la nouvelle affectation
  if (level > 0) {
    const targetLevel = perimeter.levels.find(l => l.level === level);
    if (!targetLevel) {
      throw new ValidationError(`Niveau ${level} invalide pour le périmètre ${perimeterId}`);
    }

    await prisma.userPerimeterLevel.create({
      data: {
        userId,
        perimeterLevelId: targetLevel.id
      }
    });

    logger.info({ userId, perimeterId, level }, 'Niveau de périmètre assigné');
  } else {
    logger.info({ userId, perimeterId }, 'Niveau de périmètre réinitialisé (aucun droit)');
  }

  return getUserPerimeters(userId);
};

/**
 * Algorithme de validation cumulative hiérarchique.
 * Vérifie si l'utilisateur possède au moins le niveau requis pour le périmètre demandé.
 */
export const checkUserPerimeterAccess = async (
  userId: number,
  perimeterId: string,
  requiredLevel: number
): Promise<boolean> => {
  // Récupérer le niveau max de l'utilisateur pour ce périmètre
  const userAssignment = await prisma.userPerimeterLevel.findFirst({
    where: {
      userId,
      perimeterLevel: {
        perimeterId
      }
    },
    include: {
      perimeterLevel: true
    }
  });

  if (!userAssignment) {
    return false; // Aucun droit défini = Refus par défaut
  }

  // Vérifier la condition cumulative (niveau max >= niveau requis)
  return userAssignment.perimeterLevel.level >= requiredLevel;
};
