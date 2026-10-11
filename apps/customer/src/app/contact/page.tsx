"use client";

import { FormEvent, useState } from "react";
import { LegalPageFrame } from "@/components/legal/LegalPageFrame";
import { type AppLanguage } from "@/lib/language";
import styles from "./contact.module.css";

const CONTACT_PHONE = "+972 59-000-0000";
const CONTACT_EMAIL = "customer@bamora.com";
const CONTACT_ADDRESS_AR = "شارع النجاح 15، الطابق 3، القدس";
const CONTACT_ADDRESS_HE = "רחוב א-נג'אח 15, קומה 3, ירושלים";

function t(language: AppLanguage, values: { ar: string; he: string; en?: string }) {
  if (language === "he") {
    return values.he;
  }

  if (language === "en") {
    return values.en ?? values.ar;
  }

  return values.ar;
}

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <LegalPageFrame
      activeHref="/contact"
      title={{ ar: "تواصل معنا", he: "צור קשר", en: "Contact us" }}
      intro={{
        ar: "يمكنك التواصل معنا لأي استفسار حول الطلبات أو الخدمة. البيانات المعروضة أدناه مستخرجة من بيانات المشروع الحالية.",
        he: "ניתן ליצור איתנו קשר לכל שאלה לגבי הזמנות או שירות. הפרטים המוצגים מבוססים על נתוני הפרויקט הקיימים.",
        en: "Reach out for any order or service inquiry. The contact details below come from the current project data.",
      }}
      renderExtra={(language) => (
        <div className={styles.stack}>
          <section className={styles.infoCard}>
            <h2 className={styles.infoTitle}>{t(language, { ar: "بيانات BAMORA", he: "פרטי BAMORA", en: "BAMORA details" })}</h2>
            <ul className={styles.infoList}>
              <li>
                <span className={styles.infoLabel}>{t(language, { ar: "اسم العمل", he: "שם העסק", en: "Business name" })}</span>
                <span className={styles.infoValue}>BAMORA</span>
              </li>
              <li>
                <span className={styles.infoLabel}>{t(language, { ar: "رقم الهاتف", he: "טלפון", en: "Phone" })}</span>
                <a className={styles.infoValue} href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}>{CONTACT_PHONE}</a>
              </li>
              <li>
                <span className={styles.infoLabel}>{t(language, { ar: "WhatsApp", he: "WhatsApp", en: "WhatsApp" })}</span>
                <a className={styles.infoValue} href="https://wa.me/972590000000" target="_blank" rel="noreferrer">
                  {CONTACT_PHONE}
                </a>
              </li>
              <li>
                <span className={styles.infoLabel}>{t(language, { ar: "البريد الإلكتروني", he: "אימייל", en: "Email" })}</span>
                <a className={styles.infoValue} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </li>
              <li>
                <span className={styles.infoLabel}>{t(language, { ar: "العنوان", he: "כתובת", en: "Address" })}</span>
                <span className={styles.infoValue}>{language === "he" ? CONTACT_ADDRESS_HE : CONTACT_ADDRESS_AR}</span>
              </li>
            </ul>
          </section>

          <form className={styles.form} onSubmit={handleSubmit}>
            <h3>{t(language, { ar: "نموذج التواصل", he: "טופס יצירת קשר", en: "Contact form" })}</h3>

            <div className={styles.field}>
              <label htmlFor="contact-name">{t(language, { ar: "الاسم", he: "שם", en: "Name" })}</label>
              <input id="contact-name" name="name" type="text" required />
            </div>

            <div className={styles.field}>
              <label htmlFor="contact-email">{t(language, { ar: "البريد الإلكتروني", he: "אימייל", en: "Email" })}</label>
              <input id="contact-email" name="email" type="email" required />
            </div>

            <div className={styles.field}>
              <label htmlFor="contact-phone">{t(language, { ar: "رقم الهاتف", he: "טלפון", en: "Phone" })}</label>
              <input id="contact-phone" name="phone" type="tel" required />
            </div>

            <div className={styles.field}>
              <label htmlFor="contact-message">{t(language, { ar: "الرسالة", he: "הודעה", en: "Message" })}</label>
              <textarea id="contact-message" name="message" required />
            </div>

            <button className={styles.submit} type="submit">
              {t(language, { ar: "إرسال", he: "שליחה", en: "Send" })}
            </button>

            {sent ? (
              <p className={styles.notice}>
                {t(language, {
                  ar: "تم استلام رسالتك مبدئيًا. سيتم الرد عليك قريبًا.",
                  he: "ההודעה התקבלה בהצלחה. נחזור אליך בהקדם.",
                  en: "Your message was received successfully. We will get back to you soon.",
                })}
              </p>
            ) : null}
          </form>
        </div>
      )}
    />
  );
}
