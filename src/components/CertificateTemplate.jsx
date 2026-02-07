import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';

const CertificateTemplate = ({
  studentName = "EMMA THOMPSON",
  courseName = "Diploma in Digital Marketing",
  instructorName = "",
  courseDuration = "",
  completionDate = "",
  certificateId = "",
  certificateNumber = "", // New prop for formatted certificate number
  logoUrl = "/logo.png",
  londonLogoUrl = "/LondonLogo.png",
  directorSignatureUrl = "",
  qrCodeUrl = ""
}) => {
  const certificateRef = useRef(null);

  // Use certificateNumber if available, otherwise fall back to certificateId
  const displayCertificateId = certificateNumber || certificateId;

  // Generate QR code data - URL to verify the certificate
  const qrCodeData = displayCertificateId 
    ? `https://www.skillwallahedtech.com/verify/${displayCertificateId}` 
    : "https://www.skillwallahedtech.com/verify";

  // Function to download certificate as image
  const handleDownload = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2, // Higher quality
        useCORS: true, // Allow cross-origin images
        backgroundColor: '#f9f3e3'
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fileName = `Certificate_${studentName.replace(/\s+/g, '_')}_${certificateId || 'download'}.png`;
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to download certificate. Please try again.');
    }
  };
  return (
    <div className="w-full flex flex-col items-center justify-center p-4 bg-gray-100">
      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="mb-4 px-6 py-2 bg-[#3f51b5] hover:bg-[#2c3a8f] text-white font-semibold rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Download Certificate
      </button>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Great+Vibes&family=Montserrat:wght@700;800;900&family=Poppins:wght@400;600&family=Roboto+Condensed:wght@300;400&family=Dancing+Script:wght@400;500&family=Bebas+Neue&family=Oswald:wght@700&display=swap');
          
          @font-face {
            font-family: 'Video Bold';
            src: url('/fonts/Video-Bold.ttf') format('truetype'),
                 url('/fonts/Video-Bold.woff') format('woff'),
                 url('/fonts/Video-Bold.woff2') format('woff2');
            font-weight: 700;
            font-style: normal;
            font-display: swap;
          }
          
          @font-face {
            font-family: 'Outfielder Personal Use';
            src: url('/fonts/Outfielder-Personal-Use.ttf') format('truetype'),
                 url('/fonts/Outfielder-Personal-Use.woff') format('woff'),
                 url('/fonts/Outfielder-Personal-Use.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          
          @media print {
            body { margin: 0; }
            .certificate-container { 
              width: 297mm; 
              height: 210mm; 
              page-break-after: always;
            }
          }
          
          .corner-decoration {
            position: absolute;
            width: 80px;
            height: 80px;
          }
          
          .corner-decoration::before,
          .corner-decoration::after {
            content: '';
            position: absolute;
            background: #d4af37;
          }
          
          .corner-tl { top: 15px; left: 15px; }
          .corner-tr { top: 15px; right: 15px; }
          .corner-bl { bottom: 15px; left: 15px; }
          .corner-br { bottom: 15px; right: 15px; }
          
          .corner-tl::before {
            width: 60px;
            height: 3px;
            top: 0;
            left: 0;
            border-radius: 2px;
          }
          .corner-tl::after {
            width: 3px;
            height: 60px;
            top: 0;
            left: 0;
            border-radius: 2px;
          }
          
          .corner-tr::before {
            width: 60px;
            height: 3px;
            top: 0;
            right: 0;
            border-radius: 2px;
          }
          .corner-tr::after {
            width: 3px;
            height: 60px;
            top: 0;
            right: 0;
            border-radius: 2px;
          }
          
          .corner-bl::before {
            width: 60px;
            height: 3px;
            bottom: 0;
            left: 0;
            border-radius: 2px;
          }
          .corner-bl::after {
            width: 3px;
            height: 60px;
            bottom: 0;
            left: 0;
            border-radius: 2px;
          }
          
          .corner-br::before {
            width: 60px;
            height: 3px;
            bottom: 0;
            right: 0;
            border-radius: 2px;
          }
          .corner-br::after {
            width: 3px;
            height: 60px;
            bottom: 0;
            right: 0;
            border-radius: 2px;
          }
          
          .scroll-ornament-tl,
          .scroll-ornament-tr,
          .scroll-ornament-bl,
          .scroll-ornament-br {
            position: absolute;
            width: 50px;
            height: 50px;
            border: 3px solid #d4af37;
            border-radius: 50%;
          }
          
          .scroll-ornament-tl { 
            top: 0; 
            left: 0; 
            border-right: none;
            border-bottom: none;
          }
          .scroll-ornament-tr { 
            top: 0; 
            right: 0; 
            border-left: none;
            border-bottom: none;
          }
          .scroll-ornament-bl { 
            bottom: 0; 
            left: 0; 
            border-right: none;
            border-top: none;
          }
          .scroll-ornament-br { 
            bottom: 0; 
            right: 0; 
            border-left: none;
            border-top: none;
          }
          
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.08;
            width: 450px;
            height: 450px;
            pointer-events: none;
            z-index: 0;
          }
          
          .watermark img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
        `}
      </style>

      {/* Certificate Container - A4 Landscape */}
      <div ref={certificateRef} className="certificate-container relative w-[297mm] h-[210mm] bg-[#f9f3e3] shadow-2xl">
        {/* Watermark Logo */}
        <div className="watermark">
          <img src={logoUrl} alt="Watermark" />
        </div>

        {/* Outer Border */}
        <div className="absolute inset-[12px] border-[4px] border-[#d4af37] rounded-sm">
          {/* Inner Border */}
          <div className="absolute inset-[8px] border-[3px] border-[#d4af37] rounded-sm">
            {/* Corner Decorations */}
            <div className="corner-decoration corner-tl"></div>
            <div className="corner-decoration corner-tr"></div>
            <div className="corner-decoration corner-bl"></div>
            <div className="corner-decoration corner-br"></div>
            
            {/* Scroll Ornaments */}
            <div className="scroll-ornament-tl"></div>
            <div className="scroll-ornament-tr"></div>
            <div className="scroll-ornament-bl"></div>
            <div className="scroll-ornament-br"></div>

            {/* Content Container */}
            <div className="relative h-full flex flex-col px-16 py-8 z-10">
              {/* Header with Logo and School Name */}
              <div className="flex items-center justify-center mb-4">
                <img 
                  src={londonLogoUrl} 
                  alt="Skill Wallah EdTech Logo" 
                  className="h-20 object-contain"
                />
              </div>

              {/* Main Title */}
            <div className="text-center mb-2 mt-6">
  <h1
    className="text-3xl font-bold text-[#2c2c2c] mb-4"
    style={{
    fontFamily: "Outfielder Personal Use",
    fontSize: '48px',
    color: 'black',
    textAlign: 'center',
    letterSpacing: '0.02em',
    textShadow: '1px 1px 3px rgba(0,0,0,0.2)',
  }}
>
    CERTIFICATE OF COMPLETION
  </h1>
</div>

              {/* Certificate Body */}
              <div className="flex-1 flex flex-col items-center text-center space-y-1 mb-4">
                <p 
                  className="text-4xl text-[#2c2c2c]"
                  style={{ fontFamily: "'Great Vibes', cursive" }}
                >
                  This certificate is proudly presented to
                </p>

                <h2 
                  className="text-4xl font-black text-[#3f51b5] tracking-wide my-2 px-8 py-2"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}
                >
                  {studentName}
                </h2>

                <p 
                  className="text-3xl text-[#2c2c2c]"
                  style={{ fontFamily: "'Dancing Script', cursive" }}
                >
                  who has successfully completed the online course
                </p>

                <h3 
                  className="text-3xl font-semibold text-[#3f51b5] mt-2"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {courseName}
                </h3>

                <div className="mt-4">
                  <p 
                    className="text-base text-[#2c2c2c]"
                    style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                  >
                    <span className="font-semibold">Certificate Id :</span> {displayCertificateId}
                  </p>
                </div>
              </div>

              {/* Footer Section */}
              <div className="grid grid-cols-3 gap-8 items-end pt-4">
                {/* Left: Instructor Details */}
                <div className="text-left space-y-1" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                  <div className="text-sm">
                    <span className="font-semibold">Instructor Name :</span> {instructorName}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Course Duration :</span> {courseDuration}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Completion Date :</span> {completionDate}
                  </div>
                </div>

                {/* Center: QR Code */}
                <div className="flex flex-col items-center justify-center">
                  <p className="text-sm font-semibold mb-2" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                    Verify Certificate
                  </p>
                  <div className="w-24 h-24 border-2 border-black flex items-center justify-center bg-white p-1">
                    <QRCode 
                      value={qrCodeData}
                      size={88}
                      level="H"
                    />
                  </div>
                </div>

                {/* Right: Director Signature */}
                <div className="flex flex-col items-end">
                  <div className="border-t-2 border-black w-48 mb-1">
                    <p className="text-sm text-center mt-1 font-semibold" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                      Director Signature
                    </p>
                  </div>
                  {directorSignatureUrl && (
                    <img src={directorSignatureUrl} alt="Signature" className="h-12 mb-2" />
                  )}
                  <div className="flex items-center justify-end mt-2">
                    <img 
                      src={londonLogoUrl} 
                      alt="Skill Wallah EdTech Logo" 
                      className="h-12 object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Address */}
              <div className="text-center mt-3 pt-2 border-t border-[#d4af37]">
                <p className="text-[11px] text-[#2c2c2c] font-bold" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                  <span className="font-semibold">Registered Office Address:</span> Noida Sector 63, UP
                  <span className="ml-4"><span className="font-semibold">Website:</span> www.skillwallahedtech.com</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateTemplate;
