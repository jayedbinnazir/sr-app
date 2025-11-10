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

type SeedRole = {
  name: string;
  description: string;
};

type SeedUser = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

type SeedSalesRep = {
  name: string;
  username: string;
  phone: string;
  password: string;
};

const roles: SeedRole[] = [
  { name: 'admin', description: 'Administrator with full access' },
  { name: 'sales_rep', description: 'Sales representative with limited scope' },
];

const adminUser: SeedUser = {
  name: 'Jayed Bin Nazir',
  email: 'jayed.official0158@gmail.com',
  phone: '+8801521323469',
  password: 'Jayed015',
};

const salesReps: SeedSalesRep[] = [
  {
    name: 'Abir Rahman',
    username: 'abir@manush.tech',
    phone: '+8801711355057',
    password: 'Abir015',
  },
  {
    name: 'Syed Asim Anwar',
    username: 'asim.anwar@manush.tech',
    phone: '+8801864203231',
    password: 'Abir015',
  },
  {
    name: 'Imran RS Bhuiyan',
    username: 'imran@manush.tech',
    phone: '+8801864203231',
    password: 'Abir015',
  },
];

const regionSeeds = [
  {
    name: 'Dhaka',
    areas: [
      { name: 'Gulshan', territories: ['Gulshan 1', 'Gulshan 2'] },
      { name: 'Dhanmondi', territories: ['Dhanmondi Block A', 'Dhanmondi Block B'] },
    ],
    distributors: ['Dhaka Distributors Ltd', 'Capital Trade Hub'],
  },
  {
    name: 'Rajshahi',
    areas: [
      { name: 'Motihar', territories: ['Binodpur', 'Kazla'] },
      { name: 'Boalia', territories: ['Shaheb Bazar', 'Padma Residential'] },
    ],
    distributors: ['Rajshahi Traders Consortium', 'Northwest Supply Co'],
  },
] satisfies Array<{
  name: string;
  areas: { name: string; territories: string[] }[];
  distributors: string[];
}>;

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

  let user = await userRepository.findOne({ where: { email: payload.email } });
  if (!user) {
    const passwordHash = await bcrypt.hash(payload.password, saltRounds);
    user = userRepository.create({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: passwordHash,
      provider: 'local',
    });
    await userRepository.save(user);
    console.log(`Created user '${payload.email}'`);
  } else {
    let needsUpdate = false;
    if (user.name !== payload.name) {
      user.name = payload.name;
      needsUpdate = true;
    }
    if (user.phone !== payload.phone) {
      user.phone = payload.phone;
      needsUpdate = true;
    }
    if (!user.password) {
      user.password = await bcrypt.hash(payload.password, saltRounds);
      needsUpdate = true;
    }
    if (needsUpdate) {
      await userRepository.save(user);
      console.log(`Updated user '${payload.email}'`);
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
    console.log(`Linked user '${payload.email}' to role '${role.name}'`);
  }

  return user;
}

async function ensureSalesReps(
  dataSource: DataSource,
  role: Role,
): Promise<void> {
  const salesRepRepository = dataSource.getRepository(SalesRep);
  for (const rep of salesReps) {
    const user = await ensureUserWithRole(dataSource, role, {
      name: rep.name,
      email: rep.username,
      phone: rep.phone,
      password: rep.password,
    });

    let existingSalesRep = await salesRepRepository.findOne({
      where: [{ user_id: user.id }, { username: rep.username }],
    });

    if (!existingSalesRep) {
      existingSalesRep = salesRepRepository.create({
        user_id: user.id,
        username: rep.username,
        name: rep.name,
        phone: rep.phone,
      });
      await salesRepRepository.save(existingSalesRep);
      console.log(`Created sales rep '${rep.username}'`);
    } else {
      let needsUpdate = false;
      if (existingSalesRep.name !== rep.name) {
        existingSalesRep.name = rep.name;
        needsUpdate = true;
      }
      if (existingSalesRep.phone !== rep.phone) {
        existingSalesRep.phone = rep.phone;
        needsUpdate = true;
      }
      if (existingSalesRep.username !== rep.username) {
        existingSalesRep.username = rep.username;
        needsUpdate = true;
      }
      if (needsUpdate) {
        await salesRepRepository.save(existingSalesRep);
        console.log(`Updated sales rep '${rep.username}'`);
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

  for (const regionSeed of regionSeeds) {
    let region = await regionRepository.findOne({
      where: { name: regionSeed.name },
    });

    if (!region) {
      region = regionRepository.create({ name: regionSeed.name });
      region = await regionRepository.save(region);
      console.log(`Created region '${regionSeed.name}'`);
    }

    for (const areaSeed of regionSeed.areas) {
      let area = await areaRepository.findOne({
        where: { name: areaSeed.name, region_id: region.id },
      });

      if (!area) {
        area = areaRepository.create({
          name: areaSeed.name,
          region_id: region.id,
        });
        area = await areaRepository.save(area);
        console.log(`Created area '${areaSeed.name}' in region '${regionSeed.name}'`);
      }

      for (const territoryName of areaSeed.territories) {
        let territory = await territoryRepository.findOne({
          where: { name: territoryName, area_id: area.id },
        });

        if (!territory) {
          territory = territoryRepository.create({
            name: territoryName,
            area_id: area.id,
          });
          await territoryRepository.save(territory);
          console.log(
            `Created territory '${territoryName}' in area '${areaSeed.name}'`,
          );
        }
      }
    }

    for (const distributorName of regionSeed.distributors ?? []) {
      let distributor = await distributorRepository.findOne({
        where: { name: distributorName },
      });

      if (!distributor) {
        distributor = distributorRepository.create({
          name: distributorName,
          region_id: region.id,
        });
        await distributorRepository.save(distributor);
        console.log(`Created distributor '${distributorName}' in region '${regionSeed.name}'`);
      } else if (distributor.region_id !== region.id) {
        distributor.region_id = region.id;
        await distributorRepository.save(distributor);
        console.log(`Updated distributor '${distributorName}' region to '${regionSeed.name}'`);
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
    console.log('Regions, areas, and territories seeded');
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

