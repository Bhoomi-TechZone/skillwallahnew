/**
 * Marksheet Generator Utility
 * Handles marksheet generation using FIXED template only
 */

import { getApiBaseUrl } from '../config/api';

// Use centralized API configuration
const API_BASE_URL = getApiBaseUrl();

// Debug logging
console.log('🔍 [MARKSHEET-GEN] Environment Debug:', {
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  FINAL_API_BASE_URL: API_BASE_URL
});

// Fixed marksheet template path - no fallbacks
const FIXED_MARKSHEET_TEMPLATE_PATH = 'uploads/Marksheet/marksheet.jpeg';
const FIXED_MARKSHEET_OUTPUT_PATH = 'uploads/Marksheet/generated';

/**
 * Generate marksheet image with student data overlaid on FIXED template
 * @param {Object} studentData - Student information for the marksheet
 * @param {Object} branchData - Branch information (can include template override)
 * @returns {Promise<string>} - Base64 image data URL
 */
export const generateMarksheet = async (studentData, branchData = null) => {
  try {
    console.log('📊 [MARKSHEET] Generating marksheet with FIXED template for:', studentData);

    // Determine template path - prefer provided path over fixed default
    let templatePath = FIXED_MARKSHEET_TEMPLATE_PATH;

    if (branchData && branchData.template) {
      templatePath = branchData.template;
      console.log('🔄 [MARKSHEET] Using template from branchData:', templatePath);
    } else if (studentData && studentData.template_path) {
      templatePath = studentData.template_path;
      console.log('🔄 [MARKSHEET] Using template from studentData:', templatePath);
    }

    // Construct full URL
    // Check if path is already a full URL or relative
    const templateUrl = templatePath.startsWith('http')
      ? templatePath
      : `${API_BASE_URL}/${templatePath.replace(/^\//, '')}`;

    console.log('🔒 [MARKSHEET] Using template URL:', templateUrl);

    // Verify template exists
    try {
      const response = await fetch(templateUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.warn(`Template not found at: ${templateUrl}. Falling back to default.`);
        // Only fallback if the custom one fails, and if we weren't already trying the default
        if (templatePath.includes(FIXED_MARKSHEET_TEMPLATE_PATH)) {
          throw new Error(`Fixed marksheet template not found at: ${templateUrl}`);
        }
      }
    } catch (err) {
      console.warn('Template check failed:', err);
      // Continue anyway, maybe the image load will work
    }

    // Add cache buster to URL to ensure latest template is used
    const cacheBusterUrl = `${templateUrl}?t=${Date.now()}`;
    console.log('🔒 [MARKSHEET] Using template URL with cache buster:', cacheBusterUrl);

    // Verify template exists (using HEAD request)
    // Note: Some servers might reject HEAD on static files or cache busting query params, so we proceed even if this fails
    try {
      const response = await fetch(cacheBusterUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.warn(`Template check returned ${response.status} for: ${cacheBusterUrl}`);
      }
    } catch (err) {
      console.warn('Template availability check failed (proceeding anyway):', err);
    }

    console.log('✅ [MARKSHEET] Proceeding to load template:', cacheBusterUrl);

    // Create canvas for marksheet generation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Load template image
    const templateImage = new Image();
    templateImage.crossOrigin = 'anonymous';

    return new Promise((resolve, reject) => {
      templateImage.onload = () => {
        try {
          // Set canvas dimensions to match template
          canvas.width = templateImage.width || 800;
          canvas.height = templateImage.height || 600;

          // Draw template as background (your template already has all the design)
          ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

          // Set text properties for dynamic content only
          ctx.textAlign = 'center';
          ctx.fillStyle = '#000000'; // Black text for readability
          ctx.font = '16px Arial, sans-serif';

          // Only add dynamic user values, not static text (since template has the design)

          // Template Specific Positioning

          // Student name - positioned for your ambertemplate
          const studentName = studentData.student_name || 'Student Name';
          ctx.font = 'bold 16px Arial, sans-serif';
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'left';
          ctx.fillText(studentName, canvas.width * 0.42, canvas.height * 0.385); // Adjusted for Name of Student field

          // Father's name
          if (studentData.father_name) {
            ctx.font = '16px Arial, sans-serif';
            ctx.fillText(studentData.father_name, canvas.width * 0.42, canvas.height * 0.41); // Father's Name field
          }

          // Mother's name
          if (studentData.mother_name) {
            ctx.font = '16px Arial, sans-serif';
            ctx.fillText(studentData.mother_name, canvas.width * 0.42, canvas.height * 0.435); // Mother's Name field
          }

          // ATC (Training Center)
          if (studentData.branch_name || branchData?.branchName) {
            ctx.font = '14px Arial, sans-serif';
            const atcName = studentData.branch_name || branchData?.branchName || 'Training Center';
            ctx.fillText(atcName, canvas.width * 0.42, canvas.height * 0.458); // ATC field
          }

          // Course name
          if (studentData.course_name || studentData.course) {
            ctx.font = '16px Arial, sans-serif';
            const courseName = studentData.course_name || studentData.course || 'Course';
            ctx.fillText(courseName, canvas.width * 0.42, canvas.height * 0.485); // Course field
          }

          // Course details table (Course Code, Student ID, Join Date, Date of Issue)
          ctx.font = '14px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#000000';

          // Course Code
          const courseCode = studentData.course_code || 'BCC';
          ctx.fillText(courseCode, canvas.width * 0.27, canvas.height * 0.535);

          // Student ID
          const studentId = studentData.student_id_number || studentData.student_registration || studentData.registration_number || '000000';
          ctx.fillText(studentId, canvas.width * 0.415, canvas.height * 0.535);

          // Join Date
          const joinDate = studentData.join_date || '01/01/2025';
          ctx.fillText(joinDate, canvas.width * 0.56, canvas.height * 0.535);

          // Date of Issue
          const issueDate = studentData.issue_date || new Date().toLocaleDateString('en-GB');
          ctx.fillText(issueDate, canvas.width * 0.71, canvas.height * 0.535);

          // Subjects marks table - positioned for your ambertemplate
          if (studentData.subjects && Array.isArray(studentData.subjects)) {
            const tableStartY = canvas.height * 0.605; // Start of subjects table
            const rowHeight = 20; // Height between rows
            let currentY = tableStartY;

            ctx.font = '12px Arial, sans-serif';
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';

            // Column positions based on your ambertemplate
            const subjectCol = canvas.width * 0.20;     // Subject name column
            const theoryObtCol = canvas.width * 0.36;   // Theory Obtained
            const theoryMaxCol = canvas.width * 0.46;   // Theory Max
            const practicalObtCol = canvas.width * 0.56; // Practical Obtained  
            const practicalMaxCol = canvas.width * 0.66; // Practical Max

            // Add subject data (limit to fit template)
            studentData.subjects.slice(0, 5).forEach((subject, index) => {
              ctx.textAlign = 'left';
              ctx.fillText(subject.name || `Subject ${index + 1}`, canvas.width * 0.125, currentY);

              ctx.textAlign = 'center';
              ctx.fillText(subject.theory_marks || subject.obtained_marks || '0', theoryObtCol, currentY);
              ctx.fillText(subject.theory_max || subject.full_marks || '100', theoryMaxCol, currentY);
              ctx.fillText(subject.practical_marks || '0', practicalObtCol, currentY);
              ctx.fillText(subject.practical_max || '0', practicalMaxCol, currentY);

              currentY += rowHeight;
            });
          }

          // Grade summary section (positioned for ambertemplate)
          const gradeTableY = canvas.height * 0.72;
          ctx.font = 'bold 16px Arial, sans-serif';
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';

          // Grade
          const grade = studentData.grade || studentData.overall_grade || 'A';
          ctx.fillText(grade, canvas.width * 0.20, gradeTableY);

          // Percentage
          const percentage = studentData.percentage ? `${studentData.percentage}%` : '0%';
          ctx.fillText(percentage, canvas.width * 0.355, gradeTableY);

          // Total Marks Obtained
          const obtainedMarks = studentData.obtained_marks || studentData.total_obtained || '0';
          ctx.fillText(obtainedMarks, canvas.width * 0.565, gradeTableY);

          // Total Marks
          const totalMarks = studentData.total_marks || '0';
          ctx.fillText(totalMarks, canvas.width * 0.745, gradeTableY);

          // Issue date and branch info if provided
          if (studentData.issue_date) {
            const dateY = canvas.height - 50;
            ctx.font = '14px Arial, sans-serif';
            ctx.fillStyle = '#666666';
            ctx.textAlign = 'left';
            ctx.fillText(`Date: ${studentData.issue_date}`, canvas.width * 0.15, dateY);
          }

          if (branchData?.branchName || branchData?.name) {
            const branchY = canvas.height - 50;
            ctx.font = '14px Arial, sans-serif';
            ctx.fillStyle = '#666666';
            ctx.textAlign = 'right';
            const branchName = branchData.branchName || branchData.name || 'SkillWallah EdTech';
            ctx.fillText(`Issued by: ${branchName}`, canvas.width * 0.85, branchY);
          }

          // Convert canvas to data URL
          const marksheetDataUrl = canvas.toDataURL('image/png', 0.95);
          console.log('✅ [MARKSHEET] Marksheet generated successfully');
          resolve(marksheetDataUrl);

        } catch (error) {
          console.error('❌ [MARKSHEET] Error generating marksheet:', error);
          reject(error);
        }
      };

      templateImage.onerror = () => {
        console.error('❌ [MARKSHEET] Failed to load template image:', templateUrl);
        reject(new Error('Failed to load marksheet template'));
      };

      templateImage.src = cacheBusterUrl;
    });

  } catch (error) {
    console.error('❌ [MARKSHEET] Marksheet generation failed:', error);
    throw error;
  }
};

/**
 * Print marksheet
 * @param {string} marksheetDataUrl - Base64 image data URL
 */
export const printMarksheet = (marksheetDataUrl) => {
  try {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Marksheet</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f0f0f0;
            }
            img {
              max-width: 100%;
              height: auto;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            @media print {
              body { background: white; margin: 0; padding: 0; }
              img { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <img src="${marksheetDataUrl}" alt="Marksheet" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } catch (error) {
    console.error('❌ [MARKSHEET] Print failed:', error);
    alert('Failed to print marksheet');
  }
};

/**
 * Print multiple marksheets
 * @param {string[]} marksheetDataUrls - Array of Base64 image data URLs
 */
export const printBulkMarksheets = (marksheetDataUrls) => {
  try {
    const printWindow = window.open('', '_blank');
    const marksheetsHtml = marksheetDataUrls.map(dataUrl =>
      `<div class="marksheet-page"><img src="${dataUrl}" alt="Marksheet" /></div>`
    ).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Marksheets</title>
          <style>
            body { margin: 0; padding: 20px; }
            .marksheet-page {
              page-break-after: always;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .marksheet-page:last-child {
              page-break-after: avoid;
            }
            img {
              max-width: 100%;
              height: auto;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            @media print {
              body { background: white; margin: 0; padding: 0; }
              img { box-shadow: none; }
              .marksheet-page { min-height: 100vh; }
            }
          </style>
        </head>
        <body>
          ${marksheetsHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } catch (error) {
    console.error('❌ [MARKSHEET] Bulk print failed:', error);
    alert('Failed to print marksheets');
  }
};

/**
 * Download marksheet
 * @param {string} marksheetDataUrl - Base64 image data URL
 * @param {string} fileName - File name for download
 */
export const downloadMarksheet = (marksheetDataUrl, fileName = 'marksheet.png') => {
  try {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = marksheetDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('✅ [MARKSHEET] Marksheet downloaded:', fileName);
  } catch (error) {
    console.error('❌ [MARKSHEET] Download failed:', error);
    alert('Failed to download marksheet');
  }
};