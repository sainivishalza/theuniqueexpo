// The one place that decides the order of the text columns of a buyer profile: the table on
// the Buyer Profiles screen and the Excel download both read it, so they always match.
// Who they are (passport, nationality, phone), then the company, e-mail, WeChat and
// turnover, then everything else.
export const TEXT_COLUMN_ORDER = [
  "passportNumber",
  "nationality",
  "phoneNumber",
  "companyName",
  "contactEmail",
  "wechatId",
  "annualTurnover",
  "contactPerson",
  "registrationCode",
  "sourceExhibitions",
  "departureCity",
  "attendanceDay",
  "passportName",
  "overseasCompanyAddress",
  "companyField",
  "jobTitle",
  "dateOfBirth",
  "visaType",
  "visaExpireDate",
  "meetingOrVisiting",
  "gender",
  "purchaseIntention",
  "otherPurchaseIntention",
  "rewardPoints",
] as const;
