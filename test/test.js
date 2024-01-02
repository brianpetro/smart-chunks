const test = require('ava');
const path = require('path');
const fs = require('fs');
const { SmartMarkdown } = require('../smart-chunks');
// get test.md file
const test_md_path = path.join(__dirname, 'test.md');
const test_md = fs.readFileSync(test_md_path, 'utf8');
test('SmartMarkdown.parse returns an Object contains blocks, file_path and log', (t) => {
  const smart_markdown = new SmartMarkdown({min_len: 10});
  const result = smart_markdown.parse({ content: test_md, file_path: test_md_path });
  t.is(typeof result, 'object');
  t.true(Array.isArray(result.blocks));
  t.is(typeof result.blocks[0], 'object');
  t.is(typeof result.file_path, 'string');
  t.true(Array.isArray(result.log));
});
// works without file_path
test('SmartMarkdown.parse works without file_path', (t) => {
  const smart_markdown = new SmartMarkdown({min_len: 10});
  const result = smart_markdown.parse({ content: test_md });
  t.is(typeof result, 'object');
  t.true(Array.isArray(result.blocks));
  t.is(typeof result.blocks[0], 'object');
  t.is(typeof result.file_path, 'string');
  t.true(Array.isArray(result.log));
});

// retrieves block by path
test('SmartMarkdown.get_block_by_path retrieves block by path', (t) => {
  const smart_markdown = new SmartMarkdown({max_len: 20});
  const block_content = smart_markdown.get_block_from_path("file://folders/test/test.md#test 1", test_md);
  t.is(block_content, 'lorem ipsum 1');
});
test('SmartMarkdown.get_block_by_path retrieves block by path midway through markdown', (t) => {
  const smart_markdown = new SmartMarkdown({min_len: 10});
  const block_content = smart_markdown.get_block_from_path("file://folders/test/test.md#test 1a", test_md);
  t.is(block_content, 'lorem ipsum 1a');
});
// handles {n} in path
test('SmartMarkdown.get_block_by_path handles {n} in path', (t) => {
  const smart_markdown = new SmartMarkdown({});
  const block_content = smart_markdown.get_block_from_path("file://folders/test/test.md#test 1{1}", test_md);
  t.is(block_content, 'should add bracket to block path for second occurrence of heading');
});
// returns full content if lacks headings in path
test('SmartMarkdown.get_block_by_path returns full content if lacks headings in path', (t) => {
  const smart_markdown = new SmartMarkdown({});
  const block_content = smart_markdown.get_block_from_path("file://folders/test/test.md", test_md);
  t.is(block_content, test_md);
});
// block should contain sub-headings if text length is less than max_len
test('SmartMarkdown.get_block_by_path block should contain sub-headings if text length is less than max_len', (t) => {
  const smart_markdown = new SmartMarkdown({ min_len: 100 });
  const block_content = smart_markdown.get_block_from_path("file://folders/test/test.md#test 1", test_md);
  t.is(block_content, 'lorem ipsum 1\n## test 1a\nlorem ipsum 1a\n## test 1b\nlorem ipsum 1b\n### test 1b1\nlorem ipsum 1b1');
});
// if skip_blocks_with_headings_only prevents blocks with only headings from being returned
test('SmartMarkdown.parse({skip_blocks_with_headings_only})-> prevents blocks with only headings from being returned', (t) => {
  const smart_markdown = new SmartMarkdown({ skip_blocks_with_headings_only: false });
  const { blocks } = smart_markdown.parse({ content: test_md, file_path: "file://folders/test/test.md" });
  t.true(blocks.some(block => block.heading === '#heading only test'));
  const smart_markdown_2 = new SmartMarkdown({ skip_blocks_with_headings_only: true });
  const { blocks: blocks_2 } = smart_markdown_2.parse({ content: test_md, file_path: "file://folders/test/test.md" });
  t.false(blocks_2.some(block => block.heading === '#heading only test'));
});

/**
 * TODO
 */

// similarly parse should combine headings into a single block if text length is less than max_len
test('SmartMarkdown.parse should combine headings into a single block if text length is less than max_len', (t) => {
  const smart_markdown = new SmartMarkdown({ max_len: 1000, min_len: 10 });
  const { blocks } = smart_markdown.parse({ content: test_md, file_path: "file://folders/test/test.md" });
  t.is(blocks[1].text, 'file: > folders > test > test: test 1:\nlorem ipsum 1\n## test 1a\nlorem ipsum 1a\n## test 1b\nlorem ipsum 1b\n### test 1b1\nlorem ipsum 1b1');
});