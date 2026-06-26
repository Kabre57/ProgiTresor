#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE progi_auth;
    CREATE DATABASE progi_etudiant;
    CREATE DATABASE progi_transaction;
    CREATE DATABASE progi_order;
    CREATE DATABASE progi_compta;
EOSQL
