import { readMarkdown } from "../../src/services/md-reader.service";

test("Read basic markdown file", () => {
  const content = readMarkdown("example.md");
  expect(content).toContain("#");
});
