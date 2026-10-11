import Application from "../models/applicationModel.js";
import Worker from "../models/workerModel.js";
import Shift from "../models/shiftModel.js";
import Facility from "../models/facilityModel.js";
import crypto from 'crypto'

// workers apply for shifts, this service handles the application logic

const applyForShift = async (userId, shiftId) => {
  // check for  worker id and shift id
  const worker = await Worker.findOne({ user: userId })

  if (!worker) {
    throw new Error("Worker not found")
  }

  const shift = await Shift.findById(shiftId)

  if (!shift) {
    throw new Error("Shift not found");
  }

  // check if the shift application is still open
  if (shift.status !== "open") {
    throw new Error("This shift is no longer accepting applications.");
  }

  //check if the shift still needs professionals
  if (
    shift.assignedWorkers.length >=
    shift.professionalsNeeded
  ) {
    throw new Error(
      "This shift already has all the professionals it needs."
    );
  }

  // check if the worker has already applied for the shift
  const existingApplication = await Application.findOne({
    worker: worker._id,
    shift: shiftId,
  });

  if (existingApplication) {
    throw new Error("You have already applied for this shift.");
  }

  // all this being checked, open the application as required by the worker
  const application = await Application.create({
    worker: worker._id,
    shift: shiftId,
  });

  return application;
};

//get all my applications as a worker
const getApplicationsForWorker = async (userId) => {
  const worker = await Worker.findOne({ user: userId });

  if (!worker) {
    throw new Error("Worker not found.");
  }

  const applications = await Application.find({ worker: worker._id })
  .populate({
    path: "shift",
    populate: {
      path: "facility",
      select: "facilityName facilityType location",
    },
  });
  //if there are no applications for the worker, throw an error
  if (!applications) {
    throw new Error("No applications found for this worker.");
  }

  return applications
}

//get all applicants and applications for a facility
const getApplicationsForFacility = async (userId) => {
  const facility = await Facility.findOne({
    user: userId,
  });

  if (!facility) {
    throw new Error("Facility not found for this user.");
  }

  //get all shiftss belonging to this facility
  const shifts = await Shift.find({
    facility: facility._id
  }).select('_id');

  const shiftIds = shifts.map((shift) => shift._id);

  //get all applications for the shifts belonging to this facility
  const applications = await Application.find({
    shift: { $in: shiftIds },
  })  
    .populate({
      path: "shift",
      populate: {
      path: "facility",
      select: "facilityName facilityType location"
     },
    })

    .populate({
      path: "worker",
      select: "fullName profession specialty yearsOfExperience",
    })

    return applications;
}

 /** // Remove applications whose shift doesn't belong to this facility
  const facilityApplications = applications.filter(
    (application) => application.shift !== null,
  );

  if (facilityApplications.length === 0) {
    throw new Error("No applications found for this facility.");
  }

  return facilityApplications;
}; */

//facility can accept or reject an application for their shift ( hence the application status)
const updateApplicationStatus = async (userId, applicationId, status) => {
  //find the facility for the user from the user id in the database, if no facility is found, throw an error
  const facility = await Facility.findOne({ user: userId });
  if (!facility) {
    throw new Error("Facility not found for this user");
  }
  // check if uodated status is a valid one
  if (!["accepted", "rejected"].includes(status)) {
    throw new Error(
      "Invalid status. Only 'accepted' or 'rejected' are allowed",
    );
  }
  //check if the application exists
  const application = await Application.findById(applicationId)
  .populate({
    path: "worker",
    select: "fullName profession specialty yearsOfExperience location",
  }).populate({
      path: "shift"
    })

  if (!application) {
    throw new Error("Application not found.");
  }

  if (!application.shift) {
    throw new Error("The shift associated with this application was not found");
  }
  //check if this application belongs to the facility, if not throw an error
  if (application.shift.facility.toString() !== facility._id.toString()) {
    throw new Error("You are not authorized to update this application.");
  }

  // only pending applications can be accepted or rejected
  if(application.status !== "pending") {
    throw new Error(`This application has already been ${application.status}`);
  }

  if (status === "rejected") {
    application.status = 'rejected'
    await application.save()
    return application
  }
  // check if the shift still has space for another professional
  if (application.shift.assignedWorkers.length >= application.shift.professionalsNeeded) {
    throw new Error("This shift already has all the professionals it needs.")
  }

  // check if this worker has already been assigned to the shift

  const workerAlreadyAssigned = application.shift.assignedWorkers.some(
    (workerId) => workerId.toString() === application.worker._id.toString()
  )

  if (workerAlreadyAssigned) {
    throw new Error("This worker has already been assigned to this shift.");
  }

  // add the worker to the shift's assignedWorkers array
  application.shift.assignedWorkers.push(application.worker._id)
  
  //update the application status
  application.status = "accepted"

  // check if all the required professionals have been assigned
  if(
    application.shift.assignedWorkers.length >=
    application.shift.professionalsNeeded){
      application.shift.status = "filled"

      if(!application.shift.attendanceQrToken){
        application.shift.attendanceQrToken = crypto.randomBytes(32).toString("hex")
      }
    }

  await application.shift.save() 
  await application.save();
  return application;
};

export default { applyForShift, getApplicationsForWorker, getApplicationsForFacility, updateApplicationStatus };