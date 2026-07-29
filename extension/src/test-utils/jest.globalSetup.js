// Runs once before the test environments are created, which is early enough for
// the assignment to take: Node re-reads TZ per Date operation, but only until
// something in the worker has already resolved the zone. See the note in
// jest.config.js for why the suite deliberately runs at a non-UTC offset.
module.exports = () => {
  process.env.TZ = "Pacific/Auckland";
};
