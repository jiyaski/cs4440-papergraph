const cron = require('node-cron');
const runOpenAlexFetch = require('./openalex_fetch');
const { exec } = require('child_process');

// Schedule to run every day at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('[Scheduler] Starting daily fetch + import...');

    try {
        await runOpenAlexFetch('forward');
        console.log('[Scheduler] Fetch complete. Running import...');
        exec('node openalex_import.js', (err, stdout, stderr) => {
            if (err) {
                console.error('[Scheduler] Import failed:', err.message);
            } else {
                console.log('[Scheduler] Import successful.');
                if (stdout) console.log(stdout.trim());
                if (stderr) console.warn('[Scheduler] Warnings:\n', stderr.trim());
            }
        });
    } catch (err) {
        console.error('[Scheduler Error]:', err);
    }
});

console.log('[Scheduler] Daily job scheduled.');