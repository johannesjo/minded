// Runs once before the test environments are created, which is early enough for
// the assignment to take: Node re-reads TZ per Date operation, but only until
// something in the worker has already resolved the zone. See the note in
// jest.config.js for why the suite deliberately runs at a non-UTC offset.
//
// Pacific/Honolulu specifically, and the choice is load-bearing rather than
// arbitrary. Two classes of local-vs-UTC bug live in this codebase, and each is
// only observable from one side of UTC:
//
//   - a date *string* ("2024-01-08") parses as UTC midnight, which is the
//     previous day locally only at NEGATIVE offsets (this is what made
//     isWorkDay's tests call Monday a Sunday for anyone west of UTC);
//   - a day index taken from an absolute timestamp only disagrees with the
//     local calendar day where the offset is large enough for waking hours to
//     straddle UTC midnight.
//
// Honolulu (UTC-10) is far enough out to expose the second and on the right side
// of UTC to expose the first. An earlier UTC+12 pin here caught only the second
// - it was blind to the very bug that prompted pinning. Honolulu also observes
// no DST, so no test can land in a skipped or repeated local hour.
module.exports = () => {
  process.env.TZ = "Pacific/Honolulu";
};
