"""
ID Card Service - Handles ID card generation for students
"""

import os
import logging
import requests
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

# ID Card template paths
ID_CARD_TEMPLATE_DIR = "uploads/id card"
ID_CARD_OUTPUT_DIR = "uploads/id_cards"

def get_id_card_template_path(branch_code: str = None) -> str:
    """Get the appropriate ID card template path"""
    if branch_code:
        branch_template = os.path.join(ID_CARD_TEMPLATE_DIR, f"idcard_{branch_code}.png")
        if os.path.exists(branch_template):
            return branch_template
    
    default_template = os.path.join(ID_CARD_TEMPLATE_DIR, "idcard_branch_default.png")
    if os.path.exists(default_template):
        return default_template
    
    return os.path.join(ID_CARD_TEMPLATE_DIR, "idcard.png")


def generate_id_card_image(student_data: dict, branch_info: dict, output_path: str) -> bool:
    """
    Generate ID card image using template with student data
    
    Args:
        student_data: Dictionary containing student information
            - student_name: Student's full name
            - student_registration: Registration number
            - course_name: Course name
            - course_duration: Course duration
            - contact_number: Contact number
            - photo_url: URL or path to student photo
        branch_info: Dictionary containing branch information
            - centre_name: Center/branch name
            - branch_code: Branch code for template selection
            - logo_url: Path to branch logo
        output_path: Path where the generated ID card will be saved
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        logger.info(f"[ID CARD] Starting ID card generation for: {student_data.get('student_name', 'Unknown')}")
        
        # Get branch code for template selection
        branch_code = branch_info.get('branch_code', '')
        
        # Get template path
        template_path = get_id_card_template_path(branch_code)
        
        if not os.path.exists(template_path):
            logger.error(f"[ID CARD] Template not found at: {template_path}")
            return False
        
        logger.info(f"[ID CARD] Using template: {template_path}")
        
        # Load template image
        template = Image.open(template_path)
        template = template.convert("RGBA")
        id_card = template.copy()
        draw = ImageDraw.Draw(id_card)
        
        logger.info(f"[ID CARD] Template loaded. Size: {template.size}")
        
        # Try to load fonts
        try:
            font_name = ImageFont.truetype("arial.ttf", 16)
            font_label = ImageFont.truetype("arial.ttf", 12)
            font_small = ImageFont.truetype("arial.ttf", 10)
        except:
            font_name = ImageFont.load_default()
            font_label = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Extract student data
        student_name = student_data.get('student_name', '') or ''
        registration_number = student_data.get('student_registration', '') or ''
        course_name = student_data.get('course_name', '') or ''
        course_duration = student_data.get('course_duration', '') or ''
        contact_number = student_data.get('contact_number', '') or ''
        photo_url = student_data.get('photo_url', '') or ''
        
        # Extract branch info
        centre_name = branch_info.get('centre_name', '') or branch_info.get('center_name', '') or ''
        logo_url = branch_info.get('logo_url', '') or ''
        
        # Position coordinates for template
        # Left side - Photo area
        photo_x, photo_y = 30, 120
        photo_size = (100, 120)
        
        # Right side - Text area
        text_start_x = 150
        text_start_y = 100
        line_height = 22
        
        # Draw student information
        y_pos = text_start_y
        
        # Name
        draw.text((text_start_x, y_pos), f"Name: {student_name}", fill='black', font=font_name)
        y_pos += line_height
        
        # Registration Number
        draw.text((text_start_x, y_pos), f"Reg No: {registration_number}", fill='black', font=font_label)
        y_pos += line_height
        
        # Course
        draw.text((text_start_x, y_pos), f"Course: {course_name}", fill='black', font=font_label)
        y_pos += line_height
        
        # Duration
        if course_duration:
            draw.text((text_start_x, y_pos), f"Duration: {course_duration}", fill='black', font=font_label)
            y_pos += line_height
        
        # Contact
        if contact_number:
            draw.text((text_start_x, y_pos), f"Contact: {contact_number}", fill='black', font=font_label)
            y_pos += line_height
        
        # Centre name at bottom
        if centre_name:
            draw.text((text_start_x, y_pos + 10), f"Centre: {centre_name}", fill='darkblue', font=font_label)
        
        # Add student photo if available
        if photo_url and photo_url.strip():
            try:
                logger.info(f"[ID CARD] Loading student photo from: {photo_url}")
                
                # Check if it's a local file or URL
                if photo_url.startswith('http'):
                    response = requests.get(photo_url, timeout=10)
                    photo = Image.open(BytesIO(response.content))
                elif os.path.exists(photo_url):
                    photo = Image.open(photo_url)
                else:
                    # Try with uploads prefix
                    local_path = os.path.join("uploads", photo_url.lstrip('/'))
                    if os.path.exists(local_path):
                        photo = Image.open(local_path)
                    else:
                        logger.warning(f"[ID CARD] Photo file not found: {photo_url}")
                        photo = None
                
                if photo:
                    photo = photo.convert("RGBA")
                    photo = photo.resize(photo_size, Image.Resampling.LANCZOS)
                    id_card.paste(photo, (photo_x, photo_y), photo if photo.mode == 'RGBA' else None)
                    logger.info("[ID CARD] Student photo added successfully")
            except Exception as e:
                logger.error(f"[ID CARD] Could not add student photo: {e}")
        else:
            logger.info("[ID CARD] No photo URL provided for student")
        
        # Add branch logo if available
        if logo_url and logo_url.strip():
            try:
                if os.path.exists(logo_url):
                    logo = Image.open(logo_url)
                    logo = logo.convert("RGBA")
                    logo = logo.resize((60, 60), Image.Resampling.LANCZOS)
                    id_card.paste(logo, (680, 10), logo if logo.mode == 'RGBA' else None)
                    logger.info(f"[ID CARD] Branch logo added: {logo_url}")
            except Exception as e:
                logger.error(f"[ID CARD] Could not add logo: {e}")
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Convert back to RGB for saving as PNG
        id_card = id_card.convert("RGB")
        
        # Save the ID card
        id_card.save(output_path, 'PNG', quality=95)
        logger.info(f"[ID CARD] ID card saved successfully: {output_path}")
        
        return True
        
    except Exception as e:
        logger.error(f"[ID CARD] Error generating ID card image: {e}")
        import traceback
        logger.error(f"[ID CARD] Traceback: {traceback.format_exc()}")
        return False
