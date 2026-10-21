# Connecter ProgiTresor à la vraie API Trésor Pay

## État actuel

La récupération automatique n’est pas connectée à Trésor Pay. L’ancien bouton générait deux paiements de démonstration à chaque clic ; cette génération a été supprimée. Le bouton renvoie maintenant un message d’indisponibilité et ne crée aucun paiement.

Les correspondances de matricules et de produits servent à rattacher les paiements aux étudiants et aux nomenclatures. Elles ne donnent pas accès à l’API Trésor Pay.

## Demande à adresser à Trésor Pay

Contacter le support ou le chargé de compte de l’établissement avec cette demande :

> Nous souhaitons connecter notre application de gestion à Trésor Pay pour consulter et rapprocher les paiements de notre établissement. Merci de nous transmettre la documentation de l’API de consultation des paiements, les URL de test et de production, la procédure d’attribution des accès et les identifiants de notre établissement. Merci de préciser le mode d’authentification, les filtres de date, la pagination, les statuts de paiement, les modalités de notification et les restrictions d’accès réseau.

Demander également un exemple de réponse anonymisé contenant : référence unique du paiement, date avec fuseau horaire, montant, devise, statut, matricule étudiant ou matricule Trésor Pay, code produit et établissement bénéficiaire. Faire préciser les règles d’annulation, de remboursement et de doublons ainsi que l’unité des montants.

## Travail à réaliser après réception

1. Faire activer les accès de test pour le bon établissement et autoriser l’adresse IP du VPS si le fournisseur l’exige.
2. Configurer les secrets côté serveur dans `.env.production`, avec les noms qui seront définis pour le connecteur. Ne jamais les mettre dans le navigateur, un fichier `NEXT_PUBLIC_*`, Git ou une capture d’écran. Aucun nom de variable ni URL d’API n’est encore fixé : ils dépendront du contrat officiel.
3. Implémenter l’authentification et l’appel de consultation dans `transaction-service`, en suivant cette documentation. Remplacer le refus explicite de `fetchFromTresor` par cet appel ; ne pas remettre les paiements de démonstration.
4. Convertir la réponse fournisseur vers les champs internes, traiter toutes les pages et importer uniquement les paiements confirmés pour l’établissement. Conserver la référence fournisseur originale pour empêcher une seconde importation du même paiement.
5. Résoudre les matricules et les produits avec les référentiels existants. Signaler les paiements sans correspondance pour correction ; ne pas inventer de rattachement financier.
6. Tester en environnement de test : paiement confirmé, paiement en attente ou annulé, pagination, doublon, accès expiré et indisponibilité. Vérifier les montants et le rapprochement avec un relevé Trésor Pay.
7. Passer aux accès de production après validation, reconstruire `transaction-service` et comparer la première récupération avec le relevé officiel. Ne pas lancer de seed pour activer cette intégration.

Sans documentation et accès officiels, il n’est pas possible de vérifier une connexion réelle. En attendant, utiliser **Télécharger le modèle Excel**, y reporter les paiements réels du relevé et importer le fichier.

## Paiements déjà présents

Des références commençant par `TRES-PAY-` peuvent provenir de l’ancien générateur. Examiner le lot d’import, les montants et le relevé officiel avant de décider de leur correction. Le préfixe seul ne prouve pas qu’un paiement est fictif. Aucune donnée existante n’a été supprimée automatiquement.
