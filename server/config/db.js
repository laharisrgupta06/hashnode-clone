import mongoose from 'mongoose';

// Connects to MongoDB Atlas using the connection string in .env (MONGO_URI).
// If the connection fails, we stop the server: an API without a database is useless.
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('MONGO_URI is missing. Add it to server/.env (see .env.example).');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: host=${conn.connection.host}, db=${conn.connection.name}`);
  } catch (error) {
    // error.message does not contain your password, but we still avoid printing the URI.
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
