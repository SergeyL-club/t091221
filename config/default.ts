const PORT: number = 8080;
const HOST: string = "localhost";
const DB_NAME: string = "DefBase";
const MONGO_PORT = 27017;
const DB_URL: string = `mongodb://${HOST}:${MONGO_PORT}`;
const SECRET_KEY: string = `sdfsfvnmwevtyuzxgvudafvjawvfjsdgfuyawfugsdvjchv`;
export default {
  PORT,
  HOST,
  DB_NAME,
  MONGO_PORT,
  DB_URL,
  SECRET_KEY,
};
