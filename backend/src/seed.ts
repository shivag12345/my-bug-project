import bcrypt from "bcryptjs";
import { env } from "./config/env.js";
import { User } from "./models/User.js";
import { Project } from "./models/Project.js";
import { Priority, Status, Category, EmailTemplate } from "./models/SettingsModels.js";

const defaultUserEmails = [
  "thapatta.charitha@pirnav.com",
  "k.veeraharshavardhanreddy@pirnav.com",
  "a.bharadwaj@pirnav.com",
  "shivakumar.galibu60@gmal.com",
  "ganginenidheeraj@pirnav.com",
  "pasamcharanbhaskarreddy@pirnav.com",
  "dilshaadnazneen@pirnav.com",
  "osurusudheerkumar@pirnav.com",
  "samraju.thota@pirnav.com",
  "vinay.nalagatla@pirnav.com",
  "amrutha.p@pirnav.com",
  "jagadeeshwar.gadeela@pirnav.com",
  "pradeep.a@pirnav.com",
  "siva.chintha@pirnav.com",
  "vishnuvardhanreddy.dwarsala@pirnav.com",
  "manideep.tankasala@pirnav.com",
  "prasadkumar.madiga@pirnav.com",
  "sahithi.gopidi@pirnav.com",
  "vijitha.putluru@pirnav.com",
  "sri@pirnav.com",
  "guggala.supriya@pirnav.com",
  "nandhitha.sri@pirnav.com",
  "rakesh.hi@pirnav.com",
  "gurushankar.mp@pirnav.com",
  "naveen.kumary@pirnav.com",
  "ranadeep.p@pirnav.com",
  "chandrasekhar.u@pirnav.com",
  "gajela.mahesh@pirnav.com",
  "vinayakumar.moses@pirnav.com",
  "suresh.reddy@pirnav.com",
  "vineetha.thatha@pirnav.com",
  "hitendrakumar.janapati@pirnav.com",
  "sivasai.reddy@pirnav.com",
  "admin@pirnav.com",
  "shyam@pirnav.com",
  "gangireddy.harishreddy@pirnav.com",
  "ravikiran.gubbala@pirnav.com",
  "gunji.nandhini@pirnav.com",
  "sankati.narasimhareddy@pirnav.com",
  "pilla.durgaprasad@pirnav.com",
  "yampati.silpasri@pirnav.com",
  "arepally.srinivas@pirnav.com",
  "puli.maniteja@pirnav.com",
  "nuthangi.suresh@pirnav.com",
  "gaganeshwara.reddy@pirnav.com",
  "vasantha.gokul@pirnav.com",
  "garikapati.veerashankar@pirnav.com",
  "ambala.tharunkumar@pirnav.com",
  "boya.sivakumar@pirnav.com",
  "mutyala.karunajyothi@pirnav.com",
  "bhargava.kurapati@pirnav.com",
  "kakarla.poornasai@pirnav.com",
  "jonnala.rahul@pirnav.com"
];

function nameFromEmail(email: string) {
  const localPart = email.split("@")[0];
  return localPart
    .split(".")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function seedDefaults() {
  const admin = await User.findOne({ email: env.adminEmail });
  if (!admin) {
    await User.create({
      name: "PIRNAV Admin",
      email: env.adminEmail,
      passwordHash: await bcrypt.hash(env.adminPassword, 12),
      role: "Admin",
      department: "Administration"
    });
  }

  await User.updateOne(
    { email: "pradeep.a@pirnav.com" },
    {
      $set: {
        name: "Pradeep A",
        email: "pradeep.a@pirnav.com",
        passwordHash: await bcrypt.hash(env.adminPassword, 12),
        role: "Admin",
        department: "Administration",
        disabled: false
      }
    },
    { upsert: true }
  );

  const defaultPasswordHash = await bcrypt.hash(env.adminPassword, 12);
  for (const email of defaultUserEmails.filter((email) => ![env.adminEmail, "admin@pirnav.com"].includes(email))) {
    await User.updateOne(
      { email },
      {
        $setOnInsert: {
          name: nameFromEmail(email),
          email,
          passwordHash: defaultPasswordHash,
          role: "Developer",
          department: "Engineering",
          disabled: false
        }
      },
      { upsert: true }
    );
  }

  await User.updateMany({}, { $set: { passwordHash: defaultPasswordHash } });

  const project = await Project.findOne({ key: "PIRNAV" });
  if (!project) {
    await Project.create({ name: "PIRNAV Issue Suite", key: "PIRNAV", description: "Internal bug tracking platform", status: "Active" });
  }

  for (const name of ["LOW", "MEDIUM", "HIGH", "CRITICAL"]) await Priority.updateOne({ name }, { name }, { upsert: true });
  for (const name of ["OPEN", "BUG_BUCKET", "ASSIGNED", "IN_PROGRESS", "FIXED", "READY_FOR_TESTING", "REOPENED", "CLOSED"]) await Status.updateOne({ name }, { name }, { upsert: true });
  for (const name of ["UI Bug", "Backend Bug", "API Bug", "Database Bug", "Performance Bug", "Security Bug", "Mobile Bug", "Enhancement Request"]) await Category.updateOne({ name }, { name }, { upsert: true });
  await EmailTemplate.updateOne(
    { name: "Issue Assigned" },
    { name: "Issue Assigned", subject: "PIRNAV issue assigned", body: "An issue has been assigned to you." },
    { upsert: true }
  );
}
