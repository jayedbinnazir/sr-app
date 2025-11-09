import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import configuration from '../../Config/configuration';

// Load env manually
dotenv.config({
  path: path.join(process.cwd(), `.env.${process.env.NODE_ENV || 'dev'}`),
});

console.log('------------>', process.cwd());

const dbConfig = configuration().db;

console.log('==============>', dbConfig);

const isCompiled = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: Number(dbConfig.port),
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.name,
  synchronize: true,
  logging: true,
  entities: [
    isCompiled
      ? path.resolve(__dirname, '../../**/*.entity.js') // production dist
      : path.resolve(__dirname, '../**/*.entity.ts'), // dev ts
  ],
  migrations: [
    isCompiled
      ? path.resolve(__dirname, '../../../migrations/*.js') // production dist
      : path.resolve(__dirname, '../../migrations/*.ts'), // dev ts
  ],
});
