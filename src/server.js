require("dotenv").config();
const app=require("./app");
const connectDatabase=require("./config/db");
const port=Number(process.env.PORT)||4000;
connectDatabase().then(()=>{
 const server=app.listen(port,()=>console.log(`PAATI & CO API listening on http://localhost:${port}`));
 const shutdown=()=>server.close(()=>process.exit(0));
 process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
}).catch(err=>{console.error("Startup failed:",err.message);process.exit(1)});
