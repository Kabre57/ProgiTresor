export type PermissionsPayload = {
  perms: Record<string, number>;
  denies: string[];
  version: number;
};

/**
 * Fonction pure de validation cumulative/graduationnelle d'accès.
 * 
 * Logique :
 * 1. Si l'action spécifique sur le périmètre est présente dans la liste noire "denies",
 *    l'accès est immédiatement refusé (priorité absolue aux exclusions).
 * 2. Sinon, on compare si le niveau de l'utilisateur sur ce périmètre est supérieur ou égal
 *    au niveau requis pour l'action (héritage des privilèges inférieurs).
 * 
 * @param perms Niveaux cumulatifs de l'utilisateur par périmètre (ex: { OT: 3 })
 * @param denies Actions explicitement interdites (ex: ["OT:DELETE"])
 * @param perimeter Le périmètre cible de la ressource (ex: "OT")
 * @param action L'action demandée (ex: "DELETE")
 * @param requiredLevel Le niveau minimal requis pour cette action (ex: 4)
 */
export function hasAccess(
  perms: Record<string, number>,
  denies: string[],
  perimeter: string,
  action: string,
  requiredLevel: number
): boolean {
  // 1. Vérification de la liste noire d'exclusions
  const blockKey = `${perimeter}:${action}`;
  if (denies.includes(blockKey)) {
    return false;
  }

  // 2. Vérification du niveau d'accès cumulatif
  const userLevel = perms[perimeter] || 0;
  return userLevel >= requiredLevel;
}
