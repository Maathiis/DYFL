import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB; 