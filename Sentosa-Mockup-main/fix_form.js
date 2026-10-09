const fs = require('fs');

const path = 'src/app/nops/new/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Extract the Remarks and Declarations
const remStart = content.indexOf('{/* Applicant Remarks (FRD §4 Remarks and Declaration) */}');
const remEndMarker = '</div>\n                </div>\n\n{/* Group C Card: Blackout Dates, Night Works & Equipment */}';
const remEnd = content.indexOf('{/* Group C Card:', remStart);

// We need to be careful to extract exactly the blocks.
// Let's find exactly lines:
const lines = content.split('\n');

let remStartIdx = -1;
let remEndIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{/* Applicant Remarks (FRD §4 Remarks and Declaration) */}')) {
        remStartIdx = i;
    }
    if (lines[i].includes('{/* Group C Card: Blackout Dates, Night Works & Equipment */}')) {
        remEndIdx = i;
        break;
    }
}

if (remStartIdx !== -1 && remEndIdx !== -1) {
    // The lines from remStartIdx to remEndIdx - 1 include the stray `</div>`
    // Let's remove the stray `</div>` first.
    // It is `                </div>` on the line before Group C.
    // Actually, let's just inspect what those lines are.
    
    // We want to move remStartIdx to remEndIdx - 2 (omitting the `</div>`)
    let chunkToMove = lines.slice(remStartIdx, remEndIdx - 1); // omitting line 2013 which is `</div>`
    
    // Check if the last line of the chunk is `</div>` and remove it if so
    if (chunkToMove[chunkToMove.length - 1].includes('</div>')) {
        chunkToMove.pop();
    }

    // Now remove these lines from the original array
    lines.splice(remStartIdx, remEndIdx - remStartIdx); // This deletes everything up to Group C
    
    // Now we need to insert the chunk just before the Footer Buttons
    let footerStart = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('{/* Wizard Footer Buttons')) {
            footerStart = i;
            break;
        }
    }
    
    if (footerStart !== -1) {
        lines.splice(footerStart, 0, ...chunkToMove);
    }
    
    // Finally, we need to close the Step 1 wrapper just before the form ends.
    // Wait, let's just check if there is an unclosed div.
    // <form>
    //   <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
    //     ...
    //   </div> (this should be here, before footer)
    // </form>
    
    // Let's add the `</div>` before the footer buttons.
    lines.splice(footerStart + chunkToMove.length, 0, '              </div>');
    
    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('Fixed remarks and div structure');
}
