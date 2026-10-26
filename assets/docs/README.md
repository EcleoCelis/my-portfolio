# Resume & Document Assets (`assets/docs/`)

Place your final approved PDF resume at:

`assets/docs/Celis-Jomarie-Resume.pdf`

## How the Portfolio Handles This Asset
- The Hero section button (`#resumeDownloadLink`) points to `assets/docs/Celis-Jomarie-Resume.pdf`.
- When a recruiter or hiring manager clicks **Download Resume (PDF)** over HTTP/HTTPS, `js/script.js` performs a `HEAD` verification check (`Content-Type: application/pdf`).
- **If the PDF file is present:** The browser immediately downloads/opens `Celis-Jomarie-Resume.pdf`.
- **If the PDF file has not yet been uploaded:** The UI never sends the visitor to a broken 404 page; instead, it displays an honest status notice, pre-fills the Contact Form with `"Resume / CV Request"` (`Job Opportunity`), and smoothly scrolls to the inquiry form.
