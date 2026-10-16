import { DateTime } from "luxon";
import cron from "node-cron";
import Shift from "../models/shiftModel.js";
import Application from "../models/applicationModel.js";
import Worker from "../models/workerModel.js";
import Facility from "../models/facilityModel.js";
import { createNotification } from "./notificationService.js";
import Attendance from "../models/attendanceModel.js";

const REMINDER_WINDOWS = [
  { type: "24_hours", milliseconds: 24 * 60 * 60 * 1000 },
  { type: "2_hours", milliseconds: 2 * 60 * 60 * 1000 },
];

const sendShiftReminders = async ({ now = Date.now(), shiftId } = {}) => {
  // find shifts that are open or filled
  const shiftQuery = { status: { $in: ["open", "filled"] } };

  if (shiftId) {
    shiftQuery._id = shiftId;
  }

  const shifts = await Shift.find(shiftQuery);

  for (const shift of shifts) {
    // ensure the shift has a date and start time
    if (!shift.shiftDate || !shift.startTime) {
      console.error(
        `Missing shift date or start time for shift ${shift._id}`
      );
      continue;
    }

    // validate the shift date
    const parsedDate = DateTime.fromISO(shift.shiftDate, {
      zone: "utc",
    });

    if (
      !parsedDate.isValid ||
      parsedDate.toISODate() !== shift.shiftDate
    ) {
      console.error(`Invalid shiftDate for shift ${shift._id}`);
      continue;
    }

    // validate the shift start time
    const [hours, minutes] = shift.startTime.split(":").map(Number);

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      console.error(`Invalid startTime for shift ${shift._id}`);
      continue;
    }

    // calculate the shift start time in Nigeria
    const shiftStartsAt = DateTime.fromISO(
      `${parsedDate.toISODate()}T${shift.startTime}`,
      { zone: "Africa/Lagos" }
    );

    if (!shiftStartsAt.isValid) {
      console.error(
        `Invalid shift date or start time for shift ${shift._id}`
      );
      continue;
    }

    const timeUntilShift = shiftStartsAt.toMillis() - now;

    // retrieve the facility details for notifications
    const facility = await Facility.findById(shift.facility);
    const facilityName = facility?.facilityName || "the facility";

    // Notify the facility when an urgent shift remains unfilled within two hours.
    if (
      shift.isUrgent &&
      shift.status === "open" &&
      timeUntilShift > 0 &&
      timeUntilShift <= 2 * 60 * 60 * 1000
    ) {
      const assignedCount = (shift.assignedWorkers ?? []).length;

      const professionalsStillNeeded =
        shift.professionalsNeeded - assignedCount;

      if (professionalsStillNeeded > 0) {
        if (!facility?.user) {
          console.error(
            `[URGENT REMINDER] Facility or user missing for shift ${shift._id}`
          );
        } else {
          // claim the urgent reminder to prevent duplicates
          const claimedShift = await Shift.findOneAndUpdate(
            {
              _id: shift._id,
              isUrgent: true,
              status: "open",
              urgentRemindersSent: {
                $not: {
                  $elemMatch: {
                    reminderType: "urgent_unfilled",
                  },
                },
              },
            },
            {
              $push: {
                urgentRemindersSent: {
                  reminderType: "urgent_unfilled",
                  sentAt: new Date(now),
                },
              },
            },
            { returnDocument: 'after' }
          );

          if (claimedShift) {
            try {
              await createNotification({
                recipient: facility.user,
                type: "URGENT_SHIFT_UNFILLED",
                title: "Urgent shift still needs cover",
                message:
                  `Your urgent ${shift.profession} shift starts in less than 2 hours ` +
                  `and still needs ${professionalsStillNeeded} more professional(s). ` +
                  "Please review the shift and arrange cover.",
                resourceType: "Shift",
                resourceId: shift._id,
                actionText: "Review shift",
                actionLink:
                  `/FacilityHiringSection/ShiftDetails.html?shift=${shift._id}`,
              });
            } catch (error) {
              console.error(
                `[URGENT REMINDER] Failed for shift ${shift._id}:`,
                error
              );

              // remove the marker if notification creation fails
              try {
                await Shift.updateOne(
                  {
                    _id: shift._id,
                    urgentRemindersSent: {
                      $elemMatch: {
                        reminderType: "urgent_unfilled",
                        sentAt: new Date(now),
                      },
                    },
                  },
                  {
                    $pull: {
                      urgentRemindersSent: {
                        reminderType: "urgent_unfilled",
                        sentAt: new Date(now),
                      },
                    },
                  }
                );
              } catch (cleanupError) {
                console.error(
                  `[URGENT REMINDER] Failed to reset marker for shift ${shift._id}:`,
                  cleanupError
                );
              }
            }
          }
        }
      }
    }

    // format shift details for reminder messages
    const startTime = shiftStartsAt.toFormat("h:mm a");
    const arrivalGuidance =
      shift.arrivalInstructions ||
      "Follow the facility's arrival instructions";

    // send scheduled reminders to accepted workers and the facility
    for (const reminder of REMINDER_WINDOWS) {
      // send the 24-hour reminder only before the 2-hour window
      if (reminder.type === "24_hours") {
        if (
          timeUntilShift > 24 * 60 * 60 * 1000 ||
          timeUntilShift <= 2 * 60 * 60 * 1000
        ) {
          continue;
        }
      }

      // send the 2-hour reminder only within two hours of shift start
      if (reminder.type === "2_hours") {
        if (
          timeUntilShift > 2 * 60 * 60 * 1000 ||
          timeUntilShift <= 0
        ) {
          continue;
        }
      }

      // retrieve accepted applications for this shift
      const applications = await Application.find({
        shift: shift._id,
        status: "accepted",
      });

      // notify each accepted worker
      for (const application of applications) {
        const worker = await Worker.findById(application.worker);

        if (!worker?.user) {
          continue;
        }

        // atomically claim the worker reminder to prevent duplicates
        const claimedWorkerShift = await Shift.findOneAndUpdate(
          {
            _id: shift._id,
            status: { $in: ["open", "filled"] },
            remindersSent: {
              $not: {
                $elemMatch: {
                  worker: worker._id,
                  reminderType: reminder.type,
                },
              },
            },
          },
          {
            $push: {
              remindersSent: {
                worker: worker._id,
                reminderType: reminder.type,
                sentAt: new Date(now),
              },
            },
          },
          { returnDocument: 'after' }
        );

        if (!claimedWorkerShift) {
          continue;
        }

        try {
          await createNotification({
            recipient: worker.user,
            type: "SHIFT_STARTING_SOON",
            title:
              reminder.type === "24_hours"
                ? "Your shift is tomorrow"
                : "Your shift starts in 2 hours",
            message:
              `Your ${shift.profession} shift at ${facilityName} starts ` +
              `${
                reminder.type === "24_hours"
                  ? "in 24 hours"
                  : "in 2 hours"
              }, at ${startTime} WAT. ` +
              `Location: ${shift.location || "See shift details"}. ` +
              `Arrival guidance: ${arrivalGuidance}. Check Shift Details.`,
            resourceType: "Shift",
            resourceId: shift._id,
            actionText: "View shift",
            actionLink:
              `/WorkerShiftMarket/UpcomingShifts.html?shift=${shift._id}`,
          });
        } catch (error) {
          // remove the marker if notification creation fails
          try {
            await Shift.updateOne(
              { _id: shift._id },
              {
                $pull: {
                  remindersSent: {
                    worker: worker._id,
                    reminderType: reminder.type,
                    sentAt: new Date(now),
                  },
                },
              }
            );
          } catch (cleanupError) {
            console.error(
              `[REMINDER] Failed to reset worker marker for shift ${shift._id}:`,
              cleanupError
            );
          }

          console.error(
            `[REMINDER] Failed to create worker reminder for shift ${shift._id}:`,
            error
          );
        }
      }

      // notify the facility once per shift and reminder window
      if (applications.length === 0) {
        continue;
      }

      if (!facility?.user) {
        console.error(
          `[REMINDER] Facility or user not found for shift ${shift._id}`
        );
        continue;
      }

      // atomically claim the facility reminder to prevent duplicates
      const claimedFacilityShift = await Shift.findOneAndUpdate(
        {
          _id: shift._id,
          status: { $in: ["open", "filled"] },
          facilityRemindersSent: {
            $not: {
              $elemMatch: {
                reminderType: reminder.type,
              },
            },
          },
        },
        {
          $push: {
            facilityRemindersSent: {
              reminderType: reminder.type,
              sentAt: new Date(now),
            },
          },
        },
        { returnDocument: 'after' }
      );

      if (!claimedFacilityShift) {
        continue;
      }

      const workerCount = applications.length;
      const workerLabel = workerCount === 1 ? "worker" : "workers";

      try {
        await createNotification({
          recipient: facility.user,
          type: "SHIFT_STARTING_SOON",
          title:
            reminder.type === "24_hours"
              ? "Your shift is tomorrow"
              : "Your shift starts in 2 hours",
          message:
            `Your ${shift.profession} shift at ${facilityName} starts ` +
            `${
              reminder.type === "24_hours"
                ? "in 24 hours"
                : "in 2 hours"
            }, at ${startTime} WAT. ` +
            `Location: ${shift.location || "See shift details"}. ` +
            `Arrival guidance: ${arrivalGuidance}. ` +
            `${workerCount} ${workerLabel} ${
              workerCount === 1 ? "is" : "are"
            } booked. Check Shift Details.`,
          resourceType: "Shift",
          resourceId: shift._id,
          actionText: "View shift",
          actionLink:
            `/FacilityHiringSection/ShiftDetails.html?shift=${shift._id}`,
        });
      } catch (error) {
        // remove the marker if notification creation fails
        try {
          await Shift.updateOne(
            { _id: shift._id },
            {
              $pull: {
                facilityRemindersSent: {
                  reminderType: reminder.type,
                  sentAt: new Date(now),
                },
              },
            }
          );
        } catch (cleanupError) {
          console.error(
            `[REMINDER] Failed to reset facility marker for shift ${shift._id}:`,
            cleanupError
          );
        }

        console.error(
          `[REMINDER] Failed to create facility reminder for shift ${shift._id}:`,
          error
        );
      }
    }
  }
};

const sendClockOutReminders = async ({ now = Date.now(), shiftId } = {}) => {

    // find filled shifts that may need clock-out reminders
    const shiftQuery = { status: "filled" };

    if (shiftId) {
        shiftQuery._id = shiftId;
    }

    const shifts = await Shift.find(shiftQuery);

    for (const shift of shifts) {

        // ensure the shift has a date and both times
        if (!shift.shiftDate || !shift.startTime || !shift.endTime) {
            continue;
        }

        // validate the shift date
        const parsedDate = DateTime.fromISO(shift.shiftDate, {
            zone: "utc"
        });

        if (!parsedDate.isValid || parsedDate.toISODate() !== shift.shiftDate) {
            console.error(`Invalid shiftDate for shift ${shift._id}`);
            continue;
        }

        // validate the start time
        const [startHours, startMinutes] = shift.startTime
            .split(":")
            .map(Number);

        // validate the end time
        const [endHours, endMinutes] = shift.endTime
            .split(":")
            .map(Number);

        const validTime = (hours, minutes) =>
            Number.isInteger(hours) &&
            Number.isInteger(minutes) &&
            hours >= 0 &&
            hours <= 23 &&
            minutes >= 0 &&
            minutes <= 59;

        if (
            !validTime(startHours, startMinutes) ||
            !validTime(endHours, endMinutes)
        ) {
            console.error(`Invalid shift time for shift ${shift._id}`);
            continue;
        }

        // determine whether the shift ends on the following day
        const endsNextDay =
            endHours * 60 + endMinutes <=
            startHours * 60 + startMinutes;

        // calculate the scheduled shift end time in Nigeria
        let shiftEndsAt = DateTime.fromISO(
            `${shift.shiftDate}T${shift.endTime}`,
            { zone: "Africa/Lagos" }
        );

        if (endsNextDay) {
            shiftEndsAt = shiftEndsAt.plus({ days: 1 });
        }

        if (!shiftEndsAt.isValid) {
            console.error(`Invalid shift end date for shift ${shift._id}`);
            continue;
        }

        // wait until the scheduled shift end time has passed
        if (shiftEndsAt.toMillis() > now) {
            continue;
        }

        // get the facility name for the notification
        const facility = await Facility.findById(shift.facility);
        const facilityName = facility?.facilityName || "the facility";

        // check each assigned worker
        for (const workerId of shift.assignedWorkers ?? []) {

            // find workers who clocked in but have not clocked out
            const attendance = await Attendance.findOne({
                worker: workerId,
                shift: shift._id,
                clockInTime: { $exists: true, $ne: null },
                $or: [
                    { clockOutTime: { $exists: false } },
                    { clockOutTime: null }
                ]
            });

            if (!attendance) {
                continue;
            }

            // find the worker's account
            const worker = await Worker.findById(workerId);

            if (!worker?.user) {
                continue;
            }

            // atomically claim the reminder to prevent duplicates
            const claimedShift = await Shift.findOneAndUpdate(
                {
                    _id: shift._id,
                    status: "filled",
                    assignedWorkers: workerId,
                    remindersSent: {
                        $not: {
                            $elemMatch: {
                                worker: workerId,
                                reminderType: "clock_out"
                            }
                        }
                    }
                },
                {
                    $push: {
                        remindersSent: {
                            worker: workerId,
                            reminderType: "clock_out",
                            sentAt: new Date(now)
                        }
                    }
                },
                { returnDocument: 'after' }
            );

            if (!claimedShift) {
                continue;
            }

            try {

                // create the clock-out notification
                await createNotification({
                    recipient: worker.user,
                    type: "SHIFT_CLOCK_OUT_REMINDER",
                    title: "Time to clock out",
                    message:
                        `Your ${shift.profession} shift at ${facilityName} ` +
                        "has reached its scheduled end time. " +
                        "Please clock out to record your completed hours.",
                    resourceType: "Shift",
                    resourceId: shift._id,
                    actionText: "View shift",
                    actionLink:
                        `/WorkerShiftMarket/UpcomingShifts.html?shift=${shift._id}`
                });

            } catch (error) {

                // remove the marker if notification creation fails
                try {
                    await Shift.updateOne(
                        { _id: shift._id },
                        {
                            $pull: {
                                remindersSent: {
                                    worker: workerId,
                                    reminderType: "clock_out"
                                }
                            }
                        }
                    );
                } catch (cleanupError) {
                    console.error(
                        `[CLOCK-OUT REMINDER] Failed to reset marker for shift ${shift._id}:`,
                        cleanupError
                    );
                }

                console.error(
                    `[CLOCK-OUT REMINDER] Failed for shift ${shift._id}, worker ${workerId}:`,
                    error
                );
            }
        }
    }
};

const startShiftReminderScheduler = () => {
cron.schedule("* * * * *", async () => {
  try {
    await sendShiftReminders();
  } catch (error) {
    console.error("[REMINDER] Scheduled shift reminders failed:", error);
  }

  try {
    await sendClockOutReminders();
  } catch (error) {
    console.error("[CLOCK-OUT REMINDER] Scheduled job failed:", error);
  }
});

  console.log("Shift reminder scheduler started.");
};

export {
  startShiftReminderScheduler,
  sendShiftReminders,
  sendClockOutReminders,
};