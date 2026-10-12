import { DateTime } from "luxon";
import cron from "node-cron";
import Shift from "../models/shiftModel.js";
import Application from "../models/applicationModel.js";
import Worker from "../models/workerModel.js";
import Facility from "../models/facilityModel.js";
import { createNotification } from "./notificationService.js";

const REMINDER_WINDOWS = [
  { type: "24_hours", milliseconds: 24 * 60 * 60 * 1000 },
  { type: "2_hours", milliseconds: 2 * 60 * 60 * 1000 },
];

const sendShiftReminders = async ({ now = Date.now(), shiftId } = {}) => {
  const shiftQuery = { status: { $in: ["open", "filled"] } };

  if (shiftId) {
    shiftQuery._id = shiftId;
  }

  const shifts = await Shift.find(shiftQuery);

  for (const shift of shifts) {
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

    const shiftDate = DateTime.fromISO(shift.shiftDate, {
      zone: "utc",
    }).toISODate();

    const shiftStartsAt = DateTime.fromISO(
      `${shiftDate}T${shift.startTime}`,
      { zone: "Africa/Lagos" }
    );

    if (!shiftStartsAt.isValid) {
      console.error(`Invalid date or start time for shift ${shift._id}`);
      continue;
    }

    const timeUntilShift = shiftStartsAt.toMillis() - now;

    // Notify the facility when an urgent shift is still unfilled within two hours.
    if (
      shift.isUrgent &&
      shift.status === "open" &&
      timeUntilShift > 0 &&
      timeUntilShift <= 2 * 60 * 60 * 1000
    ) {
      const assignedCount = (shift.assignedWorkers ?? []).length;

      const professionalsStillNeeded =
        shift.professionalsNeeded - assignedCount;

      console.log("[URGENT REMINDER] Conditions checked:", {
        shiftId: shift._id.toString(),
        status: shift.status,
        isUrgent: shift.isUrgent,
        timeUntilShiftMinutes: Math.round(timeUntilShift / 60000),
        professionalsNeeded: shift.professionalsNeeded,
        assignedCount,
        professionalsStillNeeded,
      });

      if (professionalsStillNeeded > 0) {
        const facility = await Facility.findById(shift.facility);

        console.log("[URGENT REMINDER] Facility lookup:", {
          facilityFound: Boolean(facility),
          facilityUser: facility?.user?.toString(),
        });

        if (!facility?.user) {
          console.error(
            `[URGENT REMINDER] Facility or user missing for shift ${shift._id}`
          );
        } else {
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
                  sentAt: new Date(),
                },
              },
            },
            { new: true }
          );

          if (!claimedShift) {
            console.log(
              `[URGENT REMINDER] Already claimed or shift changed: ${shift._id}`
            );
          } else {
            try {
              console.log("[URGENT REMINDER] Creating notification:", {
                shiftId: shift._id.toString(),
                recipient: facility.user.toString(),
              });

              const notification = await createNotification({
                recipient: facility.user,
                type: "URGENT_SHIFT_UNFILLED",
                title: "Urgent shift still needs cover",
                message:
                  `Your urgent ${shift.profession} shift starts in less than 2 hours ` +
                  `and still needs ${professionalsStillNeeded} more professional(s). ` +
                  "Please review the shift and arrange cover.",
                resourceType: "Shift",
                resourceId: shift._id,
              });

              console.log("[URGENT REMINDER] Notification saved:", {
                notificationId: notification._id.toString(),
                recipient: notification.recipient.toString(),
              });
            } catch (error) {
              console.error(
                `[URGENT REMINDER] Failed for shift ${shift._id}:`,
                error
              );

              try {
                await Shift.updateOne(
                  { _id: shift._id },
                  {
                    $pull: {
                      urgentRemindersSent: {
                        reminderType: "urgent_unfilled",
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

    // Send scheduled reminders to accepted workers and the facility.
    const facilityDetails = await Facility.findById(shift.facility);
    const facilityName = facilityDetails?.facilityName || "the facility";
    const startTime = shiftStartsAt.toFormat("h:mm a");
    const arrivalGuidance = shift.arrivalInstructions || "Follow the facility's arrival instructions";

    for (const reminder of REMINDER_WINDOWS) {
      if (
        timeUntilShift > reminder.milliseconds ||
        timeUntilShift <= 0
      ) {
        continue;
      }

      const applications = await Application.find({
        shift: shift._id,
        status: "accepted",
      });

      // Notify each accepted worker.
      for (const application of applications) {
        const worker = await Worker.findById(application.worker);
        if (!worker?.user) continue;

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
                sentAt: new Date(),
              },
            },
          },
          { new: true }
        );

        if (!claimedWorkerShift) continue;

        try {
          await createNotification({
            recipient: worker.user,
            type: "SHIFT_STARTING_SOON",
            title:
              reminder.type === "24_hours"
                ? "Your shift is tomorrow"
                : "Your shift starts in 2 hours",
            message:
              `Your ${shift.profession} shift at ${facilityName} starts ${
                reminder.type === "24_hours" ? "in 24 hours" : "in 2 hours"
              }, at ${startTime} WAT. ` +
              `Location: ${shift.location || "See shift details"}. ` +
              `Arrival guidance: ${arrivalGuidance}. Check Shift Details.`,
            resourceType: "Shift",
            resourceId: shift._id,
          });
        } catch (error) {
          try {
            await Shift.updateOne(
              { _id: shift._id },
              {
                $pull: {
                  remindersSent: {
                    worker: worker._id,
                    reminderType: reminder.type,
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

      // Notify the facility once per shift and reminder window.
      if (applications.length === 0) continue;

      const facility = await Facility.findById(shift.facility);

      if (!facility?.user) {
        console.error(
          `[REMINDER] Facility or user not found for shift ${shift._id}`
        );
        continue;
      }

      const claimedFacilityShift = await Shift.findOneAndUpdate(
        {
          _id: shift._id,
          status: { $in: ["open", "filled"] },
          facilityRemindersSent: {
            $not: {
              $elemMatch: { reminderType: reminder.type },
            },
          },
        },
        {
          $push: {
            facilityRemindersSent: {
              reminderType: reminder.type,
              sentAt: new Date(),
            },
          },
        },
        { new: true }
      );

      if (!claimedFacilityShift) continue;

      const workerCount = applications.length;
      const workerLabel = workerCount === 1 ? "worker" : "workers";
      const startTime = shiftStartsAt.toFormat("h:mm a");

      try {
        await createNotification({
          recipient: facility.user,
          type: "SHIFT_STARTING_SOON",
          title:
            reminder.type === "24_hours"
              ? "Your shift is tomorrow"
              : "Your shift starts in 2 hours",
          message:
            `Your ${shift.profession} shift at ${facilityName} starts ${
              reminder.type === "24_hours" ? "in 24 hours" : "in 2 hours"
            }, at ${startTime} WAT. ` +
            `Location: ${shift.location || "See shift details"}. ` +
            `Arrival guidance: ${arrivalGuidance}. ` +
            `${workerCount} ${workerLabel} ${
              workerCount === 1 ? "is" : "are"
            } booked. Check Shift Details.`,
          resourceType: "Shift",
          resourceId: shift._id,
        });
      } catch (error) {
        try {
          await Shift.updateOne(
            { _id: shift._id },
            {
              $pull: {
                facilityRemindersSent: {
                  reminderType: reminder.type,
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

const startShiftReminderScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      await sendShiftReminders();
    } catch (error) {
      console.error("[REMINDER] Scheduled job failed:", error);
    }
  });

  console.log("Shift reminder scheduler started.");
};

export { startShiftReminderScheduler, sendShiftReminders };
