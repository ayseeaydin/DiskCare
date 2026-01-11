import fs from "fs";
import path from "path";

const CLEAN_EXTENSIONS=[".tmp", ".log",".cache"];

export type CleanCandidate={
    path:string;
    size:number;
}

export async function findCleanCandidates(
    dir:string,
    exclude:string[]
): Promise<CleanCandidate[]>{
    const results: CleanCandidate[]=[];

    let entries: fs.Dirent[];
    try{
        entries=await fs.promises.readdir(dir, {withFileTypes: true});
    }catch{
        return results;
    }

    for(const entry of entries){
        if(exclude.includes(entry.name)) continue;

        const fullPath=path.join(dir, entry.name);

        try{
            if(entry.isFile()){
                const ext=path.extname(entry.name);
                if(CLEAN_EXTENSIONS.includes(ext)){
                    const stat=await fs.promises.stat(fullPath);
                    results.push({path:fullPath, size:stat.size});
                }
            } else if(entry.isDirectory()){
                const sub=await findCleanCandidates(fullPath, exclude);
                results.push(...sub);
            }
        } catch{
            // sessiz geç
        }
    }
    return results;
}