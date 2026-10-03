import Worker from "../models/workerModel.js";

// handles retrieval of worker's profile
const getWorkerProfile = async (userId) => {
  const worker = await Worker.findOne({
    user: userId,
  }).populate("user", "-password -verificationOtp -verificationOtpExpires");

  if (!worker) {
    throw new Error("Profile not found");
  }

  return worker;
};

// handles updating of worker's profile
const updateWorkerProfile = async (userId, updateData) => {
  // only allow these worker profile fields to be updated
  const allowedFields = [
    "fullName",
    "profession",
    "specialty",
    "yearsOfExperience",
    "location",
    "proofOfLocation",
    "certifications",
    "about",
  ];

  // create an empty object to store the fields...
  // ...that the user is allowed to update
  const filteredData = {};

  // go through each allowed field
  for (const field of allowedFields) {
    // check if the user actually provided this field
    if (updateData[field] !== undefined) {
      // add the field and its value to filteredData
      filteredData[field] = updateData[field];
    }
  }

  const worker = await Worker.findOneAndUpdate(
    {
      user: userId,
    },
    filteredData,
    {
      new: true,
      // apply Mongoose schema validation
      runValidators: true,
    },
  ).populate("user", "-password -verificationOtp -verificationOtpExpires");

  if (!worker) {
    throw new Error("Profile not found");
  }

  return worker;
};

export { getWorkerProfile, updateWorkerProfile };
