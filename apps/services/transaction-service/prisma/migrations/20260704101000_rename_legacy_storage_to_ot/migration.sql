-- Rename physical OT references while preserving existing data.
ALTER TABLE IF EXISTS "transaction" RENAME COLUMN "ordre_paiement_id" TO "ordre_traitement_id";
ALTER TABLE IF EXISTS "ordre_paiement_miroir" RENAME TO "ordre_traitement_miroir";
ALTER TABLE IF EXISTS "ordre_traitement_miroir" RENAME COLUMN "code_op" TO "code_ot";

ALTER INDEX IF EXISTS "transaction_ordre_paiement_id_idx" RENAME TO "transaction_ordre_traitement_id_idx";
ALTER INDEX IF EXISTS "ordre_paiement_miroir_pkey" RENAME TO "ordre_traitement_miroir_pkey";
ALTER INDEX IF EXISTS "ordre_paiement_miroir_code_op_key" RENAME TO "ordre_traitement_miroir_code_ot_key";

CREATE OR REPLACE FUNCTION verifier_gel_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_statut TEXT;
    v_ordre_traitement_id INTEGER;
BEGIN
    v_ordre_traitement_id := COALESCE(
        OLD.ordre_traitement_id,
        CASE WHEN TG_OP = 'UPDATE' THEN NEW.ordre_traitement_id ELSE NULL END
    );

    IF v_ordre_traitement_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT statut INTO v_statut
    FROM ordre_traitement_miroir
    WHERE id = v_ordre_traitement_id;

    IF v_statut IS NOT NULL AND v_statut <> 'Brouillon' THEN
        RAISE EXCEPTION
            'Modification refusee : la transaction % est gelee car l''Ordre de Traitement % est au statut %.',
            OLD.id, v_ordre_traitement_id, v_statut;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
