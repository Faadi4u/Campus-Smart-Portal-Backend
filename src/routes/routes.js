import mongoose from "mongoose";

export const healthz_routes = (req,res,next) => {
    res.status(200).json({status :"OK"});
};

export const readyz_routes = (req,res,next) => {
    const mongoReady = mongoose.connection.readyState === 1 // 1 = connected

    if(!mongoReady){
        return res.status(503).json({status: "Not Ready" , mongo : "Disconnected"});
    }else{
        res.status(200).json({status: "Ready" , mongo : "Mongo connected"})
    }
};

