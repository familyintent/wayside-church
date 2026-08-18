from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.acroform import AcroForm
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "documents" / "wayside-church-sms-written-consent-form.pdf"
LOGO = ROOT / "public" / "images" / "wayside-logo-mark-white.png"

NAVY = HexColor("#18243B")
GREEN = HexColor("#506B4E")
INK = HexColor("#27231F")
MUTED = HexColor("#5D5A55")
LINE = HexColor("#C9C4BA")
SOFT = HexColor("#F3F0E8")


def wrap_text(c, text, x, y, width, font="Helvetica", size=9.2, leading=13):
    words = text.split()
    lines = []
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if c.stringWidth(candidate, font, size) <= width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)

    c.setFont(font, size)
    c.setFillColor(INK)
    for current in lines:
        c.drawString(x, y, current)
        y -= leading
    return y


def add_text_field(form: AcroForm, name, tooltip, x, y, width, height=22):
    form.textfield(
        name=name,
        tooltip=tooltip,
        x=x,
        y=y,
        width=width,
        height=height,
        borderStyle="underlined",
        borderWidth=1,
        borderColor=LINE,
        fillColor=white,
        textColor=INK,
        fontName="Helvetica",
        fontSize=10,
        forceBorder=True,
    )


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=letter, pageCompression=1)
    c.setTitle("Wayside Church Written SMS Consent Form")
    c.setAuthor("Wayside Church")
    c.setSubject("Written consent for Wayside Church text updates")
    form = c.acroForm

    width, height = letter
    margin = 48

    c.setFillColor(NAVY)
    c.rect(0, height - 108, width, 108, fill=1, stroke=0)
    if LOGO.exists():
        c.drawImage(str(LOGO), margin, height - 94, width=30, height=45, preserveAspectRatio=True, mask="auto")
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(88, height - 57, "WAYSIDE CHURCH")
    c.setFont("Times-Bold", 24)
    c.drawString(88, height - 83, "Written SMS Consent Form")
    c.setFont("Helvetica", 9)
    c.drawRightString(width - margin, height - 59, "Program number")
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(width - margin, height - 77, "(877) 826-0218")

    y = height - 139
    c.setFillColor(INK)
    c.setFont("Helvetica", 9.5)
    y = wrap_text(
        c,
        "Use this form only when a person chooses written consent. Completing it is optional and is not a condition of attending, giving, registering for an event, or receiving ministry care.",
        margin,
        y,
        width - 2 * margin,
        size=9.5,
        leading=13,
    ) - 10

    c.setFont("Helvetica-Bold", 9)
    c.drawString(margin, y, "Full name")
    c.drawString(330, y, "Mobile phone")
    add_text_field(form, "full_name", "Full name", margin, y - 28, 246)
    add_text_field(form, "mobile_phone", "Mobile phone", 330, y - 28, 234)
    y -= 58

    c.setFillColor(SOFT)
    c.roundRect(margin, y - 120, width - 2 * margin, 120, 6, fill=1, stroke=0)
    form.checkbox(
        name="sms_consent",
        tooltip="I agree to receive Wayside Church text messages",
        x=margin + 12,
        y=y - 31,
        size=16,
        checked=False,
        buttonStyle="check",
        borderWidth=1,
        borderColor=GREEN,
        fillColor=white,
        textColor=GREEN,
        forceBorder=True,
    )
    consent = (
        "I agree to receive recurring text messages from Wayside Church, including service reminders, prayer requests, "
        "church announcements, and ministry updates, at the mobile number entered above. Message frequency varies. "
        "Msg & data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of attending, "
        "giving, or receiving ministry care."
    )
    wrap_text(c, consent, margin + 42, y - 18, width - 2 * margin - 54, size=9.1, leading=12.5)
    c.setFont("Helvetica", 8.2)
    c.setFillColor(MUTED)
    c.drawString(margin + 42, y - 103, "Privacy Policy: wayside.church/privacy-policy/")
    c.drawRightString(width - margin - 12, y - 103, "Terms: wayside.church/terms-and-conditions/")
    c.linkURL("https://wayside.church/privacy-policy/", (margin + 40, y - 108, 270, y - 96), relative=0)
    c.linkURL("https://wayside.church/terms-and-conditions/", (330, y - 108, width - margin, y - 96), relative=0)
    y -= 151

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(margin, y, "Signature or typed name")
    c.drawString(392, y, "Date")
    add_text_field(form, "signature_or_typed_name", "Signature or typed name", margin, y - 28, 320)
    add_text_field(form, "consent_date", "Consent date", 392, y - 28, 172)
    y -= 63

    c.setFont("Helvetica-Bold", 9)
    c.drawString(margin, y, "Received by Wayside staff member")
    c.drawString(392, y, "Time")
    add_text_field(form, "received_by_staff", "Received by Wayside staff member", margin, y - 28, 320)
    add_text_field(form, "consent_time", "Consent record time", 392, y - 28, 172)
    y -= 65

    c.setStrokeColor(LINE)
    c.line(margin, y, width - margin, y)
    y -= 23
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(GREEN)
    c.drawString(margin, y, "Staff recordkeeping")
    y -= 17
    y = wrap_text(
        c,
        "Retain the completed form, disclosure version, date and time, mobile number, and receiving staff member. After enrollment, send an immediate confirmation identifying Wayside Church with frequency, rates, HELP, and STOP instructions.",
        margin,
        y,
        width - 2 * margin,
        size=8.7,
        leading=12,
    )

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(margin, 50, "Form version: August 18, 2026")
    c.drawRightString(width - margin, 50, "Return completed form to Wayside Church staff")
    c.save()


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT)
