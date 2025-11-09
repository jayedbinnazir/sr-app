import applicationConfig from './application/application.config';
import databaseConfig from './database/database.config';
import awsS3 from './files/aws';

export default () => ({
  app: applicationConfig(),
  db: databaseConfig(),
  s3: awsS3(),
});
