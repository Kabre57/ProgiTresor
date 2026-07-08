import { prisma } from '../utils/prisma';

/**
 * Construit le payload des permissions d'un utilisateur pour le JWT.
 * Retourne les niveaux par périmètre (cumulatifs) et les exclusions explicites (blacklist).
 * 
 * @param userId L'identifiant de l'utilisateur
 */
export const buildUserPermissionsPayload = async (userId: number) => {
  const user = await prisma.utilisateur.findUnique({
    where: { id: userId },
    include: {
      perimeterLevels: {
        include: {
          perimeterLevel: {
            include: {
              perimeter: true,
            },
          },
        },
      },
      exclusions: {
        include: {
          perimeter: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  // Compilation des niveaux par périmètre (on retient le niveau maximum)
  const perms: Record<string, number> = {};
  for (const up of user.perimeterLevels) {
    const perimeterId = up.perimeterLevel.perimeterId;
    const level = up.perimeterLevel.level;
    perms[perimeterId] = Math.max(perms[perimeterId] || 0, level);
  }

  // Compilation des exclusions d'actions sous format string "PERIMETRE:ACTION"
  const denies = user.exclusions.map(
    (exc) => `${exc.perimeterId}:${exc.action}`
  );

  return {
    perms,
    denies,
    version: user.tokenVersion,
  };
};
