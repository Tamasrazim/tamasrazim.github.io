# BTEB Fast Results — IndexedDB prototype

Live page: https://tamasrazim.github.io/projects/bteb-fast-results/

## Implemented
- Static GitHub Pages frontend; no Node.js server is needed for visitor lookups.
- The page loads a versioned publication JSON and stores its institute rows in IndexedDB.
- Repeat lookups use the local database and remain available offline after a successful first load.
- Includes six real institute-level rows from the 28 April 2026 Diploma in Engineering, 2022 Regulation, 6th-semester publication.
- Imports individual JSON or CSV rows into IndexedDB, searches those rows by roll, and exports the browser's imported records.

## Data scope
The bundled file contains six institute summary rows from a publication reporting 408 institutes. It does not include all 408 rows or any individual student records. The individual-roll panel is intentionally empty until a verified roll-level dataset is imported. No fabricated student result is included.

The bundled publication is historical, not the newest BTEB result. Check the official portal for current releases.

## Sources
- Publication summary/source PDF: https://btebresultszone.com/latest-results/28-4-2026/RESULT_6th_2022_Regulation.pdf
- Official BTEB result portal: https://result.bteb.gov.bd/
- Official BTEB diploma result listing: https://bteb.gov.bd/pages/static-pages/691997b2933eb65569dde217

This independent prototype is not affiliated with BTEB. The included data is aggregate publication data, not individual student-level data.

## Individual dataset import
JSON arrays, objects containing a students array, or CSV files are accepted.

Required field:
- roll (4–15 digits)

Optional fields:
- curriculum
- exam or examYear
- semester
- gpa
- status
- subjects (JSON array with code, name, and grade)

Example JSON:

\`\`\`json
[
  {
    "roll": "YOUR_ROLL",
    "curriculum": "Diploma in Engineering",
    "exam": "2025",
    "semester": "6th Semester",
    "gpa": "3.50",
    "status": "Pass",
    "subjects": [
      { "code": "XXXX", "name": "Subject name", "grade": "A" }
    ]
  }
]
\`\`\`

Only import data you are authorized to use. Browser records remain local to that browser profile.
