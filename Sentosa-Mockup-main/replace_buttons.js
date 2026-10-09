const fs = require('fs');
const path = 'src/app/nops/new/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `                  {step > 1 && (
                    <button type="button" className="btn btn-secondary" onClick={() => { setStep(step - 1); setErrors({}); }}>
                      Back
                    </button>
                  )}
                  {step < 3 ? (
                    <button type="button" className="btn btn-primary" onClick={handleNextStep} style={{ background: "var(--color-primary)", fontWeight: 700 }}>
                      Next Step →
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-primary" style={{ background: "var(--color-primary)", fontWeight: 800 }}>
                      Submit NOP Application
                    </button>
                  )}`;

const replacement = `                  <button type="submit" className="btn btn-primary" style={{ background: "var(--color-primary)", fontWeight: 800 }}>
                    Submit NOP Application
                  </button>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Replaced exact match');
} else {
  // Let's use regex to replace it
  const regex = /\{step > 1 && \([\s\S]*?Submit NOP Application\s*<\/button>\s*\)\}/;
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Replaced regex match');
}
