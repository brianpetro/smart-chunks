class SmartMarkdown {
  constructor(config) {
    this.config = config;
    this.excluded_headings = (this.config.excluded_headings?.length) ? this.config.excluded_headings.split(",").map((header) => header.trim()) : null;
    this.max_len = this.config.max_len || 1000;
    this.min_len = this.config.min_len || 5;
  }
  parse({ content, file_path }) {
    const file_breadcrumbs = this.file_path_to_breadcrumbs(file_path) + ": "; // add ":" to indicate beginning of heading breadcrumbs
    const output = content.split('\n') // split the markdown into lines
      .filter(this.is_content_line) // filter out empty lines and bullets
      .reduce((acc, line, i, arr) => {
        // if line is a heading or last line
        if(this.is_heading(line)) {
          this.output_block(acc);
          const level = line.split('#').length - 1; // get the heading 'level'
          acc.current_headers = acc.current_headers.filter(header => header.level < level); // remove any headers from the current headers array that are higher than the current header level
          acc.current_headers.push({ header: line.replace(/#/g, '').trim(), level: level }); // add header and level to current headers array, trim the header to remove "#" and any trailing spaces
          acc.curr = file_breadcrumbs; // initialize the block breadcrumbs with file.path the current headers
          acc.curr += acc.current_headers.map(header => header.header).join(' > ');
          acc.block_headings = "#" + acc.current_headers.map(header => header.header).join('#');
          this.handle_duplicate_headings(acc);
          acc.block_headings_list.push(acc.block_headings);
          acc.block_path = file_path + acc.block_headings;
          return acc;
        }
        // if line is not a heading, add line to current block
        if(acc.curr.indexOf("\n") === -1) acc.curr += ":"; // add ":" to indicate end of heading breadcrumbs
        acc.curr += "\n" + line;
        if (i === arr.length - 1) this.output_block(acc); // if last line, output the block
        return acc;
      }, { block_headings: '', block_headings_list: [], block_path: file_path, curr: file_breadcrumbs, current_headers: [], blocks: [], log: [] })
    ;
    return {
      ...output,
      file_path,
      // remove properties that are exclusive to the reduce function
      block_headings: undefined,
      block_headings_list: undefined,
      block_path: undefined,
      curr: undefined,
      current_headers: undefined,
    };
  }
  // validate heading against excluded headings
  validate_heading(headings) { return !!!this.excluded_headings?.some(exclusion => headings.indexOf(exclusion) > -1); }
  // if block_headings is already in block_headings_list then add a number to the end
  handle_duplicate_headings(acc) {
    if (!acc.block_headings_list.includes(acc.block_headings)) return; // if block_headings is not in block_headings_list then return
    let count = 1;
    const uniqueHeadings = new Set(acc.block_headings_list);
    while (uniqueHeadings.has(`${acc.block_headings}{${count}}`)) { count++; }
    acc.block_headings = `${acc.block_headings}{${count}}`;
  }
  // remove .md file extension and convert file_path to breadcrumb formatting
  file_path_to_breadcrumbs(file_path) { return file_path.replace('.md', '').split('/').map(crumb => crumb.trim()).filter(crumb => crumb !== '').join(' > '); }
  // push the current block to the blocks array
  output_block(acc) {
    if(acc.curr.indexOf("\n") === -1) return acc.log.push(`Skipping empty block: ${acc.curr}`); // indicated by no newlines in block
    if(!this.validate_heading(acc.block_headings)) return acc.log.push(`Skipping excluded heading: ${acc.block_headings}`);
    // breadcrumbs length (first line of block)
    const breadcrumbs_length = acc.curr.indexOf("\n") + 1;
    const block_length = acc.curr.length - breadcrumbs_length;
    if (acc.curr.length > this.max_len) acc.curr = acc.curr.substring(0, max_len); // trim block to max length
    acc.blocks.push({ text: acc.curr.trim(), path: acc.block_path, length: block_length });
  }
  is_content_line(line) {
    if (line === '') return false; // skip if line is empty
    if (['- ', '- [ ] '].indexOf(line) > -1) return false; // skip if line is empty bullet or checkbox
    return true;
  }
  // check if line is a heading (starts with # and second character is space or # indicating not a tag)
  is_heading(line) { return line.startsWith('#') && (['#', ' '].indexOf(line[1]) > -1); }
}
exports.SmartMarkdown = SmartMarkdown;