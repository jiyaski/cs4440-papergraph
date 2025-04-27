
const { execSync } = require('child_process') 


function run(cmd) {
    try {
        execSync(cmd, { stdio: 'inherit' }); 
    } catch (err) {
        process.exit(err.status || 1); 
    }
}


// fetch papers from OpenAlex API 
const direction = process.argv[2];
if (direction === 'forward') {
    run('npm run fetch forward');
} else if (direction === 'backward') {
    run('npm run fetch backward');
} else {
    console.error('Usage: node fetchImportFill.js <forward|backward>');
    process.exit(1);
}


// import them into database 
run('npm run importpapers');


// fill stubs 
while (true) {
    try {
        execSync('npm run fillstubs', { stdio: 'inherit' });
    } catch (err) {
        if (err.status === 1) { process.exit(0); }  // fillStubs expected to exit with 1 when no more stubs 
        process.exit(err.status);
    }
}