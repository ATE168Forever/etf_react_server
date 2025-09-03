import React from 'react';
import { exportToDrive, importFromDrive } from './driveSync';

export default function AboutTab() {
  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h1 className="mt-4">About This Project</h1>
      <p>
        This website provides a consolidated view of ETF dividend information and
        simple tools for tracking personal holdings. All data is for
        informational purposes only and should not be considered financial
        advice.
      </p>
      <p>
        Source code is available on GitHub. Feedback and contributions are
        welcome!
      </p>
      <div style={{ marginTop: 20 }}>
        <button onClick={exportToDrive}>一鍵匯出</button>
        <button onClick={importFromDrive} style={{ marginLeft: 8 }}>一鍵匯入</button>
      </div>
    </div>
  );
}
