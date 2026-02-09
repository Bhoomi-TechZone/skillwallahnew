import os
import traceback
import requests
from io import BytesIO
from bson import ObjectId
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
from fastapi import HTTPException

# Base directory for static files (london_lms folder)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def generate_marksheet_id(db, issued_date=None):
    if issued_date is None:
        issued_date = datetime.utcnow()
    elif isinstance(issued_date, str):
        try:
            issued_date = datetime.fromisoformat(issued_date.replace('Z', '+00:00'))
        except:
            issued_date = datetime.utcnow()
    
    # Format: YYYYMMDD
    date_str = issued_date.strftime("%Y%m%d")
    
    # Find the highest counter for this date
    prefix_pattern = f"MARK{date_str}-"
    
    # Find all marksheets with this date prefix
    existing_marksheets = db.branch_marksheets.find({
        "marksheet_number": {"$regex": f"^{prefix_pattern}"}
    }).sort("marksheet_number", -1).limit(1)
    
    # Get the next counter
    counter = 1
    for marksheet in existing_marksheets:
        marksheet_num = marksheet.get("marksheet_number", "")
        if marksheet_num:
            try:
                # Extract the counter part (last 4 digits)
                last_part = marksheet_num.split("-")[-1]
                counter = int(last_part) + 1
            except:
                counter = 1
        break
    
    # Format the marksheet ID
    marksheet_id = f"MARK{date_str}-{counter:04d}"
    
    return marksheet_id

async def generate_marksheet_image(marksheet_data: dict, output_path: str) -> bool:
    """
    Generate marksheet image using template with student data
    Template Size: 1236 x 1600
    
    COORDINATE SYSTEM:
    LEFT  = x -
    RIGHT = x +
    UP    = y -
    DOWN  = y +
    """

    try:
        # ---------------------------------------
        # LOAD TEMPLATE
        # ---------------------------------------

        # Check if a custom template path is provided in the data
        custom_template_path = marksheet_data.get("template_path")
        
        if custom_template_path:
            # Clean up the path (remove leading slashes or excessive dots)
            clean_path = custom_template_path.replace("\\", "/").strip("/")
            
            # Remove 'london_lms/' prefix if present, as BASE_DIR usually points to project root
            if clean_path.startswith("london_lms/"):
                clean_path = clean_path.replace("london_lms/", "", 1)
                
            # Try multiple paths to find the template
            possible_template_paths = [
                os.path.join(BASE_DIR, clean_path),
                os.path.join(os.getcwd(), clean_path),
                clean_path,
                os.path.abspath(clean_path)
            ]
            
            template_path = None
            for path in possible_template_paths:
                print(f"[MARKSHEET] Checking template path: {path}")
                if os.path.exists(path):
                    template_path = path
                    print(f"[MARKSHEET] ✅ Found template at: {path}")
                    break
            
            if not template_path:
                 # If we couldn't find it, default to the first constructed path for the error message
                 template_path = os.path.join(BASE_DIR, clean_path)
                 print(f"[MARKSHEET] ❌ Template not found in any checked location")
                 raise FileNotFoundError(f"Marksheet template not found at {clean_path}")

            print(f"[MARKSHEET] Using final template path: {template_path}")
        else:
             # If no template path is provided, we raise an error instead of using a default
             raise FileNotFoundError("No template path provided in request data. Default template fallback has been disabled.")
        
        print(f"[MARKSHEET] Input data: {marksheet_data}")

        if not os.path.exists(template_path):
             raise FileNotFoundError(f"Marksheet template not found at {template_path}")

        img = Image.open(template_path).convert("RGB")
        draw = ImageDraw.Draw(img)
        width, height = img.size
        print(f"[MARKSHEET] Template size: {width}x{height}")

        # ---------------------------------------
        # FONTS
        # ---------------------------------------
        try:
            font_path = "C:/Windows/Fonts/arial.ttf"
            font_bold_path = "C:/Windows/Fonts/arialbd.ttf"
            font_large = ImageFont.truetype(font_bold_path, 20)
            font_medium = ImageFont.truetype(font_path, 16)
            font_small = ImageFont.truetype(font_path, 14)
            font_tiny = ImageFont.truetype(font_path, 12)
            font_table = ImageFont.truetype(font_path, 13)
        except:
            font_large = font_medium = font_small = font_tiny = font_table = ImageFont.load_default()

        text_color = (0, 0, 0)  # Black text
        white = (255, 255, 255)  # White text for blue cells

        # ---------------------------------------
        # DATA EXTRACTION
        # ---------------------------------------
        student_name = str(marksheet_data.get("student_name") or "")
        father_name = str(marksheet_data.get("father_name") or "")
        mother_name = str(marksheet_data.get("mother_name") or "")
        course_name = str(marksheet_data.get("course_name") or "")
        course_code = str(marksheet_data.get("course_code") or "")
        atc_name = str(marksheet_data.get("atc_name") or "")
        atc_address = str(marksheet_data.get("atc_address") or "")

        reg_number = str(marksheet_data.get("student_registration") or "")
        sr_number = str(marksheet_data.get("sr_number") or "")
        
        join_date = str(marksheet_data.get("join_date") or "")
        issue_date = str(marksheet_data.get("issue_date") or "")

        # Results data
        subjects = marksheet_data.get("subjects_results", [])
        total_marks = marksheet_data.get("total_marks", 0)
        obtained_marks = marksheet_data.get("obtained_marks", 0)
        percentage = marksheet_data.get("percentage", 0)
        grade = str(marksheet_data.get("grade") or "")

        print(f"[MARKSHEET] Student: {student_name}, Father: {father_name}, Course: {course_name}")
        print(f"[MARKSHEET] Subjects count: {len(subjects)}")

        # ---------------------------------------
        # HEADER SECTION (Top bar)
        # Sr. No.: (left top) and MCA Reg. No.: (right top)
        # ---------------------------------------
        # Sr. No. - position after "Sr. No.:" label
        draw.text((250, 122), sr_number, fill=text_color, font=font_small)
        # MCA Reg. No. - position after "MCA Reg. No.:" label on right
       
        # ---------------------------------------
        # STUDENT DETAILS SECTION (Middle section with form fields)
        # These positions are after the field labels (colon position)
        # ---------------------------------------
        # Name of Student: (row 1)
        draw.text((415, 560), student_name.upper(), fill=text_color, font=font_medium)
        
        # Father's Name: (row 2)
        draw.text((413, 600), father_name.upper(), fill=text_color, font=font_medium)
        
        # Mother's Name: (row 3)
        draw.text((423, 635), mother_name.upper(), fill=text_color, font=font_medium)
        
        # ATC: (row 4) - Authorized Training Centre
        draw.text((423, 670), atc_name.upper(), fill=text_color, font=font_small)
        # ATC Address on next line if exists
        if atc_address:
            draw.text((423, 690), atc_address.upper(), fill=text_color, font=font_tiny)
        
        # Course: (row 5)
        draw.text((420, 715), course_name.upper(), fill=text_color, font=font_medium)

        data_row_y = 780

        # Helper: try reducing font size so text fits in available width; if still too long, truncate with ellipsis.
        def fit_text(draw_ctx, text, base_font_path, start_size, max_width, min_size=8):
            if not text:
                return (font_small, text)
            # Try TrueType font resizing when possible
            try:
                f = None
                for size in range(start_size, min_size - 1, -1):
                    try:
                        f = ImageFont.truetype(base_font_path, size)
                    except Exception:
                        f = None
                        break
                    bbox = draw_ctx.textbbox((0, 0), text, font=f)
                    if bbox[2] <= max_width:
                        return (f, text)
                # If no size fits, truncate using the smallest font we could create (or fallback font)
                if f is None:
                    raise Exception("truetype not available")
                ell = "..."
                for l in range(len(text), 0, -1):
                    t = text[:l] + ell
                    try:
                        bbox = draw_ctx.textbbox((0, 0), t, font=f)
                        if bbox[2] <= max_width:
                            return (f, t)
                    except Exception:
                        continue
                return (f, text[:1] + ell)
            except Exception:
                # Fallback: use existing small font and truncate if necessary
                try:
                    bbox = draw_ctx.textbbox((0, 0), text, font=font_small)
                    if bbox[2] <= max_width:
                        return (font_small, text)
                except Exception:
                    pass
                ell = "..."
                for l in range(len(text), 0, -1):
                    t = text[:l] + ell
                    try:
                        bbox = draw_ctx.textbbox((0, 0), t, font=font_small)
                        if bbox[2] <= max_width:
                            return (font_small, t)
                    except Exception:
                        continue
                return (font_small, text[:1] + ell)

        # Course Code - first column (centered in cell)
        max_course_width = 480 - 350 - 10  # available pixels for course code
        if 'font_path' in locals():
            course_font, course_text = fit_text(draw, course_code, font_path, 13, max_course_width, min_size=8)
        else:
            course_font, course_text = (font_small, course_code)
        draw.text((370, data_row_y), course_text, fill=text_color, font=course_font)
        # Student ID/Reg Number - second column  
        max_reg_width = 680 - 480 - 10  # available pixels for reg number
        if 'font_path' in locals():
            reg_font, reg_text = fit_text(draw, reg_number, font_path, 13, max_reg_width, min_size=8)
        else:
            reg_font, reg_text = (font_small, reg_number)
        draw.text((490, data_row_y), reg_text, fill=text_color, font=reg_font)
        # Join Date - third column
        draw.text((660, data_row_y), join_date, fill=text_color, font=font_small)
        # Date of Issue - fourth column
        draw.text((800, data_row_y), issue_date, fill=text_color, font=font_small)
        
        print(f"[MARKSHEET] Blue bar data - Course: {course_code}, RegNo: {reg_number}, Join: {join_date}, Issue: {issue_date}")

        start_y = 920
        row_gap = 35

        total_theory_obt = 0
        total_theory_max = 0
        total_practical_obt = 0
        total_practical_max = 0

        for i, sub in enumerate(subjects[:5]):  # Max 5 subjects
            y = start_y + i * row_gap

            subject_name = str(sub.get("subject_name") or "")
            theory_obt = float(sub.get("theory_marks", 0))
            theory_max = float(sub.get("theory_max", 100))
            practical_obt = float(sub.get("practical_marks", 0))
            practical_max = float(sub.get("practical_max", 100))

            total_theory_obt += theory_obt
            total_theory_max += theory_max
            total_practical_obt += practical_obt
            total_practical_max += practical_max

            if subject_name:
                # Subject Name column
                draw.text((250, y), subject_name, fill=text_color, font=font_table)
                # Theory Obtained (Obt. column under Theory)
                draw.text((835, y+13), f"{theory_obt:.2f}", fill=text_color, font=font_table)
                # Theory Max (Max. column under Theory)
                draw.text((895, y+13), f"{int(theory_max)}", fill=text_color, font=font_table)
                # Practical Obtained (Obt. column under Practical)
                draw.text((955, y+13), f"{practical_obt:.2f}", fill=text_color, font=font_table)
                # Practical Max (Max. column under Practical)
                draw.text((1010, y+13), f"{int(practical_max)}", fill=text_color, font=font_table)

        summary_y = 1070
        
        # Grade (first box)
        draw.text((280, summary_y), grade, fill=text_color, font=font_medium)
        # Percentage (second box)
        draw.text((420, summary_y), f"{percentage:.2f}" if isinstance(percentage, (int, float)) else str(percentage), fill=text_color, font=font_medium)
        # Total Marks Obtained (third box)
        draw.text((560, summary_y), f"{obtained_marks:.2f}" if isinstance(obtained_marks, (int, float)) else str(obtained_marks), fill=text_color, font=font_medium)
        # Total Marks (fourth box)
        draw.text((720, summary_y), str(int(total_marks)) if isinstance(total_marks, (int, float)) else str(total_marks), fill=text_color, font=font_medium)

        # ---------------------------------------
        # STUDENT PHOTO (Right side of student details)
        # Position: approximately (1035, 430) based on template
        # ---------------------------------------
        photo_url = marksheet_data.get("photo_url") or ""
        print(f"[MARKSHEET] Photo URL received: {photo_url}")

        if photo_url and photo_url.strip():
            try:
                photo = None
                
                # Strip query parameters from photo URL to get actual file path
                # This prevents caching issues when the same URL has different query params
                clean_photo_url = photo_url.split('?')[0] if '?' in photo_url else photo_url
                print(f"[MARKSHEET] Clean photo URL (without query params): {clean_photo_url}")
                
                # Check if it's a URL (http/https)
                if clean_photo_url.startswith('http'):
                    print(f"[MARKSHEET] Loading photo from URL: {clean_photo_url}")
                    response = requests.get(clean_photo_url, timeout=10)
                    if response.status_code == 200:
                        # Load image from bytes to avoid caching
                        photo = Image.open(BytesIO(response.content))
                        print(f"[MARKSHEET] Photo loaded from HTTP URL successfully")
                    else:
                        print(f"[MARKSHEET] HTTP request failed with status: {response.status_code}")
                else:
                    # Local file - Server runs from london_lms folder
                    # So relative paths are from london_lms/
                    # photo_url could be: /uploads/student_photos/xxx.jpg
                    
                    # Get current working directory (should be london_lms)
                    cwd = os.getcwd()
                    print(f"[MARKSHEET] Current working directory: {cwd}")
                    
                    # Strip leading slash and normalize
                    clean_photo_path = clean_photo_url.lstrip("/").replace("\\", "/")
                    filename = os.path.basename(clean_photo_path)
                    
                    # Build possible paths
                    possible_paths = [
                        # Direct path from cwd (london_lms)
                        os.path.join(cwd, clean_photo_path),
                        # Using BASE_DIR
                        os.path.join(BASE_DIR, clean_photo_path),
                        # Just the clean path
                        clean_photo_path,
                        # uploads/student_photos folder directly
                        os.path.join(cwd, "uploads", "student_photos", filename),
                        os.path.join(BASE_DIR, "uploads", "student_photos", filename),
                        # Try without uploads prefix
                        os.path.join(cwd, "uploads", clean_photo_path.replace("uploads/", "")),
                    ]
                    
                    for path in possible_paths:
                        print(f"[MARKSHEET] Trying photo path: {path}")
                        if os.path.exists(path):
                            print(f"[MARKSHEET] ✅ Photo FOUND at: {path}")
                            # Open and immediately load to avoid file handle caching
                            with Image.open(path) as img:
                                photo = img.copy()  # Create a copy to avoid caching issues
                            break
                        else:
                            print(f"[MARKSHEET] ❌ Path not found: {path}")
                
                if photo:
                    photo = photo.convert("RGB")
                    # Photo size as per template (approx 110x140)
                    photo = photo.resize((110, 140), Image.Resampling.LANCZOS)
                    # Position: right side of student details section
                    img.paste(photo, (920, 550))
                    print(f"[MARKSHEET] Student photo added successfully")
                else:
                    print(f"[MARKSHEET] Photo file not found for any path")
                    
            except Exception as photo_err:
                print(f"[MARKSHEET] Error loading photo: {photo_err}")
        else:
            print(f"[MARKSHEET] No photo URL provided")

        # ---------------------------------------
        # SAVE GENERATED MARKSHEET
        # ---------------------------------------
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        img.save(output_path, "PNG", quality=100)

        return True

    except Exception as e:
        print(f"Error generating marksheet: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate marksheet image: {str(e)}"
        )

def issue_marksheet(db, payload):
    """
    Issue a new marksheet with unique marksheet number
    """
    issued_date = payload.get("issued_on") or datetime.utcnow().isoformat()
    
    # Generate unique marksheet number
    marksheet_number = generate_marksheet_id(db, issued_date)
    
    marksheet_doc = {
        "student_id": payload.get("student_id"),
        "course_id": payload.get("course_id"),
        "semester": payload.get("semester"),
        "session_year": payload.get("session_year"),
        "subjects_results": payload.get("subjects_results", []),
        "total_marks": payload.get("total_marks"),
        "obtained_marks": payload.get("obtained_marks"),
        "percentage": payload.get("percentage"),
        "grade": payload.get("grade"),
        "result": payload.get("result"),
        "issued_on": issued_date,
        "verified": False,
        "marksheet_number": marksheet_number,
        "status": "issued"
    }
    
    result = db.branch_marksheets.insert_one(marksheet_doc)
    return {
        "success": True, 
        "marksheet_id": str(result.inserted_id),
        "marksheet_number": marksheet_number
    }

def list_marksheets(db, student_id):
    """
    List all marksheets for a student
    """
    return list(db.branch_marksheets.find({"student_id": student_id}))

def verify_marksheet(db, marksheet_id, payload):
    """
    Verify a marksheet
    """
    result = db.branch_marksheets.update_one(
        {"_id": ObjectId(marksheet_id)},
        {"$set": {"verified": True, **payload}}
    )
    return {"verified": result.modified_count > 0}

def get_marksheet_by_number(db, marksheet_number):
    """
    Get marksheet by marksheet number for verification
    """
    return db.branch_marksheets.find_one({"marksheet_number": marksheet_number})