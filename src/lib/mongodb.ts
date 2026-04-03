import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

const globalForMongoose = globalThis as unknown as {
  mongooseConn: typeof mongoose | undefined;
  mongoosePromise: Promise<typeof mongoose> | undefined;
};

export async function connectMongoDB() {
  if (globalForMongoose.mongooseConn) {
    return globalForMongoose.mongooseConn;
  }

  if (!globalForMongoose.mongoosePromise) {
    globalForMongoose.mongoosePromise = mongoose.connect(MONGODB_URI);
  }

  globalForMongoose.mongooseConn = await globalForMongoose.mongoosePromise;
  return globalForMongoose.mongooseConn;
}
