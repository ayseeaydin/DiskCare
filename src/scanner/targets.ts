import os from "os";
import path from "path";

export type ScanTarget={
    name:string;
    path:string;
};

export function getScanTargets():ScanTarget[]{
    const home=os.homedir();
    const tmp=os.tmpdir();

    const targets:ScanTarget[]=[
        {
            name:"OS Temp",
            path:tmp
        }
    ];

    if(process.platform==="win32"){
        targets.push({
            name:"Windows Temp",
            path:path.join(process.env.WINDIR || "C:\\Windows","Temp")
        });
    }
    
    return targets;
}