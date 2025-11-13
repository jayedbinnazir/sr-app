import { createWriteStream, readFileSync } from 'fs';
import { resolve } from 'path';

type SampleCombo = {
  regionId: string;
  areaId: string;
  distributorId: string;
  territoryId: string;
};

const TARGET_COUNT = Number(process.argv[2] ?? 100);
const SAMPLE_PATH = resolve(__dirname, '../csv/retailer_staging_sample.csv');
const OUTPUT_PATH = resolve(__dirname, `../retailers_${TARGET_COUNT}.csv`);

function pad(value: number | string, size: number) {
  return value.toString().padStart(size, '0');
}

function buildPhone(index: number) {
  return `01${pad(100000000 + (index % 900000000), 9)}`;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function loadSampleCombos(): SampleCombo[] {
  const csvRaw = readFileSync(SAMPLE_PATH, 'utf8');
  const [, ...rows] = csvRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const combos = rows.map((row) => {
    const [
      /* uid */,
      /* name */,
      /* phone */,
      regionId,
      areaId,
      distributorId,
      territoryId,
    ] = row.split(',');

    return {
      regionId,
      areaId,
      distributorId,
      territoryId,
    };
  });

  if (!combos.length) {
    throw new Error(
      `Sample file ${SAMPLE_PATH} does not contain any data rows. Ensure the file has at least one example record.`,
    );
  }

  return combos;
}

async function generateCsv() {
  const combos = loadSampleCombos();
  const stream = createWriteStream(OUTPUT_PATH, { encoding: 'utf8' });

  stream.write(
    'uid,name,phone,region_id,area_id,distributor_id,territory_id,points,routes,notes\n',
  );

  for (let i = 1; i <= TARGET_COUNT; i += 1) {
    const combo = pickRandom(combos);
    const uid = `R${pad(i, 7)}`;
    const name = `Retailer ${i}`;
    const phone = buildPhone(i);
    const points = Math.floor(Math.random() * 100) + 1;
    const route = `Route ${String.fromCharCode(65 + (i % 26))}`;
    const note = `Note ${i}`;

    const line = `${uid},${name},${phone},${combo.regionId},${combo.areaId},${combo.distributorId},${combo.territoryId},${points},${route},${note}\n`;

    if (!stream.write(line)) {
      await new Promise<void>((resolveDrain) => stream.once('drain', resolveDrain));
    }

    if (i % 100000 === 0) {
      console.log(`[generator] ${i.toLocaleString()} rows generated...`);
    }
  }

  await new Promise<void>((resolveClose, rejectClose) => {
    stream.end((err) => {
      if (err) {
        rejectClose(err);
      } else {
        resolveClose();
      }
    });
  });

  console.log(
    `[generator] Finished generating ${TARGET_COUNT.toLocaleString()} rows into ${OUTPUT_PATH}`,
  );
}

generateCsv().catch((error) => {
  console.error('[generator] Failed:', error);
  process.exit(1);
});


