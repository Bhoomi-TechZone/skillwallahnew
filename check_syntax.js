const fs = require('fs');
const content = fs.readFileSync('c:/Users/arzum/OneDrive/Desktop/skillwallah-project/skillwallah-project/src/components/Branch/Courses/BranchBatch.jsx', 'utf8');

let stack = [];
let lines = content.split('\n');
let errors = [];

function checkBalance() {
    let openDivs = 0;
    let openBraces = 0;
    let openParens = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Simple heuristic check
        const divsOpen = (line.match(/<div/g) || []).length;
        const divsClose = (line.match(/<\/div>/g) || []).length;

        // Ignore self-closing? No, div is never self-closing in standard JSX usually.

        openDivs += divsOpen - divsClose;

        // Check braces (ignoring strings/comments is hard, but simple counts might help)
        const bracesOpen = (line.match(/{/g) || []).length;
        const bracesClose = (line.match(/}/g) || []).length;
        openBraces += bracesOpen - bracesClose;

        const parensOpen = (line.match(/\(/g) || []).length;
        const parensClose = (line.match(/\)/g) || []).length;
        openParens += parensOpen - parensClose;

        if (openDivs < 0) errors.push(`Line ${i + 1}: Extra </div> found (balance: ${openDivs})`);
    }

    console.log(`Final Balance: Divs: ${openDivs}, Braces: ${openBraces}, Parens: ${openParens}`);
    if (errors.length > 0) console.log(errors.join('\n'));
}

checkBalance();
