import { baseUrl } from "./base_utl";



export const otpVerificationEmailTamplate = (OTP: string): string => {
  return `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Account Verification</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          "Helvetica Neue", Arial, sans-serif;
        background-color: #ffffff;
        color: #1a1a1a;
        line-height: 1.5;
        padding: 60px 20px;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .email-container {
        max-width: 480px;
        margin: 0 auto;
        background-color: #ffffff;
        text-align: center;
      }

      .logo-section {
        margin-bottom: 48px;
      }

      .logo img {
        width: 96px;
        height: 96px;
        margin-top: 50px;
      }

      .logo {
        margin: 0 auto 24px;
      }

      .brand-name {
        font-size: 18px; /* Increased font size */
        font-weight: 700; /* Bolded text */
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px; /* Increased margin */
      }

      .title {
        font-size: 36px; /* Increased font size */
        font-weight: 700;
        color: #111827;
        margin-bottom: 56px;
        letter-spacing: -0.75px;
      }

      .message {
        font-size: 18px; /* Increased font size */
        color: #374151;
        margin-bottom: 48px;
        line-height: 1.6;
        font-weight: 400;
      }

      .message strong {
        color: #111827;
        font-weight: 600;
      }

      .otp-section {
        margin: 20px 0;
        padding: 48px 32px;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-radius: 20px;
        border: 1px solid #e5e7eb;
        position: relative;
      }

      .otp-section::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
        border-radius: 20px 20px 0 0;
      }

      .otp-label {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        font-weight: 600;
        margin-bottom: 24px;
      }

      .otp-code {
        font-size: 48px; /* Increased OTP font size */
        font-weight: 800;
        color: #1e40af;
        letter-spacing: 12px;
        font-family: "SF Mono", "Monaco", "Consolas", "Liberation Mono",
          "Courier New", monospace;
        margin: 20px 0;
        text-shadow: 0 2px 4px rgba(30, 64, 175, 0.1);
      }

      .otp-validity {
        font-size: 14px; /* Slightly increased font size */
        color: #9ca3af;
        font-weight: 500;
        margin-top: 16px;
      }

      .divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
        margin: 48px 0;
      }

      .footer {
        margin-top: 10px;
      }

      .company-info {
        font-size: 16px; /* Increased font size */
        color: #374151;
        font-weight: 600;
        margin-bottom: 5px;
      }

      .support-section {
        font-size: 14px;
        color: #6b7280;
      }

      .support-link {
        color: #3b82f6;
        text-decoration: none;
        font-weight: 600;
        transition: color 0.2s ease;
      }

      .support-link:hover {
        color: #1e40af;
        text-decoration: underline;
      }

      .copyright {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 10px;
        font-weight: 400;
      }

      @media (max-width: 600px) {
        body {
          padding: 40px 16px;
        }

        .title {
          font-size: 26px;
        }

        .message {
          font-size: 15px;
        }

        .otp-code {
          font-size: 36px;
          letter-spacing: 8px;
        }

        .otp-section {
          padding: 36px 24px;
          margin: 40px 0;
        }

        .logo {
          width: 80px;
          height: 80px;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="logo-section">
        <div class="logo">
          <img
            src="https://i.ibb.co/PnpnPd5/hamza.png"
            alt="Left Seat Lessons"
          />
        </div>
        <div class="brand-name">Left Seat Lessons</div>
      </div>

      <h1 class="title">Account Verification</h1>

      <p class="message">
        Please use the verification code below to complete your account setup.
      </p>

      <div class="otp-section">
        <div class="otp-label">Verification Code</div>
        <div class="otp-code">${OTP}</div>
        <div class="otp-validity">Expires in 10 minutes</div>
      </div>

      <div class="divider"></div>

      <div class="footer">
        <div class="company-info">Left Seat Lessons</div>

        <div class="copyright">
          © 2025 Left Seat Lessons. All rights reserved.
        </div>
      </div>
    </div>
  </body>
</html>

  `;
};

export const emailForgotPasswordOTP = (OTP: string): string => { 
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Password Reset Verification</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #ffffff;
            color: #1a1a1a;
            line-height: 1.5;
            padding: 60px 20px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          .email-container {
            max-width: 480px;
            margin: 0 auto;
            background-color: #ffffff;
            text-align: center;
          }

          .logo-section {
            margin-bottom: 48px;
          }

          .logo img {
            width: 96px;
            height: 96px;
            margin-top: 50px;
          }

          .logo {
            margin: 0 auto 24px;
          }

          .brand-name {
            font-size: 18px; /* Increased font size */
            font-weight: 700; /* Bolded text */
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px; /* Increased margin */
          }

          .title {
            font-size: 36px; /* Increased font size */
            font-weight: 700;
            color: #111827;
            margin-bottom: 56px;
            letter-spacing: -0.75px;
          }

          .message {
            font-size: 18px; /* Increased font size */
            color: #374151;
            margin-bottom: 48px;
            line-height: 1.6;
            font-weight: 400;
          }

          .message strong {
            color: #111827;
            font-weight: 600;
          }

          .otp-section {
            margin: 20px 0;
            padding: 48px 32px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 20px;
            border: 1px solid #e5e7eb;
            position: relative;
          }

          .otp-section::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
            border-radius: 20px 20px 0 0;
          }

          .otp-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 600;
            margin-bottom: 24px;
          }

          .otp-code {
            font-size: 48px; /* Increased OTP font size */
            font-weight: 800;
            color: #1e40af;
            letter-spacing: 12px;
            font-family: "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace;
            margin: 20px 0;
            text-shadow: 0 2px 4px rgba(30, 64, 175, 0.1);
          }

          .otp-validity {
            font-size: 14px; /* Slightly increased font size */
            color: #9ca3af;
            font-weight: 500;
            margin-top: 16px;
          }

          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: 48px 0;
          }

          .footer {
            margin-top: 10px;
          }

          .company-info {
            font-size: 16px; /* Increased font size */
            color: #374151;
            font-weight: 600;
            margin-bottom: 5px;
          }

          .support-section {
            font-size: 14px;
            color: #6b7280;
          }

          .support-link {
            color: #3b82f6;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.2s ease;
          }

          .support-link:hover {
            color: #1e40af;
            text-decoration: underline;
          }

          .copyright {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 10px;
            font-weight: 400;
          }

          @media (max-width: 600px) {
            body {
              padding: 40px 16px;
            }

            .title {
              font-size: 26px;
            }

            .message {
              font-size: 15px;
            }

            .otp-code {
              font-size: 36px;
              letter-spacing: 8px;
            }

            .otp-section {
              padding: 36px 24px;
              margin: 40px 0;
            }

            .logo {
              width: 80px;
              height: 80px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo-section">
            <div class="logo">
              <img
                src="https://i.ibb.co/PnpnPd5/hamza.png"
                alt="Left Seat Lessons"
              />
            </div>
            <div class="brand-name">Left Seat Lessons</div>
          </div>

          <h1 class="title">Password Reset Verification</h1>

          <p class="message">
            Please use the verification code below to complete your account setup.
          </p>

          <div class="otp-section">
            <div class="otp-label">Verification Code</div>
            <div class="otp-code">${OTP}</div>
            <div class="otp-validity">Expires in 10 minutes</div>
          </div>

          <div class="divider"></div>

          <div class="footer">
            <div class="company-info">Left Seat Lessons</div>

            <div class="copyright">
              © 2025 Left Seat Lessons. All rights reserved.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const recentOtpVerificationEmail = (OTP: string): string => { 
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Recent OTP Verification</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #ffffff;
            color: #1a1a1a;
            line-height: 1.5;
            padding: 60px 20px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          .email-container {
            max-width: 480px;
            margin: 0 auto;
            background-color: #ffffff;
            text-align: center;
          }

          .logo-section {
            margin-bottom: 48px;
          }

          .logo img {
            width: 96px;
            height: 96px;
            margin-top: 50px;
          }

          .logo {
            margin: 0 auto 24px;
          }

          .brand-name {
            font-size: 18px; /* Increased font size */
            font-weight: 700; /* Bolded text */
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px; /* Increased margin */
          }

          .title {
            font-size: 36px; /* Increased font size */
            font-weight: 700;
            color: #111827;
            margin-bottom: 56px;
            letter-spacing: -0.75px;
          }

          .message {
            font-size: 18px; /* Increased font size */
            color: #374151;
            margin-bottom: 48px;
            line-height: 1.6;
            font-weight: 400;
          }

          .message strong {
            color: #111827;
            font-weight: 600;
          }

          .otp-section {
            margin: 20px 0;
            padding: 48px 32px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 20px;
            border: 1px solid #e5e7eb;
            position: relative;
          }

          .otp-section::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
            border-radius: 20px 20px 0 0;
          }

          .otp-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 600;
            margin-bottom: 24px;
          }

          .otp-code {
            font-size: 48px; /* Increased OTP font size */
            font-weight: 800;
            color: #1e40af;
            letter-spacing: 12px;
            font-family: "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace;
            margin: 20px 0;
            text-shadow: 0 2px 4px rgba(30, 64, 175, 0.1);
          }

          .otp-validity {
            font-size: 14px; /* Slightly increased font size */
            color: #9ca3af;
            font-weight: 500;
            margin-top: 16px;
          }

          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: 48px 0;
          }

          .footer {
            margin-top: 10px;
          }

          .company-info {
            font-size: 16px; /* Increased font size */
            color: #374151;
            font-weight: 600;
            margin-bottom: 5px;
          }

          .support-section {
            font-size: 14px;
            color: #6b7280;
          }

          .support-link {
            color: #3b82f6;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.2s ease;
          }

          .support-link:hover {
            color: #1e40af;
            text-decoration: underline;
          }

          .copyright {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 10px;
            font-weight: 400;
          }

          @media (max-width: 600px) {
            body {
              padding: 40px 16px;
            }

            .title {
              font-size: 26px;
            }

            .message {
              font-size: 15px;
            }

            .otp-code {
              font-size: 36px;
              letter-spacing: 8px;
            }

            .otp-section {
              padding: 36px 24px;
              margin: 40px 0;
            }

            .logo {
              width: 80px;
              height: 80px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo-section">
            <div class="logo">
              <img
                src="https://i.ibb.co/PnpnPd5/hamza.png"
                alt="Left Seat Lessons"
              />
            </div>
            <div class="brand-name">Left Seat Lessons</div>
          </div>

          <h1 class="title">Recent OTP Verification</h1>

          <p class="message">
            A recent request was made to verify your account. Please use the verification code below to confirm the request.
          </p>

          <div class="otp-section">
            <div class="otp-label">Verification Code</div>
            <div class="otp-code">${OTP}</div>
            <div class="otp-validity">Expires in 10 minutes</div>
          </div>

          <div class="divider"></div>

          <div class="footer">
            <div class="company-info">Left Seat Lessons</div>

            <div class="copyright">
              © 2025 Left Seat Lessons. All rights reserved.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

 

export const instructorConformationsTamplate = (
  email: string,
  studentName: string,
  logDetails: any,
 
): string => {
  // Helper function to format values
  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '' || value === 0) {
      return 'Not specified';
    }
    return value.toString();
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Flight Log Submission</title>
      <style>
        /* Reset styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        /* Header */
        .header {
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
          opacity: 0.3;
        }
        
        .header-content {
          position: relative;
          z-index: 1;
        }
        
        .logo {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .logo img {
          max-width: 100%;
          height: auto;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        
        .header p {
          font-size: 16px;
          opacity: 0.9;
          margin: 0;
        }
        
        /* Content */
        .content {
          padding: 40px 30px;
        }
        
        .greeting {
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 24px;
        }
        
        .notification-card {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #0ea5e9;
          border-radius: 12px;
          padding: 24px;
          margin: 24px 0;
          position: relative;
        }
        
        .notification-card::before {
          content: '✈️';
          position: absolute;
          top: -15px;
          left: 24px;
          background: #0ea5e9;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        
        .notification-text {
          font-size: 16px;
          color: #0c4a6e;
          font-weight: 600;
          margin-top: 8px;
        }
        
        .student-name {
          color: #1e40af;
          font-weight: 700;
        }
        
        /* Flight Details Section */
        .details-section {
          margin: 32px 0;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 20px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
          position: relative;
        }
        
        .section-title::before {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 60px;
          height: 2px;
          background: linear-gradient(135deg, #3b82f6, #1e40af);
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .detail-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s ease;
        }
        
        .detail-item:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }
        
        .detail-label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        
        .detail-value {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .detail-value.highlight {
          color: #1e40af;
        }
        
        /* Single column items */
        .detail-item.full-width {
          grid-column: 1 / -1;
        }
        
        /* Action Section */
        .action-section {
          text-align: center;
          margin: 40px 0;
          padding: 32px;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border-radius: 12px;
          border: 1px solid #f59e0b;
        }
        
        .action-text {
          font-size: 16px;
          color: #92400e;
          margin-bottom: 24px;
          font-weight: 500;
        }
        
        .review-button {
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          color: white !important;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }
        
        .review-button:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          transform: translateY(-2px);
        }
        
        /* Status Badge */
        .status-badge {
          display: inline-block;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Best Regards Section */
        .regards-section {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }
        
        .regards-text {
          color: #6b7280;
          font-size: 16px;
          line-height: 1.5;
        }
        
        .team-name {
          color: #1f2937;
          font-weight: 600;
        }
        
        /* Simple Footer */
        .footer {
          background: #f8fafc;
          padding: 24px 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        
        .footer-content {
          max-width: 500px;
          margin: 0 auto;
        }
        
        .footer-text {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        
        .footer-email {
          font-weight: 600;
          color: #1e40af;
          text-decoration: none;
        }
        
        .footer-email:hover {
          text-decoration: underline;
        }
        
        .footer-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 16px 0;
        }
        
        .copyright {
          font-size: 12px;
          color: #9ca3af;
        }
        
        /* Responsive */
        @media only screen and (max-width: 600px) {
          .email-container {
            margin: 0;
            box-shadow: none;
          }
          
          .header, .content, .footer {
            padding-left: 20px;
            padding-right: 20px;
          }
          
          .details-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .header h1 {
            font-size: 24px;
          }
          
          .review-button {
            padding: 14px 24px;
            font-size: 14px;
          }
          
          .action-section {
            padding: 24px 20px;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .detail-item {
            background: #f1f5f9;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <div class="header-content">
            <div class="logo">
              <img src="https://i.ibb.co/PnpnPd5/hamza.png" alt="Flight Training Logo" width="80" height="80">
            </div>
            <h1>Flight Log Submission</h1>
            <p>New entry requires your review</p>
          </div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <div class="greeting">
            Dear Instructor,
          </div>
          
          <div class="notification-card">
            <div class="notification-text">
              Your student <span class="student-name">${studentName}</span> has submitted a new flight log entry that requires your review and approval.
            </div>
          </div>
          
          <!-- Flight Details -->
          <div class="details-section">
            <h3 class="section-title">Flight Details</h3>
            
            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">From</div>
                <div class="detail-value highlight">${formatValue(logDetails.from)}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">To</div>
                <div class="detail-value highlight">${formatValue(logDetails.to)}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Aircraft Type</div>
                <div class="detail-value">${formatValue(logDetails.aircrafttype)}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Tail Number</div>
                <div class="detail-value">${formatValue(logDetails.tailNumber)}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Flight Time</div>
                <div class="detail-value">${formatValue(logDetails.flightTime)} ${logDetails.flightTime && logDetails.flightTime > 0 ? 'hours' : ''}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">PIC Time</div>
                <div class="detail-value">${formatValue(logDetails.pictime)} ${logDetails.pictime && logDetails.pictime > 0 ? 'hours' : ''}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Day Time</div>
                <div class="detail-value">${formatValue(logDetails.daytime)} ${logDetails.daytime && logDetails.daytime > 0 ? 'hours' : ''}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Night Time</div>
                <div class="detail-value">${formatValue(logDetails.nightime)} ${logDetails.nightime && logDetails.nightime > 0 ? 'hours' : ''}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">IFR Time</div>
                <div class="detail-value">${formatValue(logDetails.ifrtime)} ${logDetails.ifrtime && logDetails.ifrtime > 0 ? 'hours' : ''}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Cross Country</div>
                <div class="detail-value">${formatValue(logDetails.crossCountry)} ${logDetails.crossCountry && logDetails.crossCountry > 0 ? 'nm' : ''}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Takeoffs</div>
                <div class="detail-value">${formatValue(logDetails.takeoffs)}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Landings</div>
                <div class="detail-value">${formatValue(logDetails.landings)}</div>
              </div>
              
              <div class="detail-item full-width">
                <div class="detail-label">Submission Date</div>
                <div class="detail-value">${new Date(logDetails.createdAt).toLocaleString()}</div>
              </div>
 
            </div>
          </div>
          
          <!-- Action Section -->
          
            <a href="${baseUrl}/addlog/review-log/${logDetails.id}" class="review-button">
              Review Log Entry →
            </a>
         
        </div>
        
        <!-- Simple Footer -->
        <div class="footer">
          <div class="footer-content">
 
            <div class="copyright">
              © ${new Date().getFullYear()} Flight Training System. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
