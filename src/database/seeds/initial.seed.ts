import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../typeorm.datasource';
import { Role } from 'src/role/entities/role.entity';
import { User } from 'src/user/entities/user.entity';
import { AppUser } from 'src/app_user/entities/app_user.entity';
import { SalesRep } from 'src/sales_rep/entities/sales_rep.entity';
import { Region } from 'src/region/entities/region.entity';
import { Area } from 'src/area/entities/area.entity';
import { Territory } from 'src/territory/entities/territory.entity';
import { Distributor } from 'src/distributor/entities/distributor.entity';
import { Retailer } from 'src/retailer/entities/retailer.entity';

type SeedRole = {
  name: string;
  description: string;
};

type SeedUser = {
  name: string;
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  password: string;
};

type SeedSalesRep = {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
};

const REGION_COUNT = 5;
const AREAS_PER_REGION = 10;
const TERRITORIES_PER_AREA = 10;
const DISTRIBUTORS_PER_AREA = 3;
const RETAILERS_PER_TERRITORY = 3;
const SALES_REP_COUNT = 30;

const roles: SeedRole[] = [
  { name: 'admin', description: 'Administrator with full access' },
  { name: 'sales_rep', description: 'Sales representative with limited scope' },
];

const adminUser: SeedUser = {
  name: 'Jayed Bin Nazir',
  email: 'jayed.official0158@gmail.com',
  username: 'jayed.bin.nazir',
  phone: '+8801521323469',
  password: 'Jayed015',
};

async function ensureRoles(dataSource: DataSource): Promise<Record<string, Role>> {
  const roleRepository = dataSource.getRepository(Role);
  const ensuredRoles: Record<string, Role> = {};

  for (const role of roles) {
    let existing = await roleRepository.findOne({ where: { name: role.name } });
    if (!existing) {
      existing = roleRepository.create(role);
      await roleRepository.save(existing);
      console.log(`Created role '${role.name}'`);
    } else {
      let requiresUpdate = false;
      if (existing.description !== role.description) {
        existing.description = role.description;
        requiresUpdate = true;
      }
      if (requiresUpdate) {
        await roleRepository.save(existing);
        console.log(`Updated role '${role.name}' description`);
      }
    }
    ensuredRoles[role.name] = existing;
  }

  return ensuredRoles;
}

async function ensureUserWithRole(
  dataSource: DataSource,
  role: Role,
  payload: SeedUser,
): Promise<User> {
  const userRepository = dataSource.getRepository(User);
  const appUserRepository = dataSource.getRepository(AppUser);
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

  const normalizedEmail = payload.email?.toLowerCase() ?? null;
  const normalizedUsername = payload.username?.toLowerCase() ?? null;

  let user: User | null = null;
  if (normalizedEmail) {
    user = await userRepository.findOne({ where: { email: normalizedEmail } });
  }
  if (!user && normalizedUsername) {
    user = await userRepository.findOne({ where: { username: normalizedUsername } });
  }

  if (!user) {
    const passwordHash = await bcrypt.hash(payload.password, saltRounds);
    const fallbackUsername =
      normalizedUsername ??
      (normalizedEmail ? normalizedEmail.split('@')[0] : null);
    user = userRepository.create({
      name: payload.name,
      email: normalizedEmail,
      username: fallbackUsername,
      phone: payload.phone ?? null,
      password: passwordHash,
      provider: 'local',
    });
    await userRepository.save(user);
    console.log(`Created user '${normalizedEmail ?? normalizedUsername}'`);
  } else {
    let needsUpdate = false;
    if (user.name !== payload.name) {
      user.name = payload.name;
      needsUpdate = true;
    }
    if (payload.phone !== undefined && user.phone !== payload.phone) {
      user.phone = payload.phone;
      needsUpdate = true;
    }
    if (normalizedUsername && user.username !== normalizedUsername) {
      user.username = normalizedUsername;
      needsUpdate = true;
    }
    if (normalizedEmail && user.email !== normalizedEmail) {
      user.email = normalizedEmail;
      needsUpdate = true;
    }
    if (!user.password) {
      user.password = await bcrypt.hash(payload.password, saltRounds);
      needsUpdate = true;
    }
    if (needsUpdate) {
      await userRepository.save(user);
      console.log(`Updated user '${normalizedEmail ?? normalizedUsername}'`);
    }
  }

  const existingAppUser = await appUserRepository.findOne({
    where: { user_id: user.id, role_id: role.id },
  });

  if (!existingAppUser) {
    const appUser = appUserRepository.create({
      user_id: user.id,
      role_id: role.id,
    });
    await appUserRepository.save(appUser);
    console.log(`Linked user '${normalizedEmail ?? normalizedUsername}' to role '${role.name}'`);
  }

  return user;
}

function generateSalesRepSeeds(count: number): SeedSalesRep[] {
  return Array.from({ length: count }, (_, index) => {
    const i = index + 1;
    return {
      name: `Sales Rep ${i}`,
      username: `salesrep${i}`,
      email: `salesrep${i}@example.com`,
      phone: `+8801700${i.toString().padStart(6, '0')}`,
      password: `SalesRep${i}!`,
    };
  });
}

async function ensureSalesReps(
  dataSource: DataSource,
  role: Role,
): Promise<void> {
  const salesRepRepository = dataSource.getRepository(SalesRep);
  const salesRepSeeds = generateSalesRepSeeds(SALES_REP_COUNT);
  for (const rep of salesRepSeeds) {
    const seedUsername = rep.username.toLowerCase();
    const seedEmail = rep.email.toLowerCase();
    const user = await ensureUserWithRole(dataSource, role, {
      name: rep.name,
      email: seedEmail,
      username: seedUsername,
      phone: rep.phone,
      password: rep.password,
    });

    const whereConditions: Array<{ user_id?: string; username?: string }> = [
      { user_id: user.id },
    ];
    whereConditions.push({ username: seedUsername });
    let existingSalesRep = await salesRepRepository.findOne({
      where: whereConditions,
    });

    const resolvedUsername = seedUsername;

    if (!existingSalesRep) {
      existingSalesRep = salesRepRepository.create({
        user_id: user.id,
        username: resolvedUsername,
        name: rep.name,
        phone: rep.phone ?? null,
      });
      await salesRepRepository.save(existingSalesRep);
      console.log(
        `Created sales rep '${existingSalesRep.username}'`,
      );
    } else {
      let needsUpdate = false;
      if (existingSalesRep.name !== rep.name) {
        existingSalesRep.name = rep.name;
        needsUpdate = true;
      }
      if (existingSalesRep.phone !== rep.phone) {
        existingSalesRep.phone = rep.phone ?? null;
        needsUpdate = true;
      }
      const targetUsername = resolvedUsername;
      if (existingSalesRep.username !== targetUsername) {
        existingSalesRep.username = targetUsername;
        needsUpdate = true;
      }
      if (needsUpdate) {
        await salesRepRepository.save(existingSalesRep);
        console.log(`Updated sales rep '${existingSalesRep.username}'`);
      }
    }
  }
}

async function ensureRegionsHierarchy(
  dataSource: DataSource,
): Promise<void> {
  const regionRepository = dataSource.getRepository(Region);
  const areaRepository = dataSource.getRepository(Area);
  const territoryRepository = dataSource.getRepository(Territory);
  const distributorRepository = dataSource.getRepository(Distributor);
  const retailerRepository = dataSource.getRepository(Retailer);

  for (let regionIndex = 1; regionIndex <= REGION_COUNT; regionIndex += 1) {
    const regionName = `Region ${regionIndex}`;
    let region = await regionRepository.findOne({
      where: { name: regionName },
    });

    if (!region) {
      region = regionRepository.create({ name: regionName });
      region = await regionRepository.save(region);
      console.log(`Created region '${regionName}'`);
    }

    for (let areaIndex = 1; areaIndex <= AREAS_PER_REGION; areaIndex += 1) {
      const areaName = `Region ${regionIndex} Area ${areaIndex}`;
      let area = await areaRepository.findOne({
        where: { name: areaName, region_id: region.id },
      });

      if (!area) {
        area = areaRepository.create({
          name: areaName,
          region_id: region.id,
        });
        area = await areaRepository.save(area);
        console.log(`Created area '${areaName}' in region '${regionName}'`);
      }

      const areaDistributors: Distributor[] = [];
      for (
        let distributorIndex = 1;
        distributorIndex <= DISTRIBUTORS_PER_AREA;
        distributorIndex += 1
      ) {
        const distributorName = `${areaName} Distributor ${distributorIndex}`;
        let distributor = await distributorRepository.findOne({
          where: { name: distributorName },
        });

        if (!distributor) {
          distributor = distributorRepository.create({
            name: distributorName,
            area_id: area.id,
          });
          distributor = await distributorRepository.save(distributor);
          console.log(`Created distributor '${distributorName}'`);
        } else if (distributor.area_id !== area.id) {
          distributor.area_id = area.id;
          distributor = await distributorRepository.save(distributor);
          console.log(`Updated distributor '${distributorName}' area to '${areaName}'`);
        }

        areaDistributors.push(distributor);
      }

      for (
        let territoryIndex = 1;
        territoryIndex <= TERRITORIES_PER_AREA;
        territoryIndex += 1
      ) {
        const territoryName = `${areaName} Territory ${territoryIndex}`;
        let territory = await territoryRepository.findOne({
          where: { name: territoryName, area_id: area.id },
        });

        if (!territory) {
          territory = territoryRepository.create({
            name: territoryName,
            area_id: area.id,
          });
          territory = await territoryRepository.save(territory);
          console.log(`Created territory '${territoryName}' in area '${areaName}'`);
        }

        for (
          let retailerIndex = 1;
          retailerIndex <= RETAILERS_PER_TERRITORY;
          retailerIndex += 1
        ) {
          const retailerUid = `RT-${regionIndex}-${areaIndex}-${territoryIndex}-${retailerIndex}`;
          let retailer = await retailerRepository.findOne({
            where: { uid: retailerUid },
          });

          const retailerName = `Retailer ${regionIndex}-${areaIndex}-${territoryIndex}-${retailerIndex}`;
          const phone = `+880180${(regionIndex * 100000 + areaIndex * 1000 + territoryIndex * 10 + retailerIndex)
            .toString()
            .padStart(6, '0')}`;
          const assignedDistributor =
            areaDistributors[
              (retailerIndex - 1) % areaDistributors.length
            ] ?? null;

          if (!retailer) {
            retailer = retailerRepository.create({
              uid: retailerUid,
              name: retailerName,
              phone,
              region_id: region.id,
              area_id: area.id,
              distributor_id: assignedDistributor?.id ?? null,
              territory_id: territory.id,
              points: 0,
              routes: null,
              notes: null,
            });
            await retailerRepository.save(retailer);
            console.log(`Created retailer '${retailerName}'`);
          } else {
            let needsUpdate = false;
            if (retailer.name !== retailerName) {
              retailer.name = retailerName;
              needsUpdate = true;
            }
            if (retailer.phone !== phone) {
              retailer.phone = phone;
              needsUpdate = true;
            }
            if (retailer.region_id !== region.id) {
              retailer.region_id = region.id;
              needsUpdate = true;
            }
            if (retailer.area_id !== area.id) {
              retailer.area_id = area.id;
              needsUpdate = true;
            }
            if (retailer.territory_id !== territory.id) {
              retailer.territory_id = territory.id;
              needsUpdate = true;
            }
            const targetDistributorId = assignedDistributor?.id ?? null;
            if (retailer.distributor_id !== targetDistributorId) {
              retailer.distributor_id = targetDistributorId;
              needsUpdate = true;
            }
            if (needsUpdate) {
              await retailerRepository.save(retailer);
              console.log(`Updated retailer '${retailer.uid}' associations`);
            }
          }
        }
      }
    }
  }
}

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const ensuredRoles = await ensureRoles(AppDataSource);
    const admin = await ensureUserWithRole(AppDataSource, ensuredRoles.admin, adminUser);
    console.log(`Admin user ready: ${admin.email}`);
    await ensureSalesReps(AppDataSource, ensuredRoles.sales_rep);
    console.log('Sales reps seeded');
    await ensureRegionsHierarchy(AppDataSource);
    console.log('Regions, areas, territories, distributors, and retailers seeded');
  } finally {
    await AppDataSource.destroy();
  }
}

seed()
  .then(() => {
    console.log('Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  });

