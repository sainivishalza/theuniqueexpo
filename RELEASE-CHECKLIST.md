# Release checklist

Every change goes through CI before it is merged. CI already checks, on every pull request:

- types, build, the site's JavaScript budget (`scripts/bundle-budget.json`);
- the whole end-to-end suite in English, Russian and Chinese at phone width (375 px), including accessibility rules (axe, WCAG 2.1 A/AA);
- the **phone sweep** (`tests/phone-sweep.test.js`): the main public pages, the buyer area and the admin screens on emulated iPhone SE, Pixel 5 and a 320 px phone, checking that nothing scrolls sideways, accessibility passes and every standalone tap target is at least 24 x 24 px (WCAG 2.2).

A machine cannot judge how the site *feels* on a real phone. Do this five-minute check on real devices **before a release that changes screens people use** (not for a dependency bump or a change nobody sees).

## On two real phones (an iPhone in Safari and an Android phone in Chrome)

Use the preview environment or the live site after the deploy, on mobile data (not Wi-Fi) at least once.

1. **Home and exhibitions list**: scroll the whole page. Nothing should jump while it loads, pictures should appear quickly, nothing should be cut off at the edges.
2. **Calendar view** on the exhibitions page: tap a day, tap next month; the days are easy to hit.
3. **Compare**: tick two exhibitions, tap Compare; the table reads without zooming.
4. **Help box** (round button at the bottom right): opens, the keyboard does not hide the search box, a WhatsApp hand-off opens WhatsApp.
5. **Sign in** and **register**: the keyboard types the right kind of input (e-mail, phone), the password field can be shown, the form can be submitted with the on-screen keyboard open.
6. **Register for an exhibition** as a buyer: upload a document photo taken with the camera (a large photo must upload and be shrunk).
7. **Wallet**: balance, "What can I do?", the QR code is large enough to scan from another phone.
8. **E-ticket**: open it, the QR code scans from another phone at arm's length.
9. **Admin on a phone** (only when admin screens changed): approve a registration, check a ticket at the door with the camera.
10. Turn the phone sideways once on the pages you changed.
11. Switch the language to Russian and to Chinese on the page you changed: no text cut off, no raw message keys such as `adminX.title`.

## After the deploy

Hostinger builds a few minutes after the deploy job finishes; a page that answers 404 until then is normal.

- Open the home page, `/en/exhibitions` and one admin API (it must answer 401 when signed out, not 404 or 500).
- Look at **Admin → Errors** a few hours later: a new kind of error right after a release points at the release.
- Look at **Admin → Page speed** after a day: a measure that turned from healthy to "needs work" points at the release.

## If something is wrong

Run the **Deploy** workflow again with the previous good commit as `ref` (Actions → Deploy to Hostinger → Run workflow). Database changes are written to be repeatable and only add things, so going back to earlier code is safe.
