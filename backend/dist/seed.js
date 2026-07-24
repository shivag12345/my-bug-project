import bcrypt from "bcryptjs";
import { env } from "./config/env.js";
import { User } from "./models/User.js";
import { Project } from "./models/Project.js";
import { Priority, Status, Category, EmailTemplate } from "./models/SettingsModels.js";
const defaultUserEmails = [
    "thapatta.charitha@gmail.com",
    "k.veeraharshavardhanreddy@gmail.com",
    "a.bharadwaj@gmail.com",
    "shivakumar.galibu60@gmail.com",
    "ganginenidheeraj@gmail.com",
    "pasamcharanbhaskarreddy@gmail.com",
    "dilshaadnazneen@gmail.com",
    "osurusudheerkumar@gmail.com",
    "samraju.thota@gmail.com",
    "vinay.nalagatla@gmail.com",
    "amrutha.p@gmail.com",
    "jagadeeshwar.gadeela@gmail.com",
    "pradeep.a@gmail.com",
    "siva.chintha@gmail.com",
    "vishnuvardhanreddy.dwarsala@gmail.com",
    "manideep.tankasala@gmail.com",
    "prasadkumar.madiga@gmail.com",
    "sahithi.gopidi@gmail.com",
    "vijitha.putluru@gmail.com",
    "sri@gmail.com",
    "guggala.supriya@gmail.com",
    "nandhitha.sri@gmail.com",
    "rakesh.hi@gmail.com",
    "gurushankar.mp@gmail.com",
    "naveen.kumary@gmail.com",
    "ranadeep.p@gmail.com",
    "chandrasekhar.u@gmail.com",
    "gajela.mahesh@gmail.com",
    "vinayakumar.moses@gmail.com",
    "suresh.reddy@gmail.com",
    "vineetha.thatha@gmail.com",
    "hitendrakumar.janapati@gmail.com",
    "sivasai.reddy@gmail.com",
    "admin@gmail.com",
    "shyam@gmail.com",
    "gangireddy.harishreddy@gmail.com",
    "ravikiran.gubbala@gmail.com",
    "gunji.nandhini@gmail.com",
    "sankati.narasimhareddy@gmail.com",
    "pilla.durgaprasad@gmail.com",
    "yampati.silpasri@gmail.com",
    "arepally.srinivas@gmail.com",
    "puli.maniteja@gmail.com",
    "nuthangi.suresh@gmail.com",
    "gaganeshwara.reddy@gmail.com",
    "vasantha.gokul@gmail.com",
    "garikapati.veerashankar@gmail.com",
    "ambala.tharunkumar@gmail.com",
    "boya.sivakumar@gmail.com",
    "mutyala.karunajyothi@gmail.com",
    "bhargava.kurapati@gmail.com",
    "kakarla.poornasai@gmail.com",
    "jonnala.rahul@gmail.com"
];
function nameFromEmail(email) {
    const localPart = email.split("@")[0];
    return localPart
        .split(".")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
export async function seedDefaults() {
    await User.updateOne({ email: env.adminEmail }, {
        $set: {
            email: env.adminEmail,
            passwordHash: await bcrypt.hash(env.adminPassword, 12),
            role: "Admin",
            department: "Administration",
            disabled: false
        },
        $setOnInsert: { name: nameFromEmail(env.adminEmail) }
    }, { upsert: true });
    await User.updateOne({ email: "pradeep.a@gmail.com" }, {
        $set: {
            name: "Pradeep A",
            email: "pradeep.a@gmail.com",
            passwordHash: await bcrypt.hash(env.adminPassword, 12),
            role: "Admin",
            department: "Administration",
            disabled: false
        }
    }, { upsert: true });
    const defaultPasswordHash = await bcrypt.hash(env.adminPassword, 12);
    for (const email of defaultUserEmails.filter((email) => ![env.adminEmail, "admin@gmail.com"].includes(email))) {
        await User.updateOne({ email }, {
            $setOnInsert: {
                name: nameFromEmail(email),
                email,
                passwordHash: defaultPasswordHash,
                role: "Developer",
                department: "Engineering",
                disabled: false
            }
        }, { upsert: true });
    }
    const project = await Project.findOne({ key: "BUGTRACK" });
    if (!project) {
        await Project.create({ name: "Bug Tracking Issue Suite", key: "BUGTRACK", description: "Internal bug tracking platform", status: "Active" });
    }
    for (const name of ["LOW", "MEDIUM", "HIGH", "CRITICAL"])
        await Priority.updateOne({ name }, { name }, { upsert: true });
    for (const name of ["OPEN", "BUG_BUCKET", "ASSIGNED", "IN_PROGRESS", "FIXED", "READY_FOR_TESTING", "REOPENED", "CLOSED"])
        await Status.updateOne({ name }, { name }, { upsert: true });
    for (const name of ["UI Bug", "Backend Bug", "API Bug", "Database Bug", "Performance Bug", "Security Bug", "Mobile Bug", "Enhancement Request"])
        await Category.updateOne({ name }, { name }, { upsert: true });
    await EmailTemplate.updateOne({ name: "Issue Assigned" }, { name: "Issue Assigned", subject: "Bug Tracking issue assigned", body: "An issue has been assigned to you." }, { upsert: true });
}
