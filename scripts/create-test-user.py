#!/usr/bin/env python3
"""Créer le compte de recette dans le conteneur auth-service déjà démarré."""

import getpass
import json
from pathlib import Path
import subprocess
import sys

MIN_PASSWORD_LENGTH = 8


def main():
    root = Path(__file__).resolve().parents[1]
    source = root / 'apps/services/auth-service/prisma/create-test-user.js'
    password = getpass.getpass(
        f'Mot de passe du compte de recette ({MIN_PASSWORD_LENGTH} caractères minimum) : '
    )
    if len(password) < MIN_PASSWORD_LENGTH:
        raise SystemExit('Mot de passe trop court : aucun compte créé.')
    if password != getpass.getpass('Confirmer le mot de passe : '):
        raise SystemExit('Les mots de passe diffèrent : aucun compte créé.')

    payload = 'process.env.TEST_USER_PASSWORD = ' + json.dumps(password) + ';\n' + source.read_text()
    result = subprocess.run([
        'docker', 'compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.prod.yml',
        '--env-file', '.env.production', 'exec', '-T', 'auth-service', 'node',
    ], cwd=root, input=payload, text=True)
    if result.returncode:
        raise SystemExit(result.returncode)
    print('Compte prêt : test.recette@progitresor.online')
    print('Connexion : https://progitresor.online/login')


if __name__ == '__main__':
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print('\nCréation annulée.', file=sys.stderr)
        sys.exit(1)