const hasChanged = require("../src/hasChanged");

test("throws for invalid paths", async () => {
  const errMsg = "pathsToSearch needs to be a string";

  await expect(hasChanged({})).rejects.toThrow(errMsg);
  await expect(hasChanged({ paths: [] })).rejects.toThrow(errMsg);
  await expect(hasChanged({ paths: 12 })).rejects.toThrow(errMsg);
});

// TODO: test git diff results
