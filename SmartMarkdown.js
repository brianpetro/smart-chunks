class SmartMarkdown {
  constructor(config) {
    this.config = config;
    this.excluded_headings = (this.config.excluded_headings?.length) ? this.config.excluded_headings.split(",").map((header) => header.trim()) : null;
    this.max_len = this.config.max_len || 1000;
    this.min_len = this.config.min_len || 5;
  }
  parse({ content, file_path='' }) {
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
    if (acc.curr.length > this.max_len) acc.curr = acc.curr.substring(0, this.max_len); // trim block to max length
    acc.blocks.push({ text: acc.curr.trim(), path: acc.block_path, length: block_length, heading: acc.block_headings }); // add block to blocks array
  }
  is_content_line(line) {
    if (line === '') return false; // skip if line is empty
    if (['- ', '- [ ] '].indexOf(line) > -1) return false; // skip if line is empty bullet or checkbox
    return true;
  }
  // check if line is a heading (starts with # and second character is space or # indicating not a tag)
  is_heading(line) { return line.startsWith('#') && (['#', ' '].indexOf(line[1]) > -1); }
  // get block from path
  get_block_from_path(block_path, markdown, opts={}){
    if(!this.validate_block_path(block_path)) return markdown;
    const {
      chars_per_line = null,
      max_chars = null,
    } = opts;
    const block = [];
    const block_headings = block_path.split("#").slice(1);
    let currentHeaders = [];
    let begin_line = 0;
    let is_code = false;
    let char_count = 0;
    let heading_occurrence = 0;
    let occurrence_count = 0;
    if(block_headings[block_headings.length-1].indexOf('{') > -1) {
      heading_occurrence = parseInt(block_headings[block_headings.length-1].split('{')[1].replace('}', '')); // get the occurrence number
      block_headings[block_headings.length-1] = block_headings[block_headings.length-1].split('{')[0]; // remove the occurrence from the last heading
    }
    const lines = markdown.split('\n');
    // let i = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if(line.indexOf('```') === 0) is_code = !is_code; // if line begins with three backticks then toggle is_code
      if(is_code) continue; // if is_code is true then add line with preceding tab and continue
      if(['- ', '- [ ] '].indexOf(line) > -1) continue; // skip if line is empty bullet or checkbox
      if (!line.startsWith('#') || (['#',' '].indexOf(line[1]) < 0)) continue; // if line does not start with # or if line starts with # and second character is a word or number indicating a "tag" then continue to next line
      const heading_text = line.replace(/#/g, '').trim(); // get the heading text
      const heading_index = block_headings.indexOf(heading_text);
      if (heading_index < 0) continue; // continue if heading text is not in block_headings
      if (currentHeaders.length !== heading_index) continue; // if currentHeaders.length !== heading_index then we have a mismatch
      currentHeaders.push(heading_text); // push the heading text to the currentHeaders array
      if (currentHeaders.length === block_headings.length) { // if currentHeaders.length === block_headings.length then we have a match
        if(heading_occurrence === 0){
          begin_line = i + 1;
          break; // break out of loop
        }
        if(occurrence_count === heading_occurrence){
          begin_line = i + 1;
          break; // break out of loop
        }
        occurrence_count++; // increment occurrence_count
        currentHeaders.pop(); // reset currentHeaders
        continue;
      }
    }
    if (begin_line === 0) return false; // if no begin_line then return false
    is_code = false; // iterate through lines starting at begin_line
    for (let i = begin_line; i < lines.length; i++) {
      if((typeof max_chars === "number") && (block.length > max_chars)){
        block.push("...");
        break; // ends when line_limit is reached
      }
      let line = lines[i];
      if ((line.indexOf('#') === 0) && (['#',' '].indexOf(line[1]) !== -1)) break; // ends when encountering next header
      if (max_chars && char_count > max_chars) { // if char_count is greater than limit.max_chars, skip (DEPRECATED: should be handled by new_line+char_count check (happens in previous iteration))
        block.push("...");
        break;
      }
      if (max_chars && ((line.length + char_count) > max_chars)) { // if new_line + char_count is greater than limit.max_chars, skip
        const max_new_chars = max_chars - char_count;
        line = line.slice(0, max_new_chars) + "...";
        break;
      }
      // validate/format
      if (line.length === 0) continue; // if line is empty, skip
      if (chars_per_line && line.length > chars_per_line) line = line.slice(0, chars_per_line) + "..."; // limit length of line to N characters
      if (line.startsWith("```")) is_code = !is_code; // if line is a code block, skip
      if (is_code) line = "\t"+line; // add tab to beginning of line
      block.push(line); // add line to block
      char_count += line.length; // increment char_count
    }
    if (is_code) block.push("```"); // close code block if open
    return block.join("\n").trim();
  }
  validate_block_path(block_path) { return block_path.indexOf("#") > -1; } // validate block_path contains at least one "#"

}
exports.SmartMarkdown = SmartMarkdown;