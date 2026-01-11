import fs from "fs";
import { get } from "http";
import path from "path";

export async function getDirectorySize(dir:string): Promise<number>{
    let total=0;

    try{
        const entries= await fs.promises.readdir(dir, {withFileTypes:true});

        for(const entry of entries){
            const fullPath=path.join(dir, entry.name);

            if(entry.isFile()){
                const stat=await fs.promises.stat(fullPath);
                total+=stat.size;
            } else if(entry.isDirectory()){
                total+= await getDirectorySize(fullPath);
            }
        }
    }catch{
        // erişim yoksa sessiz geç
    }

    return total;
}