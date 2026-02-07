import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from typing import List, Optional, Dict, Any
from datetime import datetime

class EmailService:
    def __init__(self):
        # SMTP Configuration - You can set these via environment variables
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "arzumehreen050@gmail.com")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "cpus ctsa fdtm dmqs")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.from_name = os.getenv("FROM_NAME", "Skill Wallah LMS")

    def send_email(self, to_emails: List[str], subject: str, body: str, 
                   html_body: Optional[str] = None, attachments: Optional[List[str]] = None) -> bool:
       
        try:
            
            # Create message container
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = ', '.join(to_emails)
            
            # Add body to email
            text_part = MIMEText(body, 'plain', 'utf-8')
            msg.attach(text_part)
            
            # Add HTML body if provided
            if html_body:
                html_part = MIMEText(html_body, 'html', 'utf-8')
                msg.attach(html_part)
            
            # Add attachments if provided
            if attachments:
                for file_path in attachments:
                    if os.path.isfile(file_path):
                        with open(file_path, "rb") as attachment:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(attachment.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename= {os.path.basename(file_path)}'
                            )
                            msg.attach(part)
            
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()  # Enable security
            
            print(f"[DEBUG] EmailService: Logging in with username: {self.smtp_username}")
            server.login(self.smtp_username, self.smtp_password)
            
            # Send email
            text = msg.as_string()
            print(f"[DEBUG] EmailService: Sending email...")
            server.sendmail(self.from_email, to_emails, text)
            server.quit()
            
            print(f"[DEBUG] EmailService: Email sent successfully to {to_emails}")
            return True
            
        except Exception as e:
            print(f"[DEBUG] EmailService: Failed to send email: {str(e)}")
            import traceback
            print(f"[DEBUG] EmailService: Full error traceback: {traceback.format_exc()}")
            return False

    def send_welcome_email(self, user_email: str, user_name: str, user_role: str) -> bool:
        """Send welcome email to new user"""
        subject = f"Welcome to Skill Wallah LMS - {user_role.title()} Account Created"
        
        body = f"""
        Hello {user_name},
        
        Welcome to Skill Wallah LMS! Your {user_role} account has been successfully created.
        
        You can now access the platform at: http://localhost:6788
        
        If you have any questions, please don't hesitate to contact our support team.
        
        Best regards,
        Skill Wallah LMS Team
        """
        
        return self.send_email([user_email], subject, body)

    def send_course_enrollment_email(self, user_email: str, user_name: str, course_title: str) -> bool:
        """Send course enrollment confirmation email"""
        subject = f"Course Enrollment Confirmation - {course_title}"
        
        body = f"""
        Hello {user_name},
        
        Congratulations! You have successfully enrolled in the course: {course_title}
        
        You can access your course materials at: http://localhost:6788/courses
        
        Happy learning!
        
        Best regards,
        Skill Wallah LMS Team
        """
        
        return self.send_email([user_email], subject, body)

    def send_assignment_notification(self, user_email: str, user_name: str, assignment_title: str, due_date: str) -> bool:
        """Send assignment notification email"""
        subject = f"New Assignment: {assignment_title}"
        
        body = f"""
        Hello {user_name},
        
        A new assignment has been posted: {assignment_title}
        
        Due Date: {due_date}
        
        Please log in to your dashboard to view the assignment details and submit your work.
        
        Access your dashboard at: http://localhost:6788
        
        Best regards,
        Skill Wallah LMS Team
        """
        
        return self.send_email([user_email], subject, body)

# Create a global instance for easy importing
email_service = EmailService()