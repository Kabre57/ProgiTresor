-- Allow administrative updates (statut_traitement, gele) on frozen transactions.
-- The freeze trigger protects financial data but must not block legitimate
-- workflow transitions like "Transmettre au Budget".

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
        -- Allow updates that ONLY change administrative fields
        -- (statut_traitement and/or gele) without touching financial data.
        IF TG_OP = 'UPDATE'
           AND OLD.ordre_traitement_id IS NOT DISTINCT FROM NEW.ordre_traitement_id
           AND OLD.montant IS NOT DISTINCT FROM NEW.montant
           AND OLD.ref_tresor IS NOT DISTINCT FROM NEW.ref_tresor
           AND OLD.etudiant_id IS NOT DISTINCT FROM NEW.etudiant_id
           AND OLD.antenne_id IS NOT DISTINCT FROM NEW.antenne_id
           AND OLD.nomenclature_id IS NOT DISTINCT FROM NEW.nomenclature_id
           AND OLD.date_heure IS NOT DISTINCT FROM NEW.date_heure
        THEN
            -- This is an administrative status update – allow it
            RETURN NEW;
        END IF;

        RAISE EXCEPTION
            'Modification refusee : la transaction % est gelee car l''Ordre de Traitement % est au statut %.',
            OLD.id, v_ordre_traitement_id, v_statut;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
