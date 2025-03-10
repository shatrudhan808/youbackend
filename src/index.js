import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
dotenv.config({path:'./.env'})

connectDB()
.then( () => {
    app.listen(process.env.PORT || 5000, () =>{
        console.log(` Server is running on PORT:, ${process.env.PORT}`);
        
    })
})
.catch( (err) =>{
    console.log("DB CONNECTION ERROR !!", err);
    
})



/*
import express from "express";
const app = express()

;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error)=> {console.log("error", error);
            throw error
        })
        app.listen(process.env.PORT, ()=> {
            console.log(`App is  Listening on ${process.env.PORT}`);
            
        })
    } catch (error) {
        console.error("ERROR:", error);
        throw error
        
    }
} )() */
