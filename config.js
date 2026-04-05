// Egg run schedule (US Eastern times)
const EGG_RUN_TIMES = [
  { hour: 14, minute: 45 }, // 2:45 PM
  { hour: 18, minute: 45 }, // 6:45 PM
  { hour: 22, minute: 45 }, // 10:45 PM
];

// Poetry Jam Schedule
// Each jam has a recurrence type to support weekly, biweekly, monthly, etc.
// Recurrence types:
//   "weekly"   - every week on the given dayOfWeek (0=Sun..6=Sat)
//   "biweekly" - every other week on the given dayOfWeek, anchored to an epochDate
//   "monthly"  - e.g. "first friday", "second thursday" via weekOfMonth + dayOfWeek
const POETRY_JAMS = [
  {
    name: "Sunday Jam",
    guild: "House of Renthian",
    location: "Serbule Inn, Casino",
    recurrence: "weekly",
    dayOfWeek: 0, // Sunday
    hour: 14,
    minute: 0,
    donations: ["Reyetta"],
  },
  {
    name: "Mid-week Jam",
    guild: "Side Quest Society",
    location: "Serbule Inn",
    recurrence: "weekly",
    dayOfWeek: 3, // Wednesday
    hour: 12,
    minute: 0,
    donations: ["MrXard"],
  },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
