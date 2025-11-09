export default () => {
  console.log('checking', process.env.DB_PORT);
  return {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
  };
};
