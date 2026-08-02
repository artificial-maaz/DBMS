/**
 * DELIVERY PROCESS — the counter SOP, exactly as Sir dictated it (2026-08-15).
 *
 * This is the single source of truth for what happens between "I want to buy
 * this" and the customer riding away. It is deliberately DATA, not markup, so
 * the same steps drive the on-screen runbook, the printable wall copy, and any
 * future per-delivery record without three versions drifting apart.
 *
 * Why it exists at all: the handover checklist (#13) records WHAT left with the
 * bike. It does not teach a new branch manager the ORDER of operations, or the
 * two places the process forks (registration yes/no), or the things that must
 * never happen — like handing over a sales tax invoice. Those are the parts a
 * person gets wrong in their first week, and they are expensive to get wrong.
 *
 * Editing rule: keep the wording close to how the counter actually talks. This
 * is read under pressure with a customer waiting, not studied.
 */

export type StepBranch = "always" | "registration_yes" | "registration_no";

export type Step = {
  /** Stable key — used for tick state; never renumber, append instead. */
  key: string;
  title: string;
  /** The detail a new BM needs. Kept to one or two sentences. */
  detail?: string;
  branch: StepBranch;
  /** Shown as a hard rule in red — things that must NOT be done. */
  warning?: boolean;
  /** Only performed if the customer asks. */
  onRequest?: boolean;
};

export type Flow = {
  key: string;
  title: string;
  subtitle: string;
  steps: Step[];
};

/** Common tail shared by both sale flows — identical wording in Sir's spec. */
const CLOSING_STEPS: Step[] = [
  {
    key: "no_tax_invoice",
    title: "Do NOT give a sales tax invoice",
    detail: "Even if the customer asks for one. This is not negotiable at the counter.",
    branch: "always",
    warning: true,
  },
  {
    key: "authority_letter",
    title: "Authority letter (1 month)",
    detail: "Only if the customer asks for it.",
    branch: "always",
    onRequest: true,
  },
  {
    key: "cash_slip",
    title: "Cash-receiving slip on the small notepad",
    detail: "Only if the customer asks for it.",
    branch: "always",
    onRequest: true,
  },
  {
    key: "final_check",
    title: "Final vehicle check",
    detail: "Side mirrors installed · stickers applied · \"applied for\" hanged.",
    branch: "always",
  },
  {
    key: "google_review",
    title: "Ask for the Google review",
    detail: "Do it while the customer is still happy and standing in front of you.",
    branch: "always",
  },
  {
    key: "delivery_photo",
    title: "Delivery photo / video, then see the customer off",
    detail: "With well wishes. The photo is also the proof the bike left in good condition.",
    branch: "always",
  },
];

export const CASH_FLOW: Flow = {
  key: "cash",
  title: "Cash Sale — full payment",
  subtitle: "Walk-in customer paying the full amount today.",
  steps: [
    {
      key: "inform",
      title: "Tell the customer what you need from them",
      detail: "A photocopy of their CNIC. If they want registration, their biometric as well.",
      branch: "always",
    },
    {
      key: "ask_registration",
      title: "Ask: does the customer want vehicle registration?",
      detail: "This answer changes steps 7 and 8 — settle it before taking money.",
      branch: "always",
    },
    {
      key: "verify_payment",
      title: "Verify the FULL payment",
      detail: "Vehicle + registration + accessories. Cash or online — confirm it has actually landed.",
      branch: "always",
    },
    {
      key: "take_cnic",
      title: "Take 1 photocopy of the customer's CNIC and keep it",
      branch: "always",
    },
    {
      key: "fill_original_doc",
      title: "Find the vehicle's original document and fill it",
      branch: "always",
    },
    {
      key: "warranty_card",
      title: "Fill the warranty card completely",
      detail:
        "Keep the dealership copy and the company copy. Send a picture of the COMPANY copy in the group.",
      branch: "always",
    },
    {
      key: "handover_reg_yes",
      title: "REGISTRATION — YES",
      detail:
        "Envelope with the filled warranty card + a PHOTOCOPY of the filled original document. You keep the original. Take the Purchaser Biometric and keep it. Hand over: charger, adapter, 2 keys with 2 remotes, ample charged battery.",
      branch: "registration_yes",
    },
    {
      key: "handover_reg_no",
      title: "REGISTRATION — NO",
      detail:
        "Envelope with the filled warranty card + the FILLED ORIGINAL document (the customer keeps the original). Hand over: charger, adapter, 2 keys with 2 remotes, ample charged battery.",
      branch: "registration_no",
    },
    ...CLOSING_STEPS,
  ],
};

export const INSTALLMENT_FLOW: Flow = {
  key: "installment",
  title: "Installment Sale",
  subtitle: "Customer paying an advance with a guarantor on record.",
  steps: [
    {
      key: "inform",
      title: "Tell the customer what you need from them",
      detail:
        "A guarantor — with the guarantor's CNIC photocopy and contact number. The customer's own CNIC photocopy and a utility bill. If they want registration, their biometric as well.",
      branch: "always",
    },
    {
      key: "ask_registration",
      title: "Ask: does the customer want vehicle registration?",
      branch: "always",
    },
    {
      key: "verify_payment",
      title: "Verify the payment",
      detail:
        "Advance on the vehicle + FULL registration + FULL accessories. Registration and accessories are never on installment.",
      branch: "always",
    },
    {
      key: "take_documents",
      title: "Take and keep the documents",
      detail: "1 photocopy of the customer's CNIC, their utility bill, and 1 photocopy of the guarantor's CNIC.",
      branch: "always",
    },
    {
      key: "fill_original_doc",
      title: "Find the vehicle's original document and fill it",
      branch: "always",
    },
    {
      key: "warranty_card",
      title: "Fill the warranty card completely",
      detail:
        "Keep the dealership copy and the company copy. Send a picture of the COMPANY copy in the group.",
      branch: "always",
    },
    {
      key: "handover_reg_yes",
      title: "REGISTRATION — YES",
      detail:
        "Envelope with the filled warranty card + a PHOTOCOPY of the filled original document. You keep the original. Take the Purchaser Biometric and keep it. Hand over: charger, adapter, 2 keys with 2 remotes, ample charged battery.",
      branch: "registration_yes",
    },
    {
      key: "handover_reg_no",
      title: "REGISTRATION — NO",
      detail:
        "Envelope with the filled warranty card + a PHOTOCOPY of the filled original document. Hand over: charger, adapter, 1 key with 1 remote, ample charged battery.",
      branch: "registration_no",
    },
    {
      key: "retain_security",
      title: "KEEP as security until the case is settled",
      detail:
        "The original document, the CNIC copies, the utility bill, and 1 key with 1 remote. This is the difference between an installment sale and a cash sale — do not skip it.",
      branch: "always",
      warning: true,
    },
    ...CLOSING_STEPS,
  ],
};

/** Shorter counter procedures — same runbook treatment, fewer steps. */
export const SPARE_PART_FLOW: Flow = {
  key: "spare_part",
  title: "Spare Part — buy or order",
  subtitle: "Customer wants a part, in stock or to be ordered.",
  steps: [
    {
      key: "payment_first",
      title: "Take the FULL payment in advance and verify it",
      detail: "Before the order goes anywhere. No part is ordered on a promise.",
      branch: "always",
      warning: true,
    },
    {
      key: "note_specs",
      title: "Note the exact specification",
      detail: "Vehicle model name · the specific part · colour · quantity. Vague orders arrive wrong.",
      branch: "always",
    },
    {
      key: "send_group",
      title: "Send the order to the Bahria official group",
      detail: "Use the Parts Purchase Demand format — Formats & Messages will build it for you.",
      branch: "always",
    },
    {
      key: "record_and_followup",
      title: "Record the order, and contact the customer when it arrives",
      detail: "For installation. An ordered part nobody follows up on becomes a complaint.",
      branch: "always",
    },
  ],
};

export const BOOKING_FLOW: Flow = {
  key: "booking",
  title: "Advance Booking",
  subtitle: "Customer booking a vehicle that is not available today.",
  steps: [
    {
      key: "note_details",
      title: "Note name, contact, address and preferred colour",
      detail: "In date sequence in the bookings file, against that specific vehicle.",
      branch: "always",
    },
    {
      key: "take_token",
      title: "Take and verify the booking amount, then follow up",
      detail: "Contact the customer as soon as the vehicle is available.",
      branch: "always",
    },
  ],
};

export const INSTALLMENT_RECEIPT_FLOW: Flow = {
  key: "installment_receipt",
  title: "Receiving an Installment",
  subtitle: "Existing customer paying a monthly instalment.",
  steps: [
    {
      key: "open_file",
      title: "Open the customer's file and enter the amount received",
      detail: "Then give the customer a receiving slip. Record it in the system the same day.",
      branch: "always",
    },
  ],
};

export const ALL_FLOWS: Flow[] = [
  CASH_FLOW,
  INSTALLMENT_FLOW,
  SPARE_PART_FLOW,
  BOOKING_FLOW,
  INSTALLMENT_RECEIPT_FLOW,
];

/** Steps that apply given the registration answer. */
export function visibleSteps(flow: Flow, registration: boolean | null): Step[] {
  return flow.steps.filter((s) => {
    if (s.branch === "always") return true;
    if (registration === null) return true; // show both until the question is answered
    return registration ? s.branch === "registration_yes" : s.branch === "registration_no";
  });
}
