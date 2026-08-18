# Wayside Church SMS consent workflow

This is an internal implementation and carrier-submission reference. Public copy must identify the sender as **Wayside Church**.

## Public proof URLs

- Website-assisted and keyword opt-in: `https://wayside.church/text-updates/`
- Homepage keyword CTA: `https://wayside.church/#home-text-us`
- Contact-page keyword CTA: `https://wayside.church/contact/#contact-text-us`
- Privacy Policy: `https://wayside.church/privacy-policy/`
- Terms & Conditions: `https://wayside.church/terms-and-conditions/`

## Consent disclosure

Use this disclosure immediately next to every SMS checkbox. The checkbox must be unchecked by default and separate from any email-newsletter consent.

> I agree to receive recurring text messages from Wayside Church, including service reminders, prayer requests, church announcements, and ministry updates, at the mobile number entered above. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of attending, giving, or receiving ministry care. Privacy Policy: https://wayside.church/privacy-policy/. Terms & Conditions: https://wayside.church/terms-and-conditions/.

## Word-for-word verbal consent script

Adopt this as the actual staff script before submitting it to a carrier. Staff should read it without shortening it, receive a clear yes, and record the consent details described below.

> Would you like to receive text messages from Wayside Church, including service reminders, prayer requests, church announcements, and ministry updates? Message frequency varies, and message and data rates may apply. You can reply STOP at any time to opt out, or HELP for assistance. Consent is not a condition of attending Wayside Church, giving, or receiving ministry care. Do I have your permission to send these text messages to this phone number?

## Detailed opt-in workflow for a carrier submission

End users may join the Wayside Church SMS program through the following opt-in methods. Providing a phone number alone does not enroll a user. Each method requires an additional affirmative action after the sender identity, message purpose, variable frequency, carrier-rate notice, STOP instructions, HELP instructions, Privacy Policy, and Terms & Conditions are presented.

### 1. Website-assisted keyword opt-in

1. The user visits `https://wayside.church/text-updates/`.
2. The page displays Wayside Church as the sender, the verified number `(877) 826-0218`, expected message types, variable frequency, the carrier-rate notice, STOP and HELP instructions, and links to both legal pages.
3. The user enters a name and mobile number and checks an unchecked-by-default SMS consent checkbox.
4. The user selects **Open a START text**. The website opens a message addressed to `(877) 826-0218` with `START` prepared.
5. The user must still send the `START` message. The inbound `START`, sending number, and timestamp are the opt-in record. Merely entering a number or opening the draft does not enroll the user.
6. The first program response identifies Wayside Church and repeats the key HELP and STOP instructions.

### 2. Direct keyword opt-in

1. The user sees the Wayside Church keyword CTA on the homepage, Contact page, Text Updates page, or another Wayside invitation containing the full disclosure.
2. The user sends `START` to `(877) 826-0218` from the mobile number to be enrolled.
3. The inbound `START`, sending number, and timestamp are retained as the opt-in record.
4. The first program response identifies Wayside Church and repeats the key HELP and STOP instructions.

### 3. Written form opt-in

1. A paper or digital form displays the full checkbox disclosure above immediately next to a separate SMS-consent checkbox.
2. The checkbox is optional, unchecked by default, and not bundled with email consent, event registration, giving, attendance, or ministry care.
3. The user enters the mobile number and affirmatively checks the SMS box.
4. Wayside retains the submitted form, disclosure version, source, date and time, and mobile number as the consent record.
5. Staff enroll only numbers with a recorded checked box and send a confirmation identifying Wayside Church with HELP and STOP instructions.

The current Microsoft Form must use the full disclosure above before it is submitted as proof of this method. Until its checkbox copy is updated, submit `https://wayside.church/text-updates/` as the hosted proof for the keyword flow instead.

### 4. Verbal opt-in

1. A trained staff member reads the word-for-word script above before requesting consent.
2. The individual gives an unambiguous yes for the specific mobile number.
3. Staff records the mobile number, date and time, staff member, consent source, exact script version, and the individual's affirmative response.
4. Staff sends a confirmation identifying Wayside Church and repeating variable frequency, carrier-rate, HELP, and STOP information.
5. If the individual does not give a clear yes, staff does not enroll the number.

## Recordkeeping and opt-out handling

- Retain affirmative consent evidence and disclosure versions with the mobile number and timestamp.
- Process `STOP` and equivalent opt-out words immediately and retain the opt-out record.
- Do not send recurring messages after opt-out unless the user completes a new opt-in.
- Respond to `HELP` with Wayside Church identification and a support path.
- Keep public copy sender-specific. Do not transfer consent to another sender or program.
