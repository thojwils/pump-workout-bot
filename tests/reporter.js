const fs = require('fs');
const path = require('path');

// Custom Jest reporter to save test results to a file
class FileReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this.testResults = {
      numFailedTestSuites: 0,
      numFailedTests: 0,
      numPassedTestSuites: 0,
      numPassedTests: 0,
      numPendingTestSuites: 0,
      numPendingTests: 0,
      numTotalTestSuites: 0,
      numTotalTests: 0,
      startTime: new Date().getTime(),
      endTime: null,
      testResults: [],
      consoleLogs: [],
    };

    // Capture console logs
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    
    console.log = (...args) => {
      this.testResults.consoleLogs.push({ type: 'log', message: args.join(' ') });
      this.originalConsoleLog(...args);
    };
    
    console.error = (...args) => {
      this.testResults.consoleLogs.push({ type: 'error', message: args.join(' ') });
      this.originalConsoleError(...args);
    };
    
    console.warn = (...args) => {
      this.testResults.consoleLogs.push({ type: 'warn', message: args.join(' ') });
      this.originalConsoleWarn(...args);
    };
  }

  onRunStart() {
    this.testResults.startTime = new Date().getTime();
  }

  onTestResult(test, testResult) {
    // Extract valuable info from the test result
    const testSuiteResult = {
      name: testResult.testFilePath,
      displayName: path.relative(process.cwd(), testResult.testFilePath),
      status: testResult.numFailingTests > 0 ? 'failed' : 'passed',
      numFailingTests: testResult.numFailingTests,
      numPassingTests: testResult.numPassingTests,
      numPendingTests: testResult.numPendingTests,
      testResults: [],
    };

    // Add detailed test results
    testResult.testResults.forEach(result => {
      const testInfo = {
        name: result.title,
        status: result.status,
        duration: result.duration,
        failureMessages: result.failureMessages || [],
      };
      testSuiteResult.testResults.push(testInfo);
    });

    this.testResults.testResults.push(testSuiteResult);
  }

  onRunComplete(contexts, results) {
    // Add summary information
    this.testResults.numFailedTestSuites = results.numFailedTestSuites;
    this.testResults.numFailedTests = results.numFailedTests;
    this.testResults.numPassedTestSuites = results.numPassedTestSuites;
    this.testResults.numPassedTests = results.numPassedTests;
    this.testResults.numPendingTestSuites = results.numPendingTestSuites;
    this.testResults.numPendingTests = results.numPendingTests;
    this.testResults.numTotalTestSuites = results.numTotalTestSuites;
    this.testResults.numTotalTests = results.numTotalTests;
    this.testResults.endTime = new Date().getTime();

    // Restore console methods
    console.log = this.originalConsoleLog;
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Write test results to file
    const outputPath = path.join(outputDir, 'test-results.json');
    fs.writeFileSync(
      outputPath,
      JSON.stringify(this.testResults, null, 2),
      'utf8'
    );

    // Also create a readable HTML summary
    this._createHtmlSummary(outputDir);

    console.log(`Test results saved to: ${outputPath}`);
    console.log(`HTML summary saved to: ${path.join(outputDir, 'test-summary.html')}`);
  }

  _createHtmlSummary(outputDir) {
    const summary = this.testResults;
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test Results Summary</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { margin-bottom: 20px; }
        .test-suite { border: 1px solid #ddd; margin-bottom: 10px; padding: 10px; }
        .test-suite.failed { border-left: 5px solid #f44336; }
        .test-suite.passed { border-left: 5px solid #4caf50; }
        .test { margin-left: 20px; margin-bottom: 5px; }
        .test.failed { color: #f44336; }
        .test.passed { color: #4caf50; }
        .test.pending { color: #ff9800; }
        .failure-message { 
          background-color: #ffebee; 
          padding: 10px; 
          margin-top: 5px; 
          white-space: pre-wrap;
          font-family: monospace;
          font-size: 12px;
          overflow-x: auto;
        }
        .console-log {
          margin-top: 20px;
          border: 1px solid #ddd;
          padding: 10px;
          font-family: monospace;
          font-size: 12px;
          max-height: 200px;
          overflow-y: auto;
        }
        .console-log .error { color: #f44336; }
        .console-log .warn { color: #ff9800; }
        .console-log .log { color: #2196f3; }
        details { margin: 10px 0; }
        summary { cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>Test Results Summary</h1>
      <div class="summary">
        <p>Total Test Suites: ${summary.numTotalTestSuites} (Passed: ${summary.numPassedTestSuites}, Failed: ${summary.numFailedTestSuites}, Pending: ${summary.numPendingTestSuites})</p>
        <p>Total Tests: ${summary.numTotalTests} (Passed: ${summary.numPassedTests}, Failed: ${summary.numFailedTests}, Pending: ${summary.numPendingTests})</p>
        <p>Duration: ${(summary.endTime - summary.startTime) / 1000} seconds</p>
      </div>
      
      <details>
        <summary>Console Logs</summary>
        <div class="console-log">
          ${summary.consoleLogs.map(log => `<div class="${log.type}">[${log.type}] ${log.message}</div>`).join('\n')}
        </div>
      </details>
      
      <h2>Test Suites</h2>
    `;

    summary.testResults.forEach(suite => {
      html += `
      <div class="test-suite ${suite.status}">
        <h3>${suite.displayName} (${suite.numPassingTests}/${suite.numPassingTests + suite.numFailingTests})</h3>
        <details ${suite.status === 'failed' ? 'open' : ''}>
          <summary>View Tests</summary>
      `;

      suite.testResults.forEach(test => {
        html += `<div class="test ${test.status}">${test.name}</div>`;
        
        if (test.status === 'failed' && test.failureMessages && test.failureMessages.length > 0) {
          html += `<div class="failure-message">${test.failureMessages.join('\n\n')}</div>`;
        }
      });

      html += `
        </details>
      </div>
      `;
    });

    html += `
    </body>
    </html>
    `;

    fs.writeFileSync(path.join(outputDir, 'test-summary.html'), html, 'utf8');
  }
}

module.exports = FileReporter;
