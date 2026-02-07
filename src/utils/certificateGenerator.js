import html2canvas from 'html2canvas';

const CERTIFICATE_CONFIG = {
  width: 800,
  height: 1120,
  fonts: {
    small: 10,
    normal: 12,
    medium: 15,
    large: 17,
    xlarge: 26,
    header: 16
  },
  colors: {
    black: '#000000',
    darkBlue: '#1a365d'
  }
};


const POSITIONS = {
  atcCode: {
    label: { x: 70, y: 135 },
    value: { x: 70, y: 155 }
  },
  centerInfo: {
    title: { x: 400, y: 205 },
    name: { x: 400, y: 225 },
    address: { x: 400, y: 245 }
  },
  mainContent: {
    certifyText: { x: 400, y: 365 },
    studentName: { x: 400, y: 415 },
    fatherName: { x: 400, y: 450 },
    dobRegNo: { x: 400, y: 520 },
    gradeText: { x: 400, y: 550 },
    courseText: { x: 400, y: 590 },
    durationText: { x: 400, y: 620 }
  },
  photo: {
    x: 300,
    y: 900,
    width: 90,
    height: 105
  }
};


const adjustPositions = {
  moveAllDown: (pixels) => {
    Object.keys(POSITIONS).forEach(section => {
      if (section === 'photo') {
        POSITIONS.photo.y += pixels;
      } else {
        Object.keys(POSITIONS[section]).forEach(element => {
          POSITIONS[section][element].y += pixels;
        });
      }
    });
  },
  moveAllRight: (pixels) => {
    Object.keys(POSITIONS).forEach(section => {
      if (section === 'photo') {
        POSITIONS.photo.x += pixels;
      } else {
        Object.keys(POSITIONS[section]).forEach(element => {
          POSITIONS[section][element].x += pixels;
        });
      }
    });
  },
  moveSection: (sectionName, pixels) => {
    if (POSITIONS[sectionName]) {
      if (sectionName === 'photo') {
        POSITIONS.photo.y += pixels;
      } else {
        Object.keys(POSITIONS[sectionName]).forEach(element => {
          POSITIONS[sectionName][element].y += pixels;
        });
      }
    }
  }
};


export const generateCertificate = (data, templatePath) => {
  return new Promise((resolve, reject) => {
    console.log('🎨 Starting certificate generation...');
    console.log('📝 Certificate data:', data);
    console.log('🖼️ Template path:', templatePath);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');


    canvas.width = CERTIFICATE_CONFIG.width;
    canvas.height = CERTIFICATE_CONFIG.height;


    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Add timestamp to prevent caching and ensure fresh template loading
    const templateUrl = `${templatePath}?timestamp=${Date.now()}`;
    console.log('🔄 Loading fresh template from:', templateUrl);
    
    img.onload = () => {
      try {
        console.log('✅ Template loaded successfully, generating certificate...');
        ctx.drawImage(img, 0, 0, CERTIFICATE_CONFIG.width, CERTIFICATE_CONFIG.height);


        const scaleX = CERTIFICATE_CONFIG.width / 800;
        const scaleY = CERTIFICATE_CONFIG.height / 1120;


        const drawText = (text, position, fontSize, color = CERTIFICATE_CONFIG.colors.black, fontWeight = 'normal', textAlign = 'center') => {
          const scaledFontSize = Math.round(fontSize * Math.min(scaleX, scaleY));
          ctx.font = `${fontWeight} ${scaledFontSize}px Arial`;
          ctx.fillStyle = color;
          ctx.textAlign = textAlign;
          ctx.fillText(text, position.x * scaleX, position.y * scaleY);
        };


        // ========== TOP ATC CODE BOX ==========
        drawText('ATC CODE', POSITIONS.atcCode.label, CERTIFICATE_CONFIG.fonts.small, CERTIFICATE_CONFIG.colors.black, 'bold', 'left');
        drawText(
          // unified with React / FastAPI: atc_code
          data.atc_code || data.atcCode || 'ATC001',
          POSITIONS.atcCode.value,
          CERTIFICATE_CONFIG.fonts.small,
          CERTIFICATE_CONFIG.colors.black,
          'normal',
          'left'
        );


        // ========== CENTER INFO BAR ==========
        drawText(
          'Authorized Training Centre (ATC)',
          POSITIONS.centerInfo.title,
          CERTIFICATE_CONFIG.fonts.header,
          CERTIFICATE_CONFIG.colors.darkBlue,
          'bold'
        );
        drawText(
          // unified: center_name
          data.center_name || data.centerName || 'Authorized Training Centre',
          POSITIONS.centerInfo.name,
          CERTIFICATE_CONFIG.fonts.large,
          CERTIFICATE_CONFIG.colors.darkBlue,
          'bold'
        );
        drawText(
          data.center_address || data.centerAddress || '',
          POSITIONS.centerInfo.address,
          CERTIFICATE_CONFIG.fonts.normal
        );


        // ========== MAIN CONTENT AREA ==========
        drawText(
          'This is to certify that',
          POSITIONS.mainContent.certifyText,
          CERTIFICATE_CONFIG.fonts.medium
        );
        drawText(
          // unified: student_name
          data.student_name || data.studentName || '',
          POSITIONS.mainContent.studentName,
          CERTIFICATE_CONFIG.fonts.xlarge,
          CERTIFICATE_CONFIG.colors.black,
          'bold'
        );
        drawText(
          `Son/Daughter of ${data.father_name || data.fatherName || ''}`,
          POSITIONS.mainContent.fatherName,
          CERTIFICATE_CONFIG.fonts.medium
        );
        drawText(
          `Date of Birth ${data.date_of_birth || data.dob || ''}   Reg. No. ${data.student_registration || data.regNo || ''}`,
          POSITIONS.mainContent.dobRegNo,
          CERTIFICATE_CONFIG.fonts.normal
        );
        drawText(
          `has secured ${data.grade || ''} Grade with ${data.percentage || ''}% Marks`,
          POSITIONS.mainContent.gradeText,
          CERTIFICATE_CONFIG.fonts.medium
        );
        drawText(
          `in ${data.course_name || data.course || ''} Course`,
          POSITIONS.mainContent.courseText,
          CERTIFICATE_CONFIG.fonts.medium
        );
        drawText(
          `Duration: ${data.duration || ''} From ${data.startDate || data.start_date || ''} to ${data.endDate || data.completion_date || ''}`,
          POSITIONS.mainContent.durationText,
          CERTIFICATE_CONFIG.fonts.normal
        );


        // ========== PHOTO (OPTIONAL) ==========
        if (data.photo || data.photo_url) {
          const photoImg = new Image();
          photoImg.crossOrigin = 'anonymous';
          
          photoImg.onload = () => {
            const photoX = POSITIONS.photo.x * scaleX;
            const photoY = POSITIONS.photo.y * scaleY;
            const photoWidth = POSITIONS.photo.width * scaleX;
            const photoHeight = POSITIONS.photo.height * scaleY;
            
            ctx.drawImage(photoImg, photoX, photoY, photoWidth, photoHeight);
            
            const dataURL = canvas.toDataURL('image/png', 0.9);
            console.log('🎉 Certificate with photo generated successfully!');
            resolve(dataURL);
          };
          
          photoImg.onerror = () => {
            console.log('📷 Photo failed to load, generating certificate without photo');
            const dataURL = canvas.toDataURL('image/png', 0.9);
            console.log('🎉 Certificate without photo generated successfully!');
            resolve(dataURL);
          };
          
          const photoSource = data.photo_url || data.photo;
          if (typeof photoSource === 'string') {
            photoImg.src = photoSource;
          } else if (photoSource instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => {
              photoImg.src = e.target.result;
            };
            reader.readAsDataURL(photoSource);
          }
        } else {
          const dataURL = canvas.toDataURL('image/png', 0.9);
          console.log('🎉 Certificate generated successfully!');
          resolve(dataURL);
        }


      } catch (error) {
        reject(new Error(`Error generating certificate: ${error.message}`));
      }
    };


    img.onerror = () => {
      console.error('❌ Failed to load certificate template from:', templateUrl);
      reject(new Error(`Failed to load certificate template from: ${templatePath}`));
    };

    img.src = templateUrl;
  });
};


export const generateCertificateBatch = async (studentDataArray, templatePath) => {
  const certificates = [];
  
  for (const studentData of studentDataArray) {
    try {
      const certificateDataURL = await generateCertificate(studentData, templatePath);
      certificates.push({
        student: studentData.studentName || studentData.student_name,
        certificate: certificateDataURL,
        success: true
      });
    } catch (error) {
      certificates.push({
        student: studentData.studentName || studentData.student_name,
        error: error.message,
        success: false
      });
    }
  }
  
  return certificates;
};


export const downloadCertificate = (dataURL, filename = 'certificate.png') => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


export const printCertificate = (certificateDataUrl) => {
  try {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Certificate</title>
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
          <img src="${certificateDataUrl}" alt="Certificate" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } catch (error) {
    console.error('Print failed:', error);
    alert('Failed to print certificate');
  }
};


export const printBulkCertificates = (certificateDataUrls) => {
  try {
    const printWindow = window.open('', '_blank');
    const certificatesHtml = certificateDataUrls.map(dataUrl => 
      `<div class="certificate-page"><img src="${dataUrl}" alt="Certificate" /></div>`
    ).join('');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Certificates</title>
          <style>
            body { margin: 0; padding: 20px; }
            .certificate-page {
              page-break-after: always;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .certificate-page:last-child {
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
              .certificate-page { min-height: 100vh; }
            }
          </style>
        </head>
        <body>
          ${certificatesHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } catch (error) {
    console.error('Bulk print failed:', error);
    alert('Failed to print certificates');
  }
};


export { adjustPositions };
