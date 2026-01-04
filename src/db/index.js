import mongoose from "mongoose";
import {DB_NAME} from "../constant.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`DB CONNECTED !! DB NAME: ${connectionInstance.connection.name}`);
        
    } catch (error) {
        console.log("Database fails to connect!!" , error);
        process.exit(1);
    }
} 

export {connectDB};