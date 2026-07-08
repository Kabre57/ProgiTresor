const fs = require('fs');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL env var is required.');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function run() {
  console.log('Connecting to database...');
  const client = await pool.connect();

  try {
    console.log('Truncating tables CASCADE...');
    // Clear dependent tables first
    await client.query('TRUNCATE TABLE configuration_frais_niveau CASCADE;');
    await client.query('TRUNCATE TABLE nomenclature_produit CASCADE;');
    await client.query('TRUNCATE TABLE type_recette CASCADE;');
    await client.query('TRUNCATE TABLE type_flux CASCADE;');

    // Read seed SQL file
    const sqlContent = fs.readFileSync('/app/scratch_seed.sql', 'utf8');
    const lines = sqlContent.split('\n');

    console.log(`Processing ${lines.length} lines from scratch_seed.sql...`);

    // We first insert type_flux
    const fluxMap = new Map(); // code -> id
    const typeRecetteMap = new Map(); // code -> id

    // 1. Insert Type Flux
    const BUDGET_ID = (await client.query(
      "INSERT INTO type_flux (code, libelle) VALUES ('BUDGET', 'BUDGET') RETURNING id"
    )).rows[0].id;
    const HORS_BUDGET_ID = (await client.query(
      "INSERT INTO type_flux (code, libelle) VALUES ('HORS_BUDGET', 'HORS BUDGET') RETURNING id"
    )).rows[0].id;

    fluxMap.set('BUDGET', BUDGET_ID);
    fluxMap.set('HORS_BUDGET', HORS_BUDGET_ID);
    console.log('Seeded type_flux codes.');

    // 2. Insert Type Recette mapping
    const trMapping = {
      'INSCRIPTION': 'BUDGET',
      'SCOLARITE': 'BUDGET',
      'VACCINATION': 'HORS_BUDGET',
      'ENCADREMENT': 'HORS_BUDGET',
      'KIT_STAGE': 'HORS_BUDGET',
      'BLOUSES': 'HORS_BUDGET',
      'CEREMONIE': 'HORS_BUDGET',
      'ASSURANCE': 'HORS_BUDGET',
      'FRAIS_DIPLOME': 'BUDGET'
    };

    for (const line of lines) {
      if (line.trim().startsWith("INSERT INTO type_recette")) {
        const valuesIndex = line.indexOf('VALUES');
        if (valuesIndex !== -1) {
          const valuesPart = line.substring(valuesIndex + 6).trim();
          const contentInsideParentheses = valuesPart.slice(1, valuesPart.indexOf(')'));
          const commaIndex = contentInsideParentheses.indexOf(',');
          if (commaIndex !== -1) {
            const code = contentInsideParentheses.slice(0, commaIndex).trim().replace(/'/g, '');
            const libelle = contentInsideParentheses.slice(commaIndex + 1).trim().replace(/'/g, '');
            const fluxCode = trMapping[code] || 'HORS_BUDGET';
            const fluxId = fluxMap.get(fluxCode);

            const res = await client.query(
              "INSERT INTO type_recette (code, libelle, type_flux_id) VALUES ($1, $2, $3) RETURNING id",
              [code, libelle, fluxId]
            );
            typeRecetteMap.set(code, res.rows[0].id);
          }
        }
      }
    }
    console.log(`Seeded ${typeRecetteMap.size} type_recette codes.`);

    // 3. Insert Nomenclature Produit
    let nomenclatureCount = 0;
    for (const line of lines) {
      if (line.trim().startsWith("INSERT INTO nomenclature_produit")) {
        const clean = line.replace(/''/g, "##SINGLE_QUOTE##");
        // Regex to parse SELECT values
        const regex = /SELECT\s+'([^']+)',\s+'([^']+)',\s+tr\.id,\s+tf\.id,\s+(\d+)\s+FROM\s+type_recette\s+tr/i;
        const match = clean.match(regex);
        if (match) {
          const codeProduit = match[1].replace(/##SINGLE_QUOTE##/g, "'");
          const libelleBrut = match[2].replace(/##SINGLE_QUOTE##/g, "'");
          const montant = parseInt(match[3], 10);
          
          // Find type_recette code from the line (e.g. tr.code = 'INSCRIPTION')
          const trCodeMatch = clean.match(/tr\.code\s*=\s*'([^']+)'/i);
          if (trCodeMatch) {
            const trCode = trCodeMatch[1].replace(/##SINGLE_QUOTE##/g, "'");
            const typeRecetteId = typeRecetteMap.get(trCode);

            if (typeRecetteId) {
              await client.query(
                `INSERT INTO nomenclature_produit 
                 (code_produit, libelle_brut, libelle_standard, type_recette_id, montant, actif) 
                 VALUES ($1, $2, $3, $4, $5, true)`,
                [codeProduit, libelleBrut, libelleBrut, typeRecetteId, montant]
              );
              nomenclatureCount++;
            } else {
              console.warn(`Warning: type_recette not found for code ${trCode}`);
            }
          }
        } else {
          console.warn(`Could not parse nomenclature line: ${line.substring(0, 100)}...`);
        }
      }
    }
    console.log(`Seeded ${nomenclatureCount} nomenclature_produit rows.`);
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
