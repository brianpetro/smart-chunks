const test = require('ava');
const path = require('path');
const fs = require('fs');
const { SmartMarkdown } = require('../smart-chunks');
// get test.md file
const test_md_path = path.join(__dirname, 'test.md');
const test_md = fs.readFileSync(test_md_path, 'utf8');
// test static SmartMarkdown.parse returns an Object containing blocks and log properties
test('SmartMarkdown.parse returns an Object contains blocks, file_path and log', (t) => {
  const smart_markdown = new SmartMarkdown({});
  const result = smart_markdown.parse({ content: test_md, file_path: test_md_path });
  t.is(typeof result, 'object');
  t.true(Array.isArray(result.blocks));
  t.is(typeof result.blocks[0], 'object');
  t.is(typeof result.file_path, 'string');
  t.true(Array.isArray(result.log));
});