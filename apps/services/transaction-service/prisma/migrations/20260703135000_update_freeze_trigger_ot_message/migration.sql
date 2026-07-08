CREATE OR REPLACE FUNCTION verifier_gel_transaction()
RETURNS TRIGGER AS $$
DECLARE
    op_id INTEGER;
    op_status VARCHAR(50);
BEGIN
    FOREACH op_id IN ARRAY ARRAY[
        OLD.ordre_paiement_id,
        CASE WHEN TG_OP = 'UPDATE' THEN NEW.ordre_paiement_id ELSE NULL END
    ]
    LOOP
        IF op_id IS NULL THEN
            CONTINUE;
        END IF;

        SELECT statut
        INTO op_status
        FROM ordre_paiement_miroir
        WHERE id = op_id;

        IF op_status IS NOT NULL AND op_status <> 'Brouillon' THEN
            RAISE EXCEPTION
                'Modification refusee : la transaction % est gelee car l''Ordre de Traitement % est au statut %.',
                OLD.id,
                op_id,
                op_status;
        END IF;
    END LOOP;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
