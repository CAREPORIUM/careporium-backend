import Worker from '../models/workerModel.js';

// ---------------------------------------------------------------------------
// Worker profile service
// ---------------------------------------------------------------------------
// Reads and updates the signed-in worker's profile. Updates are restricted to
// an allow-list of fields so callers can't modify protected data, and the
// linked user document is populated (with sensitive fields excluded) on return.
// ---------------------------------------------------------------------------

// Fetch a worker profile by the owning user's id, including the linked user
// record but excluding sensitive fields (password, OTP).
const getWorkerProfile = async (userId) => {
    const worker = await Worker.findOne({
        user: userId
    }).populate("user",
                "-password -verificationOtp -verificationOtpExpires");

    if (!worker) {
        throw new Error("Profile not found");
    }

    return worker;
};

// Update a worker profile. Only allow-listed fields provided in the request are
// applied; schema validators still run on the update.
const updateWorkerProfile = async (userId, updateData) => {
    // only allow these worker profile fields to be updated
    const allowedFields = [
        'fullName',
        'profession',
        'specialty',
        'yearsOfExperience',
        'location',
        'proofOfLocation',
        'certifications',
        'about'
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
            user: userId
        },
        filteredData,
        {
            new: true,
            // apply Mongoose schema validation
            runValidators: true
        }
    ).populate(
        'user', '-password -verificationOtp -verificationOtpExpires'
    );

    if (!worker) {
        throw new Error('Profile not found');
    }
    return worker;
};

export { getWorkerProfile, updateWorkerProfile };