import mongoose, { Schema, type InferSchemaType } from "mongoose";

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: ["Planning", "Active", "On Hold", "Completed"], default: "Active" },
    teams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    members: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export type ProjectDocument = InferSchemaType<typeof projectSchema> & { _id: mongoose.Types.ObjectId };
export const Project = mongoose.model("Project", projectSchema);
