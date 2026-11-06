const router=require("express").Router();
const express=require("express");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");
const asyncHandler=require("../utils/asyncHandler");
const {authenticate,requireAdmin}=require("../middleware/auth");

const allowed={"image/jpeg":{ext:".jpg",sig:[0xff,0xd8,0xff]},"image/png":{ext:".png",sig:[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]},"image/webp":{ext:".webp",riff:true}};
router.post("/image",authenticate,requireAdmin,express.raw({type:Object.keys(allowed),limit:"5mb"}),asyncHandler(async(req,res)=>{
  const mime=req.headers["content-type"]?.split(";")[0].trim();
  const spec=allowed[mime],buffer=req.body;
  if(!spec||!Buffer.isBuffer(buffer)||!buffer.length)return res.status(400).json({message:"Choose a JPG, PNG or WEBP image."});
  if(buffer.length>5*1024*1024)return res.status(413).json({message:"Image must be 5 MB or smaller."});
  const valid=spec.riff
    ? buffer.length>12&&buffer.toString("ascii",0,4)==="RIFF"&&buffer.toString("ascii",8,12)==="WEBP"
    : spec.sig.every((value,index)=>buffer[index]===value);
  if(!valid)return res.status(400).json({message:"The uploaded file does not match its image type."});
  const dir=path.join(__dirname,"../../storefront/images/uploads");
  await fs.promises.mkdir(dir,{recursive:true});
  const filename=crypto.randomUUID()+spec.ext;
  await fs.promises.writeFile(path.join(dir,filename),buffer,{flag:"wx"});
  res.status(201).json({url:"/images/uploads/"+filename});
}));
module.exports=router;
