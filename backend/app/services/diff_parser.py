import re
from typing import List, Dict, Any

class DiffParser:
    @staticmethod
    def parse(diff_text: str) -> List[Dict[str, Any]]:
        """
        Parses a git unified diff into structured data.
        Returns a list of dictionaries representing changes per file:
        {
            "file_path": "path/to/file.py",
            "hunks": [
                {
                    "header": "@@ -10,6 +10,12 @@",
                    "lines": [
                        {"type": "added"|"deleted"|"context", "content": "line text", "old_line": int|None, "new_line": int|None}
                    ]
                }
            ],
            "added_lines_count": int,
            "deleted_lines_count": int
        }
        """
        files = []
        if not diff_text:
            return files

        # Split by files (diff --git)
        file_sections = re.split(r'^diff --git ', diff_text, flags=re.MULTILINE)
        
        for section in file_sections:
            if not section.strip():
                continue
                
            lines = section.splitlines()
            if not lines:
                continue

            # Extract file path
            file_path = None
            header_parsed = False
            hunks = []
            current_hunk = None
            
            old_line_num = 0
            new_line_num = 0
            added_count = 0
            deleted_count = 0

            for line in lines:
                # Identify header path
                if line.startswith('+++ b/'):
                    file_path = line[6:]
                    header_parsed = True
                    continue
                elif line.startswith('--- a/'):
                    if not file_path:
                        file_path = line[6:]
                    continue
                
                # If we haven't seen +++ b/ yet, skip other headers like index, etc.
                if not header_parsed:
                    continue

                # Parse Hunk headers: @@ -old_start,old_count +new_start,new_count @@
                if line.startswith('@@'):
                    match = re.match(r'^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@', line)
                    if match:
                        old_line_num = int(match.group(1))
                        new_line_num = int(match.group(2))
                        
                        current_hunk = {
                            "header": line,
                            "lines": []
                        }
                        hunks.append(current_hunk)
                        continue

                if current_hunk is not None:
                    # Process lines in hunk
                    if line.startswith('+'):
                        current_hunk["lines"].append({
                            "type": "added",
                            "content": line[1:],
                            "old_line": None,
                            "new_line": new_line_num
                        })
                        new_line_num += 1
                        added_count += 1
                    elif line.startswith('-'):
                        current_hunk["lines"].append({
                            "type": "deleted",
                            "content": line[1:],
                            "old_line": old_line_num,
                            "new_line": None
                        })
                        old_line_num += 1
                        deleted_count += 1
                    elif line.startswith('\\'):
                        # "No newline at end of file" marker, skip or attach
                        continue
                    else:
                        # Context line
                        # Stripping the leading space (git uses a space for context)
                        content = line[1:] if line else ""
                        current_hunk["lines"].append({
                            "type": "context",
                            "content": content,
                            "old_line": old_line_num,
                            "new_line": new_line_num
                        })
                        old_line_num += 1
                        new_line_num += 1

            if file_path:
                files.append({
                    "file_path": file_path,
                    "hunks": hunks,
                    "added_lines_count": added_count,
                    "deleted_lines_count": deleted_count
                })

        return files
