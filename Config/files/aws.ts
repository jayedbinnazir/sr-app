export default () => {
  return {
    user: process.env.AWS_S3_USER,
    access_key: process.env.AWS_S3_ACCESS_KEY,
    secret_key: process.env.AWS_S3_SECRET_KEY,
    bucket_name: process.env.AWS_S3_BUCKET_NAME,
    region: process.env.S3_REGION,
  };
};
