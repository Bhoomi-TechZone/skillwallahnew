/**
 * ID Card Generator Utility
 * Generates student ID cards using the template and overlaying student information
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

/**
 * Generate ID card by overlaying student data on template
 * @param {Object} student - Student data
 * @param {Object} branchData - Branch information
 * @returns {Promise<string>} - Base64 encoded image of the ID card
 */
export const generateIdCard = async (student, branchData = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Convert photo to base64 if it's a server URL to avoid CORS issues
      let photoBase64 = null;

      console.log('🎨 [ID CARD] Starting generation for student:', student.student_name);
      console.log('📸 [ID CARD] Photo sources available:', {
        student_photo_url: student.student_photo_url ? (student.student_photo_url.substring(0, 100) + '...') : null,
        photo: student.photo,
        photoPreview: student.photoPreview,
        student_photo: student.student_photo,
        profile_image: student.profile_image,
        note: 'photo_url may be ID card file path, not student photo'
      });

      const photoSources = [
        student.student_photo_url,  // Base64 from backend (actual student photo)
        student.photo,
        student.photoPreview,
        student.student_photo,
        student.profile_image
      ].filter(Boolean);

      if (photoSources.length > 0) {
        const photoUrl = photoSources[0];
        console.log('📸 [PHOTO] Processing student photo:', photoUrl);
        console.log('📸 [PHOTO] Photo URL type:', typeof photoUrl);
        console.log('📸 [PHOTO] API_BASE_URL:', API_BASE_URL);

        try {
          // If already base64, use it directly
          if (photoUrl.startsWith('data:')) {
            photoBase64 = photoUrl;
            console.log('✅ [PHOTO] Using existing base64 data');
          } else {
            // For server URLs, try to load with proper error handling
            console.log('🔄 [PHOTO] Loading from server:', photoUrl);

            // Check if URL needs to be constructed
            let fullPhotoUrl = photoUrl;
            if (!photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
              if (photoUrl.startsWith('/')) {
                fullPhotoUrl = `${API_BASE_URL}${photoUrl}`;
              } else {
                fullPhotoUrl = `${API_BASE_URL}/${photoUrl}`;
              }
              console.log('🔗 [PHOTO] Constructed full URL:', fullPhotoUrl);
            }

            // Try to convert to base64 with extended timeout
            try {
              photoBase64 = await imageUrlToBase64(fullPhotoUrl, 10000); // 10 second timeout
              console.log('✅ [PHOTO] Successfully converted to base64:', photoBase64 ? `${photoBase64.substring(0, 50)}...` : 'null');
            } catch (conversionError) {
              console.warn('⚠️ [PHOTO] Base64 conversion failed, will try direct URL:', conversionError);
              // Store the URL directly, we'll try to load it later
              photoBase64 = fullPhotoUrl;
            }
          }
        } catch (error) {
          console.warn('⚠️ [PHOTO] Failed to load student photo, continuing without it:', error);
          console.warn('Photo URL that failed:', photoUrl);
          photoBase64 = null;
        }
      } else {
        console.log('ℹ️ [PHOTO] No photo provided for student');
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set canvas size (standard ID card size: 3.375" x 2.125" at 300 DPI)
      canvas.width = 1012;  // 3.375" x 300 DPI
      canvas.height = 638;  // 2.125" x 300 DPI

      // Load the ID card template
      const templateImg = new Image();
      templateImg.crossOrigin = 'anonymous';
      const templateUrl = `${API_BASE_URL}/uploads/id%20card/idcard.png`;
      console.log('🖼️ [TEMPLATE] Loading ID card template from:', templateUrl);
      templateImg.src = templateUrl;

      templateImg.onload = () => {
        console.log('✅ [TEMPLATE] ID card template loaded successfully');
        // Draw the template as background
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

        // Set text styling
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';

        // Add student photo (if available)
        if (photoBase64) {
          console.log('📸 [PHOTO RENDER] Adding photo to ID card');
          const photoImg = new Image();

          // Only set crossOrigin for URLs, not for base64 data
          // Base64 data doesn't need CORS and setting it can cause issues
          if (!photoBase64.startsWith('data:')) {
            console.log('🔒 [PHOTO RENDER] Setting crossOrigin for URL-based photo');
            photoImg.crossOrigin = 'anonymous';
          } else {
            console.log('📦 [PHOTO RENDER] Using base64 photo (no CORS needed)');
          }

          photoImg.src = photoBase64;

          photoImg.onload = () => {
            console.log('✅ [PHOTO RENDER] Photo loaded for rendering');
            // Photo frame exact coordinates - precisely aligned with template photo box
            // Adjusted to fit inside the photo frame border
            const frameX = 72;      // X position (5px padding from border)
            const frameY = 276;     // Y position (adjusted to fit within frame)
            const frameWidth = 168;  // Width (smaller to fit inside frame)
            const frameHeight = 244; // Height (smaller to fit inside frame)

            // Calculate the aspect ratios
            const imgAspect = photoImg.width / photoImg.height;
            const frameAspect = frameWidth / frameHeight;

            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = photoImg.width;
            let sourceHeight = photoImg.height;

            // Crop the image to match frame aspect ratio (perfect center crop)
            if (imgAspect > frameAspect) {
              // Image is wider - crop width from both sides equally
              sourceWidth = photoImg.height * frameAspect;
              sourceX = (photoImg.width - sourceWidth) / 2;
            } else {
              // Image is taller - crop height from top and bottom equally
              sourceHeight = photoImg.width / frameAspect;
              sourceY = (photoImg.height - sourceHeight) / 2;
            }

            console.log('🖼️ [PHOTO RENDER] Drawing photo with dimensions:', {
              frameX, frameY, frameWidth, frameHeight,
              sourceX, sourceY, sourceWidth, sourceHeight
            });

            // Draw the cropped and scaled photo perfectly centered in the frame
            ctx.drawImage(
              photoImg,
              sourceX, sourceY, sourceWidth, sourceHeight,  // Source rectangle (cropped from center)
              frameX, frameY, frameWidth, frameHeight        // Destination rectangle (aligned with template frame)
            );

            console.log('✅ [PHOTO RENDER] Photo successfully rendered on ID card');
            finishIdCard();
          };

          photoImg.onerror = () => {
            console.error('❌ [PHOTO RENDER] Failed to render photo on ID card');
            console.log('⏭️ [PHOTO RENDER] Continuing without photo');
            finishIdCard();
          };
        } else {
          console.log('ℹ️ [PHOTO RENDER] No photo available, continuing without photo');
          finishIdCard();
        }

        function finishIdCard() {
          console.log('🎨 [ID CARD CANVAS] Starting canvas text rendering...');
          console.log('🎨 [ID CARD CANVAS] Student data being rendered:', {
            name: student.student_name,
            registration: student.registration_number,
            course: student.course,
            duration: student.duration,
            center: student.center,
            contact: student.contact_no
          });

          // Set text color to black
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'left';

          // RIGHT SIDE - Student details positioned with proper gap from photo
          // Shifted to the right to create space between photo and text

          const valueX = 520;  // X position for field values (shifted right for proper gap from photo)

          // Student Name - Y position 258 (first field)
          ctx.font = 'bold 20px Arial';
          const studentName = student.student_name || 'N/A';
          ctx.fillText(studentName, valueX, 257);

          // Registration Number - Y position 288 (second field)
          ctx.font = 'bold 20px Arial';
          const regNo = student.registration_number || 'N/A';
          ctx.fillText(regNo, valueX, 292);

          // Date of Birth - Y position 310 (third field)
          // if (student.date_of_birth) {
          //   ctx.font = 'bold 20px Arial';
          //   const dob = formatDate(student.date_of_birth);
          //   ctx.fillText(dob, valueX, 318);
          // }

          // Course Name - Y position 332 (fourth field)
          ctx.font = 'bold 20px Arial';
          const courseName = student.course || 'N/A';
          // Handle long course names by wrapping to next line
          if (courseName.length > 25) {
            ctx.fillText(courseName.substring(0, 25), valueX, 329);
            ctx.font = 'bold 20px Arial';
            ctx.fillText(courseName.substring(25), valueX, 329);
          } else {
            ctx.fillText(courseName, valueX, 329);
          }

          // Duration - Y position 360 (fifth field)
          ctx.font = 'bold 20px Arial';
          const duration = student.duration || student.course_duration || 'N/A';
          console.log(`⏱️ [DURATION RENDER] Rendering duration: "${duration}" (from student.duration="${student.duration}", student.course_duration="${student.course_duration}")`);
          ctx.fillText(duration, valueX, 366);

          // Center/Branch - Y position 382 (sixth field)
          ctx.font = 'bold 20px Arial';
          const centerName = student.center || branchData.branchName || 'N/A';
          // Handle long center names
          if (centerName.length > 25) {
            ctx.fillText(centerName.substring(0, 25), valueX, 404);
            ctx.font = 'bold 20px Arial';
            ctx.fillText(centerName.substring(25), valueX, 404);
          } else {
            ctx.fillText(centerName, valueX, 404);
          }

          // Address - Y position 411 (seventh field)
          ctx.font = 'bold 20px Arial';
          const address = student.address || student.city || 'N/A';
          console.log(`🏠 [ADDRESS RENDER] Rendering address: "${address}" (from student.address="${student.address}", student.city="${student.city}")`);
          // Handle long addresses with line wrapping
          if (address.length > 30) {
            const line1 = address.substring(0, 30);
            const line2 = address.substring(30, 60);
            ctx.fillText(line1, valueX, 445);
            ctx.font = 'bold 20px Arial';
            ctx.fillText(line2, valueX, 445);
          } else {
            ctx.fillText(address, valueX, 445);
          }

          // Contact Number - Y position 448 (eighth field)
          ctx.font = 'bold 20px Arial';
          const contactNo = student.contact_no || student.phone || student.mobile || 'N/A';
          ctx.fillText(contactNo, valueX, 482);

          // Convert canvas to base64 image
          const idCardImage = canvas.toDataURL('image/png');
          resolve(idCardImage);
        }
      };

      templateImg.onerror = (error) => {
        console.error('❌ [TEMPLATE] Failed to load ID card template:', error);
        console.error('Template URL was:', templateUrl);
        reject(new Error('Failed to load ID card template. Please ensure the template exists in uploads/id card/idcard.png'));
      };

    } catch (error) {
      console.error('Error generating ID card:', error);
      reject(error);
    }
  });
};

/**
 * Generate ID cards for multiple students
 * @param {Array} students - Array of student data
 * @param {Object} branchData - Branch information
 * @returns {Promise<Array>} - Array of generated ID card images
 */
export const generateBulkIdCards = async (students, branchData = {}) => {
  const idCards = [];

  for (const student of students) {
    try {
      const idCard = await generateIdCard(student, branchData);
      idCards.push({
        studentId: student.id,
        studentName: student.student_name,
        image: idCard
      });
    } catch (error) {
      console.error(`Failed to generate ID card for ${student.student_name}:`, error);
      idCards.push({
        studentId: student.id,
        studentName: student.student_name,
        error: error.message
      });
    }
  }

  return idCards;
};

/**
 * Print ID card
 * @param {string} idCardImage - Base64 encoded image
 */
export const printIdCard = (idCardImage) => {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print ID Card</title>
        <style>
          @media print {
            @page {
              size: 3.375in 2.125in;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            img {
              width: 100%;
              height: 100%;
              display: block;
            }
          }
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          img {
            max-width: 100%;
            border: 1px solid #ccc;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <img src="${idCardImage}" alt="Student ID Card" />
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Print multiple ID cards
 * @param {Array} idCardImages - Array of base64 encoded images
 */
export const printBulkIdCards = (idCardImages) => {
  const printWindow = window.open('', '_blank');
  const imagesHtml = idCardImages.map(img => `
    <div class="id-card-page">
      <img src="${img}" alt="Student ID Card" />
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print ID Cards</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 0.5cm;
            }
            .id-card-page {
              page-break-after: always;
              page-break-inside: avoid;
            }
            .id-card-page:last-child {
              page-break-after: auto;
            }
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .id-card-page {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          img {
            max-width: 100%;
            border: 1px solid #ccc;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        ${imagesHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Download ID card as image
 * @param {string} idCardImage - Base64 encoded image
 * @param {string} fileName - File name for download
 */
export const downloadIdCard = (idCardImage, fileName = 'id-card.png') => {
  const link = document.createElement('a');
  link.href = idCardImage;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Helper function to convert image URL to base64
 * @param {string} url - Image URL
 * @returns {Promise<string>} - Base64 encoded image
 */
const imageUrlToBase64 = (url, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    console.log('🔄 [IMAGE LOAD] Converting to base64:', url);

    const timeoutId = setTimeout(() => {
      console.error('❌ [IMAGE LOAD] Timeout loading image:', url);
      reject(new Error('Image load timeout'));
    }, timeout);

    const img = new Image();

    // Try without CORS first for same-origin images
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      clearTimeout(timeoutId);
      console.log('✅ [IMAGE LOAD] Successfully loaded image, dimensions:', img.width, 'x', img.height);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      try {
        const dataURL = canvas.toDataURL('image/png');
        console.log('✅ [IMAGE LOAD] Successfully converted to base64');
        resolve(dataURL);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ [IMAGE LOAD] Failed to convert to base64:', error);
        reject(error);
      }
    };

    img.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error('❌ [IMAGE LOAD] Failed to load image:', url, error);

      // Try without CORS as backup
      console.log('🔄 [IMAGE LOAD] Trying without CORS...');
      const fallbackImg = new Image();

      const fallbackTimeout = setTimeout(() => {
        console.error('❌ [IMAGE LOAD] Fallback timeout');
        reject(new Error('Fallback image load timeout'));
      }, timeout);

      fallbackImg.onload = () => {
        clearTimeout(fallbackTimeout);
        console.log('✅ [IMAGE LOAD] Fallback load successful, dimensions:', fallbackImg.width, 'x', fallbackImg.height);
        const canvas = document.createElement('canvas');
        canvas.width = fallbackImg.width;
        canvas.height = fallbackImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(fallbackImg, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          console.log('✅ [IMAGE LOAD] Fallback conversion successful');
          resolve(dataURL);
        } catch (fallbackError) {
          clearTimeout(fallbackTimeout);
          console.error('❌ [IMAGE LOAD] Fallback conversion failed:', fallbackError);
          reject(fallbackError);
        }
      };

      fallbackImg.onerror = (fallbackError) => {
        clearTimeout(fallbackTimeout);
        console.error('❌ [IMAGE LOAD] Fallback also failed:', fallbackError);
        reject(new Error('Both primary and fallback image loading failed'));
      };

      fallbackImg.src = url;
    };

    img.src = url;
  });
};

/**
 * Helper function to format date
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Helper function to wrap text to fit within a maximum width
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width in pixels
 * @returns {Array<string>} - Array of text lines
 */
const wrapText = (ctx, text, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

export default {
  generateIdCard,
  generateBulkIdCards,
  printIdCard,
  printBulkIdCards,
  downloadIdCard
};
