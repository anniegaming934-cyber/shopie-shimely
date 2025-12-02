import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function reset() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const collections = await mongoose.connection.db.collections();

    for (let collection of collections) {
      console.log("Dropping:", collection.collectionName);
      await collection.drop();
    }

    console.log("Database reset complete!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

reset();
